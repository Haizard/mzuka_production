import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAdmin } from "@/lib/auth";

// POST /api/legal/upload-url — generate a presigned URL for uploading a legal document
export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin();
    if (!["FOUNDER", "ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { fileName, mimeType } = body;

    if (!fileName || !mimeType) {
      return NextResponse.json({ error: "fileName and mimeType required" }, { status: 400 });
    }

    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucket = process.env.AWS_S3_BUCKET;

    if (!region || !accessKeyId || !secretAccessKey || !bucket) {
      return NextResponse.json({ error: "S3 not configured" }, { status: 500 });
    }

    const s3 = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

    // Build S3 key: legal/{timestamp}-{sanitized-filename}
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `legal/${Date.now()}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    return NextResponse.json({ success: true, uploadUrl, s3Key: key });
  } catch (err) {
    console.error("[legal/upload-url]", err);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}
