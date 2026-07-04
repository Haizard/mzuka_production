/**
 * GET /api/media/{bookingId}
 * Returns the list of S3 object keys for a booking.
 * Clients only see their own booking. Admins see all.
 * NEVER returns public URLs — only keys.
 *
 * Response:
 *   {
 *     bookingId: string,
 *     files: Array<{ key, filename, folder, size, lastModified, kind }>
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listBookingFiles } from "@/lib/s3";

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

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
    }

    // ── Validate booking + ownership ─────────────────────────────────────────
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, clientId: true, title: true, paymentStatus: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const isAdmin = ["FOUNDER", "ADMIN", "STAFF"].includes(user.role);

    // Clients can only access their own booking
    if (!isAdmin && booking.clientId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ── List S3 objects ───────────────────────────────────────────────────────
    const allFiles = await listBookingFiles(bookingId);

    // Clients only see previews unless paid
    const isPaid = booking.paymentStatus === "PAID";

    const visibleFiles = isAdmin
      ? allFiles
      : allFiles.filter((f) => {
          if (isPaid) return f.folder === "raw" || f.folder === "edited";
          return f.folder === "previews";
        });

    const files = visibleFiles.map((f) => ({
      key:          f.key,
      filename:     f.filename,
      folder:       f.folder,
      sizeBytes:    f.size,
      lastModified: f.lastModified,
      kind:         /\.(mp4|mov|mkv)$/i.test(f.filename) ? "VIDEO" : "PHOTO",
    }));

    return NextResponse.json({ bookingId, files });

  } catch (error) {
    console.error("[api/media/bookingId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
