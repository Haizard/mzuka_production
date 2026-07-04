"use server";

import { requireAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";

// ── Audit log dashboard ───────────────────────────────────────────────────────

export interface AuditLogFilters {
  action?: string;
  entity?: string;
  actorId?: string;
  limit?: number;
  offset?: number;
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  try {
    await requireAdminAccess("/admin/security");

    const where: Record<string, unknown> = {};
    if (filters.action) where.action = filters.action;
    if (filters.entity) where.entity = filters.entity;
    if (filters.actorId) where.actorId = filters.actorId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { success: true, logs, total };
  } catch (error) {
    console.error("Failed to fetch audit logs:", error);
    return { success: false, error: "Failed to load audit logs", logs: [], total: 0 };
  }
}

export async function getAccessLogs(galleryId?: string) {
  try {
    await requireAdminAccess("/admin/security");

    const where = galleryId ? { galleryId } : {};

    const [logs, total] = await Promise.all([
      prisma.accessLog.findMany({
        where,
        include: {
          gallery: { select: { id: true, title: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.accessLog.count({ where }),
    ]);

    return { success: true, logs, total };
  } catch (error) {
    console.error("Failed to fetch access logs:", error);
    return { success: false, error: "Failed to load access logs", logs: [], total: 0 };
  }
}

export async function getSecurityStats() {
  try {
    await requireAdminAccess("/admin/security");

    const [
      totalAccess,
      previewAccess,
      fullAccess,
      totalDownloads,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.accessLog.count(),
      prisma.accessLog.count({ where: { action: "PREVIEW_ACCESS" } }),
      prisma.accessLog.count({ where: { action: "FULL_ACCESS" } }),
      prisma.download.count(),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { actor: { select: { name: true, email: true } } },
      }),
    ]);

    return {
      success: true,
      stats: { totalAccess, previewAccess, fullAccess, totalDownloads },
      recentAuditLogs,
    };
  } catch (error) {
    console.error("Failed to fetch security stats:", error);
    return { success: false, error: "Failed to load security stats" };
  }
}

// ── Gallery permission controls ───────────────────────────────────────────────

export async function updateGalleryPermissionsAction(
  galleryId: string,
  permissions: {
    isDownloadOpen?: boolean;
    isShareOpen?: boolean;
    watermarkText?: string;
    expiresAt?: Date | null;
  }
) {
  try {
    await requireAdminAccess("/admin/security");

    const gallery = await prisma.gallery.findUnique({ where: { id: galleryId } });
    if (!gallery) return { success: false, error: "Gallery not found" };

    const updated = await prisma.gallery.update({
      where: { id: galleryId },
      data: {
        isDownloadOpen:
          permissions.isDownloadOpen !== undefined
            ? permissions.isDownloadOpen
            : gallery.isDownloadOpen,
        isShareOpen:
          permissions.isShareOpen !== undefined
            ? permissions.isShareOpen
            : gallery.isShareOpen,
        watermarkText:
          permissions.watermarkText !== undefined
            ? permissions.watermarkText
            : gallery.watermarkText,
        expiresAt:
          permissions.expiresAt !== undefined
            ? permissions.expiresAt
            : gallery.expiresAt,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "GALLERY_VIEWED", // closest available action for permission change
        entity: "Gallery",
        entityId: galleryId,
        metadata: { permissionsUpdated: permissions },
      },
    });

    return { success: true, gallery: updated };
  } catch (error) {
    console.error("Failed to update gallery permissions:", error);
    return { success: false, error: "Failed to update permissions" };
  }
}

export async function revokeGalleryAccessAction(galleryId: string) {
  try {
    await requireAdminAccess("/admin/security");

    const updated = await prisma.gallery.update({
      where: { id: galleryId },
      data: {
        expiresAt: new Date(), // expire immediately
        isDownloadOpen: false,
        isShareOpen: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "ACCESS_REVOKED",
        entity: "Gallery",
        entityId: galleryId,
        metadata: { revokedAt: new Date().toISOString() },
      },
    });

    return { success: true, gallery: updated };
  } catch (error) {
    console.error("Failed to revoke gallery access:", error);
    return { success: false, error: "Failed to revoke access" };
  }
}
