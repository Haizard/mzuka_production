"use server";

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function generateS3UploadUrl(
  filename: string,
  filetype: string,
  mediaKind: "PHOTO" | "VIDEO"
) {
  try {
    const bucket =
      mediaKind === "PHOTO"
        ? process.env.AWS_S3_BUCKET_PRIVATE_ORIGINALS
        : process.env.AWS_S3_BUCKET_PRIVATE_ORIGINALS;

    if (!bucket) {
      throw new Error("S3 bucket not configured");
    }

    const key = `originals/${mediaKind.toLowerCase()}/${nanoid()}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: filetype,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
      success: true,
      uploadUrl: url,
      s3Key: key,
    };
  } catch (error) {
    console.error("Failed to generate S3 upload URL:", error);
    return {
      success: false,
      error: "Failed to generate upload URL",
    };
  }
}

export async function generateS3DownloadUrl(
  s3Key: string,
  expiresIn: number = 3600
) {
  try {
    const bucket = process.env.AWS_S3_BUCKET_PRIVATE_ORIGINALS;

    if (!bucket) {
      throw new Error("S3 bucket not configured");
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    return {
      success: true,
      downloadUrl: url,
    };
  } catch (error) {
    console.error("Failed to generate S3 download URL:", error);
    return {
      success: false,
      error: "Failed to generate download URL",
    };
  }
}

export async function generateS3PreviewUrl(
  s3Key: string,
  expiresIn: number = 7200
) {
  try {
    const bucket = process.env.AWS_S3_BUCKET_PRIVATE_PREVIEWS;

    if (!bucket) {
      throw new Error("Preview bucket not configured");
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    return {
      success: true,
      previewUrl: url,
    };
  } catch (error) {
    console.error("Failed to generate preview URL:", error);
    return {
      success: false,
      error: "Failed to generate preview URL",
    };
  }
}
