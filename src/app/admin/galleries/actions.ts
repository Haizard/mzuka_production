"use server";

import { requireAdmin, requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateS3UploadUrl, generateS3DownloadUrl, generateS3PreviewUrl } from "@/lib/s3";

export async function createGalleryAction(bookingId: string, title: string) {
  try {
    await requireAdmin();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { gallery: true },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found",
      };
    }

    if (booking.gallery) {
      return {
        success: false,
        error: "Gallery already exists for this booking",
      };
    }

    const slug = `${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    const gallery = await prisma.gallery.create({
      data: {
        bookingId,
        title,
        slug,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return {
      success: true,
      gallery,
    };
  } catch (error) {
    console.error("Failed to create gallery:", error);
    return {
      success: false,
      error: "Failed to create gallery",
    };
  }
}

export async function getGalleryByBookingId(bookingId: string) {
  try {
    const gallery = await prisma.gallery.findUnique({
      where: { bookingId },
      include: {
        mediaAssets: {
          orderBy: { createdAt: "desc" },
        },
        booking: {
          include: {
            client: true,
            payments: true,
          },
        },
      },
    });

    return {
      success: true,
      gallery,
    };
  } catch (error) {
    console.error("Failed to fetch gallery:", error);
    return {
      success: false,
      error: "Failed to load gallery",
      gallery: null,
    };
  }
}

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
      include: { booking: true },
    });

    if (!gallery) {
      return {
        success: false,
        error: "Gallery not found",
      };
    }

    // Generate S3 upload URL
    const uploadResult = await generateS3UploadUrl(filename, filetype, mediaKind);

    if (!uploadResult.success || !uploadResult.s3Key) {
      return {
        success: false,
        error: uploadResult.error,
      };
    }

    // Create media asset record
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

    return {
      success: true,
      mediaAsset,
      uploadUrl: uploadResult.uploadUrl,
    };
  } catch (error) {
    console.error("Failed to upload media asset:", error);
    return {
      success: false,
      error: "Failed to upload media",
    };
  }
}

export async function releaseMediaAssetsAction(galleryId: string) {
  try {
    await requireAdmin();

    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
    });

    if (!gallery) {
      return {
        success: false,
        error: "Gallery not found",
      };
    }

    // Release all media assets
    const updated = await prisma.mediaAsset.updateMany({
      where: {
        galleryId,
        releaseStatus: "DRAFT",
      },
      data: {
        releaseStatus: "RELEASED",
      },
    });

    return {
      success: true,
      count: updated.count,
    };
  } catch (error) {
    console.error("Failed to release media assets:", error);
    return {
      success: false,
      error: "Failed to release assets",
    };
  }
}

export async function getGalleryAccessUrls(galleryId: string) {
  try {
    const user = await requireApprovedUser();

    const gallery = await prisma.gallery.findUnique({
      where: { id: galleryId },
      include: {
        mediaAssets: true,
        booking: {
          include: {
            client: true,
            payments: true,
          },
        },
      },
    });

    if (!gallery) {
      return {
        success: false,
        error: "Gallery not found",
        mediaAssets: [],
      };
    }

    // Check ownership
    if (gallery.booking.clientId !== user.id) {
      return {
        success: false,
        error: "Unauthorized",
        mediaAssets: [],
      };
    }

    // Check if paid
    const isPaid = gallery.booking.payments.some((p) => p.status === "PAID");

    // Generate URLs for each media asset
    const mediaAssets = await Promise.all(
      gallery.mediaAssets.map(async (asset) => {
        // Always provide preview
        const previewResult = isPaid
          ? null
          : await generateS3PreviewUrl(asset.previewKey || asset.originalKey, 7200);

        // Only provide download if paid
        const downloadResult = isPaid
          ? await generateS3DownloadUrl(asset.originalKey, 3600)
          : null;

        // Log access
        await prisma.accessLog.create({
          data: {
            galleryId,
            userId: user.id,
            ipAddress: undefined,
            userAgent: undefined,
            action: isPaid ? "FULL_ACCESS" : "PREVIEW_ACCESS",
          },
        });

        return {
          id: asset.id,
          filename: asset.filename,
          kind: asset.kind,
          width: asset.width,
          height: asset.height,
          previewUrl: previewResult?.previewUrl || null,
          downloadUrl: downloadResult?.downloadUrl || null,
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
    return {
      success: false,
      error: "Failed to load gallery",
      gallery: null,
      mediaAssets: [],
    };
  }
}

export async function getAdminGalleries() {
  try {
    await requireAdmin();

    const galleries = await prisma.gallery.findMany({
      include: {
        booking: {
          include: {
            client: true,
            payments: true,
          },
        },
        mediaAssets: true,
        accessLogs: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      galleries,
    };
  } catch (error) {
    console.error("Failed to fetch galleries:", error);
    return {
      success: false,
      error: "Failed to load galleries",
      galleries: [],
    };
  }
}
