/**
 * GET /api/media/{bookingId}/download?key=FILE_KEY
 *
 * Generates a 1-hour presigned S3 URL for secure file download.
 * Rules:
 *   - Verifies the user owns the booking (or is admin)
 *   - Clients: raw/edited only if PAID — otherwise only previews
 *   - Admins: all folders
 *   - Validates the key belongs to this bookingId (no path traversal)
 *   - Returns { url, expiresAt } — never the actual S3 URL in metadata
 *
 * Response:
 *   { url: "https://s3.amazonaws.com/...?X-Amz-...", expiresAt: "ISO8601" }
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generatePresignedDownloadUrl } from "@/lib/s3";

const EXPIRY_SECONDS = 3600; // 1 hour

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const user = await getCurrentUser();
    if (!user || user.approvalStatus !== "APPROVED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await params;
    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!bookingId || !key) {
      return NextResponse.json({ error: "bookingId and key are required" }, { status: 400 });
    }

    // ── Security: validate key prefix matches bookingId ───────────────────────
    // Prevents a client from requesting another booking's file
    const expectedPrefix = `bookings/${bookingId}/`;
    if (!key.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { error: "Key does not belong to this booking" },
        { status: 403 }
      );
    }

    // Extract folder from key: bookings/{bookingId}/{folder}/filename
    const keyParts = key.split("/");
    if (keyParts.length < 4) {
      return NextResponse.json({ error: "Invalid key format" }, { status: 400 });
    }
    const folder = keyParts[2]; // "raw" | "edited" | "previews"

    // ── Validate booking + ownership ─────────────────────────────────────────
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, clientId: true, paymentStatus: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const isAdmin = ["FOUNDER", "ADMIN", "STAFF"].includes(user.role);

    if (!isAdmin && booking.clientId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── Enforce payment gate for clients ──────────────────────────────────────
    if (!isAdmin) {
      const isPaid = booking.paymentStatus === "PAID";

      if (!isPaid && (folder === "raw" || folder === "edited")) {
        return NextResponse.json(
          { error: "Payment required to download original files" },
          { status: 402 }
        );
      }
    }

    // ── Generate presigned URL ────────────────────────────────────────────────
    const filename = keyParts.slice(3).join("/");
    const disposition = `attachment; filename="${encodeURIComponent(filename)}"`;

    const result = await generatePresignedDownloadUrl(key, EXPIRY_SECONDS, disposition);

    if (!result.success || !result.url) {
      return NextResponse.json({ error: result.error ?? "Failed to generate download URL" }, { status: 500 });
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    await prisma.accessLog.create({
      data: {
        galleryId: await getGalleryId(bookingId),
        userId:    user.id,
        ipAddress: req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: req.headers.get("user-agent") ?? null,
        action:    folder === "previews" ? "PREVIEW_ACCESS" : "FILE_DOWNLOADED",
      },
    }).catch(() => {}); // non-blocking, don't fail the download

    const expiresAt = new Date(Date.now() + EXPIRY_SECONDS * 1000).toISOString();

    return NextResponse.json({
      url:       result.url,
      key,
      filename,
      folder,
      expiresAt,
      expiresIn: EXPIRY_SECONDS,
    });

  } catch (error) {
    console.error("[api/media/download] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function getGalleryId(bookingId: string): Promise<string> {
  const gallery = await prisma.gallery.findUnique({
    where: { bookingId },
    select: { id: true },
  });
  return gallery?.id ?? "unknown";
}
