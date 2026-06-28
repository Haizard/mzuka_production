/**
 * POST /api/media/upload
 * Admin-only — generates presigned PUT URLs so the browser uploads directly
 * to S3 without passing through the server (avoids 4MB Vercel body limit).
 *
 * Body (JSON):
 *   {
 *     bookingId: string
 *     files: Array<{ filename: string; mimeType: string; sizeBytes?: number }>
 *   }
 *
 * Returns:
 *   { uploads: Array<{ filename, s3Key, uploadUrl, kind }> }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateS3UploadUrl, validateMediaFile } from "@/lib/s3";
import { nanoid } from "nanoid";

interface FileInput {
  filename: string;
  mimeType: string;
  sizeBytes?: number;
}

interface UploadBody {
  bookingId: string;
  files: FileInput[];
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth: admin only ──────────────────────────────────────────────────────
    let admin;
    try {
      admin = await requireAdmin();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: UploadBody;
    try {
      body = await req.json() as UploadBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { bookingId, files } = body;

    if (!bookingId || typeof bookingId !== "string") {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: "files array is required and must not be empty" }, { status: 400 });
    }
    if (files.length > 50) {
      return NextResponse.json({ error: "Max 50 files per request" }, { status: 400 });
    }

    // ── Validate booking exists ───────────────────────────────────────────────
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, title: true, clientId: true, gallery: { select: { id: true } } },
    });

    if (!booking) {
      return NextResponse.json({ error: `Booking ${bookingId} not found` }, { status: 404 });
    }

    // ── Generate upload URLs ──────────────────────────────────────────────────
    const uploads = [];
    const errors = [];

    for (const file of files) {
      const { filename, mimeType, sizeBytes } = file;

      if (!filename || !mimeType) {
        errors.push({ filename: filename ?? "unknown", error: "filename and mimeType are required" });
        continue;
      }

      // Validate file type and size
      const validation = validateMediaFile(mimeType, filename, sizeBytes);
      if (!validation.valid) {
        errors.push({ filename, error: validation.error });
        continue;
      }

      // Deduplicate: add nanoid prefix to filename to avoid collisions
      const uniqueFilename = `${nanoid(8)}_${filename}`;

      const result = await generateS3UploadUrl(bookingId, uniqueFilename, mimeType, "raw", sizeBytes);

      if (!result.success || !result.uploadUrl || !result.s3Key) {
        errors.push({ filename, error: result.error ?? "Failed to generate upload URL" });
        continue;
      }

      uploads.push({
        filename,
        uniqueFilename,
        s3Key:     result.s3Key,
        uploadUrl: result.uploadUrl,
        kind:      validation.kind,
        mimeType,
        sizeBytes: sizeBytes ?? null,
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId:  admin.id,
        action:   "MEDIA_UPLOADED",
        entity:   "Booking",
        entityId: bookingId,
        metadata: {
          fileCount: uploads.length,
          filenames: uploads.map((u) => u.filename),
          errors:    errors.length > 0 ? errors : undefined,
        },
      },
    });

    return NextResponse.json({
      bookingId,
      galleryId: booking.gallery?.id ?? null,
      uploads,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error("[api/media/upload] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
