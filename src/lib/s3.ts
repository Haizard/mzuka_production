"use server";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import type { Readable } from "stream";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// ── Upload ────────────────────────────────────────────────────────────────────

/** Returns a signed PUT URL so the browser can upload directly to S3. */
export async function generateS3UploadUrl(
  filename: string,
  filetype: string,
  mediaKind: "PHOTO" | "VIDEO"
) {
  try {
    const bucket = process.env.AWS_S3_BUCKET_PRIVATE_ORIGINALS;
    if (!bucket) throw new Error("S3 originals bucket not configured");

    const key = `originals/${mediaKind.toLowerCase()}/${nanoid()}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: filetype,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return { success: true, uploadUrl: url, s3Key: key };
  } catch (error) {
    console.error("Failed to generate S3 upload URL:", error);
    return { success: false, error: "Failed to generate upload URL", uploadUrl: undefined, s3Key: undefined };
  }
}

/**
 * Downloads an object from S3 and returns its raw bytes as a Buffer.
 * Used server-side to pull the original so we can watermark it.
 */
export async function downloadS3Object(
  bucket: string,
  key: string
): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3Client.send(command);

  if (!response.Body) throw new Error(`Empty body for s3://${bucket}/${key}`);

  // Body is a Readable stream in Node
  const stream = response.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

/**
 * Uploads a buffer (e.g. watermarked preview JPEG) to the previews bucket.
 * Returns the S3 key it was stored under.
 */
export async function uploadPreviewToS3(
  buffer: Buffer,
  originalKey: string
): Promise<string> {
  const bucket = process.env.AWS_S3_BUCKET_PRIVATE_PREVIEWS;
  if (!bucket) throw new Error("S3 previews bucket not configured");

  // Derive a parallel key under previews/
  const previewKey = `previews/${originalKey.replace(/^originals\//, "")}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: previewKey,
    Body: buffer,
    ContentType: "image/jpeg",
  });

  await s3Client.send(command);
  return previewKey;
}

// ── Signed read URLs ──────────────────────────────────────────────────────────

/** Signed URL for full-quality original download (post-payment). */
export async function generateS3DownloadUrl(
  s3Key: string,
  expiresIn: number = 3600
) {
  try {
    const bucket = process.env.AWS_S3_BUCKET_PRIVATE_ORIGINALS;
    if (!bucket) throw new Error("S3 originals bucket not configured");

    const command = new GetObjectCommand({ Bucket: bucket, Key: s3Key });
    const url = await getSignedUrl(s3Client, command, { expiresIn });

    return { success: true, downloadUrl: url };
  } catch (error) {
    console.error("Failed to generate S3 download URL:", error);
    return { success: false, error: "Failed to generate download URL", downloadUrl: undefined };
  }
}

/** Signed URL for watermarked preview (pre-payment). */
export async function generateS3PreviewUrl(
  s3Key: string,
  expiresIn: number = 7200
) {
  try {
    const bucket = process.env.AWS_S3_BUCKET_PRIVATE_PREVIEWS;
    if (!bucket) throw new Error("Preview bucket not configured");

    const command = new GetObjectCommand({ Bucket: bucket, Key: s3Key });
    const url = await getSignedUrl(s3Client, command, { expiresIn });

    return { success: true, previewUrl: url };
  } catch (error) {
    console.error("Failed to generate S3 preview URL:", error);
    return { success: false, error: "Failed to generate preview URL", previewUrl: undefined };
  }
}
