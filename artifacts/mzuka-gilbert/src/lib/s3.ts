import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Readable } from "stream";

// ── S3 client singleton ───────────────────────────────────────────────────────

function getS3Client() {
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.");
  }

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

function getBucket() {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET not configured.");
  return bucket;
}

// ── Key builders — booking-based folder structure ─────────────────────────────
// s3://mzukapruduction/bookings/{bookingId}/raw/        ← originals
// s3://mzukapruduction/bookings/{bookingId}/edited/     ← post-processed
// s3://mzukapruduction/bookings/{bookingId}/previews/   ← watermarked JPEGs

export type MediaFolder = "raw" | "edited" | "previews";

export function buildS3Key(
  bookingId: string,
  folder: MediaFolder,
  filename: string
): string {
  // Sanitise filename — no path traversal, no spaces
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `bookings/${bookingId}/${folder}/${safe}`;
}

/** Derive preview key from raw key */
export function rawKeyToPreviewKey(rawKey: string): string {
  return rawKey.replace(/^bookings\/([^/]+)\/raw\//, "bookings/$1/previews/");
}

// ── Allowed types ─────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp",
]);
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4", "video/quicktime", "video/x-matroska",
]);
const ALLOWED_EXTENSIONS = new Set([
  "jpg", "jpeg", "png", "webp", "mp4", "mov", "mkv",
]);

const MAX_IMAGE_BYTES = 100 * 1024 * 1024;  // 100 MB
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;  // 500 MB (configurable)

export interface FileValidation {
  valid: boolean;
  error?: string;
  kind?: "PHOTO" | "VIDEO";
}

export function validateMediaFile(
  mimeType: string,
  filename: string,
  sizeBytes?: number
): FileValidation {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File extension .${ext} not allowed. Allowed: jpg, jpeg, png, webp, mp4, mov, mkv` };
  }

  if (ALLOWED_IMAGE_TYPES.has(mimeType)) {
    if (sizeBytes && sizeBytes > MAX_IMAGE_BYTES) {
      return { valid: false, error: `Image too large. Max ${MAX_IMAGE_BYTES / 1024 / 1024}MB` };
    }
    return { valid: true, kind: "PHOTO" };
  }

  if (ALLOWED_VIDEO_TYPES.has(mimeType)) {
    if (sizeBytes && sizeBytes > MAX_VIDEO_BYTES) {
      return { valid: false, error: `Video too large. Max ${MAX_VIDEO_BYTES / 1024 / 1024}MB` };
    }
    return { valid: true, kind: "VIDEO" };
  }

  return { valid: false, error: `MIME type ${mimeType} not allowed` };
}

// ── Presigned upload URL (browser → S3 directly) ─────────────────────────────

export interface UploadUrlResult {
  success: boolean;
  uploadUrl?: string;
  s3Key?: string;
  error?: string;
}

export async function generateS3UploadUrl(
  bookingId: string,
  filename: string,
  mimeType: string,
  folder: MediaFolder = "raw",
  sizeBytes?: number
): Promise<UploadUrlResult> {
  try {
    const validation = validateMediaFile(mimeType, filename, sizeBytes);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const s3 = getS3Client();
    const bucket = getBucket();
    const key = buildS3Key(bookingId, folder, filename);

    const command = new PutObjectCommand({
      Bucket:      bucket,
      Key:         key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return { success: true, uploadUrl, s3Key: key };
  } catch (error) {
    console.error("[s3] generateS3UploadUrl error:", error);
    return { success: false, error: "Failed to generate upload URL" };
  }
}

// ── Presigned download URL (secure, time-limited) ────────────────────────────

export interface DownloadUrlResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function generatePresignedDownloadUrl(
  s3Key: string,
  expiresIn = 3600,
  disposition?: string
): Promise<DownloadUrlResult> {
  try {
    const s3 = getS3Client();
    const bucket = getBucket();

    const command = new GetObjectCommand({
      Bucket:                     bucket,
      Key:                        s3Key,
      ResponseContentDisposition: disposition,
    });

    const url = await getSignedUrl(s3, command, { expiresIn });
    return { success: true, url };
  } catch (error) {
    console.error("[s3] generatePresignedDownloadUrl error:", error);
    return { success: false, error: "Failed to generate download URL" };
  }
}

/** Convenience wrappers */
export async function generateS3DownloadUrl(s3Key: string, expiresIn = 3600) {
  const result = await generatePresignedDownloadUrl(s3Key, expiresIn);
  return { success: result.success, downloadUrl: result.url, error: result.error };
}

export async function generateS3PreviewUrl(s3Key: string, expiresIn = 7200) {
  const result = await generatePresignedDownloadUrl(s3Key, expiresIn);
  return { success: result.success, previewUrl: result.url, error: result.error };
}

// ── List files in a booking folder ───────────────────────────────────────────

export interface S3ObjectMeta {
  key: string;
  size: number;
  lastModified: Date;
  folder: MediaFolder;
  filename: string;
}

export async function listBookingFiles(
  bookingId: string,
  folder?: MediaFolder
): Promise<S3ObjectMeta[]> {
  const s3 = getS3Client();
  const bucket = getBucket();
  const prefix = folder
    ? `bookings/${bookingId}/${folder}/`
    : `bookings/${bookingId}/`;

  const results: S3ObjectMeta[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket:            bucket,
      Prefix:            prefix,
      ContinuationToken: continuationToken,
      MaxKeys:           1000,
    });

    const response = await s3.send(command);

    for (const obj of response.Contents ?? []) {
      if (!obj.Key || obj.Key.endsWith("/")) continue; // skip folders
      const parts = obj.Key.split("/");
      const detectedFolder = parts[2] as MediaFolder;
      const filename = parts.slice(3).join("/");

      results.push({
        key:          obj.Key,
        size:         obj.Size ?? 0,
        lastModified: obj.LastModified ?? new Date(),
        folder:       detectedFolder,
        filename,
      });
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return results;
}

// ── Server-side download (for watermarking) ───────────────────────────────────

export async function downloadS3Object(
  bucketOrKey: string,
  keyOrUndefined?: string
): Promise<Buffer> {
  const s3 = getS3Client();

  // Support both (bucket, key) and (key) signatures for backward compatibility
  let bucket: string;
  let key: string;

  if (keyOrUndefined !== undefined) {
    bucket = bucketOrKey;
    key = keyOrUndefined;
  } else {
    bucket = getBucket();
    key = bucketOrKey;
  }

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);

  if (!response.Body) throw new Error(`Empty body for s3://${bucket}/${key}`);

  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

// ── Upload buffer (for watermarked preview) ───────────────────────────────────

export async function uploadBufferToS3(
  key: string,
  buffer: Buffer,
  contentType = "image/jpeg"
): Promise<void> {
  const s3 = getS3Client();
  const bucket = getBucket();

  await s3.send(new PutObjectCommand({
    Bucket:      bucket,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
  }));
}

/** Backward-compat wrapper used by watermark pipeline */
export async function uploadPreviewToS3(
  buffer: Buffer,
  rawKey: string
): Promise<string> {
  const previewKey = rawKeyToPreviewKey(rawKey);
  await uploadBufferToS3(previewKey, buffer, "image/jpeg");
  return previewKey;
}

// ── Object existence check ────────────────────────────────────────────────────

export async function s3ObjectExists(key: string): Promise<boolean> {
  try {
    const s3 = getS3Client();
    const bucket = getBucket();
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// ── Delete object ─────────────────────────────────────────────────────────────

export async function deleteS3Object(key: string): Promise<void> {
  const s3 = getS3Client();
  const bucket = getBucket();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
