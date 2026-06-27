"use server";

import { requireAdmin, requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateS3UploadUrl,
  generateS3DownloadUrl,
  generateS3PreviewUrl,
  downloadS3Object,
  uploadPreviewToS3,
} from "@/lib/s3";
import { generateWatermarkedPreview } from "@/lib/watermark";

// ── Gallery CRUD ──────────────────────────────────────────────────────────────

export async function createGalleryAction(bookingId: string, title: string) {
  try {
    await requireAdmin();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { gallery: true },
    });

    if (!booking) return { success: false, error: "Booking not found" };
    if (booking.gallery) return { success: false, error: "Gallery already exists for this booking" };

    const slug = `${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    const gallery = await prisma.gallery.create({
      data: {
        bookingId,
        title,
        slug,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return { success: true, gallery };
  } catch (error) {
    console.error("Failed to create gallery:", error);
    return { success: false, error: "Failed to create gallery" };
  }
}

export async function getGalleryByBookingId(bookingId: string) {
  try {
    const gallery = await prisma.gallery.findUnique({
      where: { bookingId },
      include: {
        mediaAssets: { orderBy: { createdAt: "desc" } },
        booking: { include: { client: true, payments: true } },
      },
    });

    return { success: true, gallery };
  } catch (error) {
    console.error("Failed to fetch gallery:", error);
    return { success: false, error: "Failed to load gallery", gallery: null };
  }
}

// ── Media upload with watermark generation ────────────────────────────────────

/**
 * Step 1 — called by the admin uploader.
 * Creates the DB record and returns a signed S3 PUT URL.
 * The browser then PUTs the file directly to S3.
 * After the PUT succeeds, the admin calls generatePreviewAction().
 */
export async function uploadMediaAssetAction(
  galleryId: string,
  filename: string,
  filetype: string,
  mediaKind: "PHOTO" | "VIDEO",
  width?: number,
  height?: number,
  sizeBytes?: number
) {
  try {
    await requireAdmin();

    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      include: { booking: { include: { client: true } } },
    });

    if (!gallery) return { success: false, error: "Gallery not found" };

    const uploadResult = await generateS3UploadUrl(filename, filetype, mediaKind);
    if (!uploadResult.success || !uploadResult.s3Key) {
      return { success: false, error: uploadResult.error };
    }

    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        galleryId,
        kind: mediaKind,
        originalKey: uploadResult.s3Key,
        filename,
        mimeType: filetype,
        width,
        height,
        sizeBytes: sizeBytes ? BigInt(sizeBytes) : null,
        releaseStatus: "DRAFT",
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "MEDIA_UPLOADED",
        entity: "MediaAsset",
        entityId: mediaAsset.id,
        metadata: { galleryId, filename, kind: mediaKind },
      },
    });

    return {
      success: true,
      mediaAsset,
      uploadUrl: uploadResult.uploadUrl,
    };
  } catch (error) {
    console.error("Failed to upload media asset:", error);
    return { success: false, error: "Failed to upload media" };
  }
}

/**
 * Step 2 — called after the browser PUT to S3 succeeds.
 * Downloads the original from S3, generates a watermarked JPEG preview,
 * uploads the preview to the previews bucket, and saves previewKey in the DB.
 *
 * Only works for PHOTO assets. VIDEO previews are handled separately (thumbnails).
 */
export async function generatePreviewAction(mediaAssetId: string) {
  try {
    await requireAdmin();

    const asset = await prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
      include: { gallery: { include: { booking: { include: { client: true } } } } },
    });

    if (!asset) return { success: false, error: "Media asset not found" };
    if (asset.kind !== "PHOTO") {
      // Videos don't get image watermarks — mark previewKey as the original for now
      await prisma.mediaAsset.update({
        where: { id: mediaAssetId },
        data: { previewKey: asset.originalKey },
      });
      return { success: true, skipped: true };
    }
    if (asset.previewKey) return { success: true, skipped: true }; // already done

    const originalsBucket = process.env.AWS_S3_BUCKET_PRIVATE_ORIGINALS;
    if (!originalsBucket) return { success: false, error: "Originals bucket not configured" };

    // Pull original bytes
    const originalBuffer = await downloadS3Object(originalsBucket, asset.originalKey);

    // Build watermark label from client info
    const client = asset.gallery.booking.client;
    const clientLabel = `${client.name} · ${client.email}`;

    // Generate watermarked preview
    const previewBuffer = await generateWatermarkedPreview(originalBuffer, {
      clientLabel,
      maxWidth: 1200,
    });

    // Upload preview to previews bucket
    const previewKey = await uploadPreviewToS3(previewBuffer, asset.originalKey);

    // Store previewKey
    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: { previewKey },
    });

    return { success: true, previewKey };
  } catch (error) {
    console.error("Failed to generate preview:", error);
    return { success: false, error: "Failed to generate watermarked preview" };
  }
}

// ── Release ───────────────────────────────────────────────────────────────────

export async function releaseMediaAssetsAction(galleryId: string) {
  try {
    await requireAdmin();

    const gallery = await prisma.gallery.findUnique({ where: { id: galleryId } });
    if (!gallery) return { success: false, error: "Gallery not found" };

    const updated = await prisma.mediaAsset.updateMany({
      where: { galleryId, releaseStatus: "DRAFT" },
      data: { releaseStatus: "RELEASED" },
    });

    await prisma.auditLog.create({
      data: {
        action: "MEDIA_RELEASED",
        entity: "Gallery",
        entityId: galleryId,
        metadata: { count: updated.count },
      },
    });

    return { success: true, count: updated.count };
  } catch (error) {
    console.error("Failed to release media assets:", error);
    return { success: false, error: "Failed to release assets" };
  }
}

// ── Client gallery access ─────────────────────────────────────────────────────

export async function getGalleryAccessUrls(galleryId: string) {
  try {
    const user = await requireApprovedUser();

    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      include: {
        mediaAssets: true,
        booking: { include: { client: true, payments: true } },
      },
    });

    if (!gallery) return { success: false, error: "Gallery not found", mediaAssets: [] };

    // Ownership check
    if (gallery.booking.clientId !== user.id) {
      return { success: false, error: "Unauthorized", mediaAssets: [] };
    }

    // Check expiry
    if (gallery.expiresAt && gallery.expiresAt < new Date()) {
      return { success: false, error: "This gallery has expired", mediaAssets: [] };
    }

    // Only show released assets to clients
    const releasedAssets = gallery.mediaAssets.filter(
      (a) => a.releaseStatus === "RELEASED"
    );

    const isPaid = gallery.booking.payments.some((p) => p.status === "PAID");

    const mediaAssets = await Promise.all(
      releasedAssets.map(async (asset) => {
        let previewUrl: string | null = null;
        let downloadUrl: string | null = null;

        if (isPaid) {
          // Full-quality signed download URL
          const dl = await generateS3DownloadUrl(asset.originalKey, 3600);
          downloadUrl = dl.downloadUrl ?? null;
        } else {
          // Watermarked preview URL
          const previewKey = asset.previewKey ?? asset.originalKey;
          const pv = await generateS3PreviewUrl(previewKey, 7200);
          previewUrl = pv.previewUrl ?? null;
        }

        // Record access
        await prisma.accessLog.create({
          data: {
            galleryId,
            userId: user.id,
            action: isPaid ? "FULL_ACCESS" : "PREVIEW_ACCESS",
          },
        });

        return {
          id: asset.id,
          filename: asset.filename,
          kind: asset.kind,
          width: asset.width,
          height: asset.height,
          previewUrl,
          downloadUrl,
          isPaid,
        };
      })
    );

    return {
      success: true,
      gallery: {
        id: gallery.id,
        title: gallery.title,
        expiresAt: gallery.expiresAt,
        isPaid,
      },
      mediaAssets,
    };
  } catch (error) {
    console.error("Failed to get gallery access URLs:", error);
    return { success: false, error: "Failed to load gallery", gallery: null, mediaAssets: [] };
  }
}

// ── Admin list ────────────────────────────────────────────────────────────────

export async function getAdminGalleries() {
  try {
    await requireAdmin();

    const galleries = await prisma.gallery.findMany({
      include: {
        booking: { include: { client: true, payments: true } },
        mediaAssets: true,
        accessLogs: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, galleries };
  } catch (error) {
    console.error("Failed to fetch galleries:", error);
    return { success: false, error: "Failed to load galleries", galleries: [] };
  }
}
