"use server";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ── Get notifications for current user ──────────────────────────────────────

export async function getNotifications(filters?: {
  type?: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}) {
  try {
    const user = await requireUser();

    const where: Record<string, unknown> = { userId: user.id };
    if (filters?.type) where.type = filters.type;
    if (filters?.unreadOnly) where.readAt = null;

    const [notifications, unreadCount] = await Promise.all([
      prisma.inAppNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: filters?.limit ?? 50,
        skip: filters?.offset ?? 0,
      }),
      prisma.inAppNotification.count({
        where: { userId: user.id, readAt: null },
      }),
    ]);

    return { success: true, notifications, unreadCount };
  } catch (error) {
    console.error("getNotifications:", error);
    return { success: false, error: "Failed to load notifications", notifications: [], unreadCount: 0 };
  }
}

// ── Get unread count only ───────────────────────────────────────────────────

export async function getUnreadCount() {
  try {
    const user = await requireUser();
    const count = await prisma.inAppNotification.count({
      where: { userId: user.id, readAt: null },
    });
    return { success: true, count };
  } catch {
    return { success: false, count: 0 };
  }
}

// ── Mark a single notification as read ──────────────────────────────────────

export async function markNotificationRead(notificationId: string) {
  try {
    const user = await requireUser();
    const notification = await prisma.inAppNotification.findUnique({
      where: { id: notificationId },
    });
    if (!notification || notification.userId !== user.id) {
      return { success: false, error: "Not found" };
    }
    if (notification.readAt) return { success: true }; // already read

    await prisma.inAppNotification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    return { success: true };
  } catch (error) {
    console.error("markNotificationRead:", error);
    return { success: false, error: "Failed to mark as read" };
  }
}

// ── Mark all notifications as read ──────────────────────────────────────────

export async function markAllNotificationsRead() {
  try {
    const user = await requireUser();
    await prisma.inAppNotification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  } catch (error) {
    console.error("markAllNotificationsRead:", error);
    return { success: false, error: "Failed to mark all as read" };
  }
}

// ── Delete a notification ───────────────────────────────────────────────────

export async function deleteNotification(notificationId: string) {
  try {
    const user = await requireUser();
    const notification = await prisma.inAppNotification.findUnique({
      where: { id: notificationId },
    });
    if (!notification || notification.userId !== user.id) {
      return { success: false, error: "Not found" };
    }
    await prisma.inAppNotification.delete({ where: { id: notificationId } });
    return { success: true };
  } catch (error) {
    console.error("deleteNotification:", error);
    return { success: false, error: "Failed to delete" };
  }
}

// ── Create an in-app notification (internal helper) ─────────────────────────

export async function createInAppNotification(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    const notification = await prisma.inAppNotification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        link: data.link ?? null,
      },
    });
    return { success: true, notification };
  } catch (error) {
    console.error("createInAppNotification:", error);
    return { success: false };
  }
}

// ── Get notification preferences ────────────────────────────────────────────

export async function getNotificationPreferences() {
  try {
    const user = await requireUser();
    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId: user.id },
    });
    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { userId: user.id },
      });
    }
    return { success: true, preferences: prefs };
  } catch (error) {
    console.error("getNotificationPreferences:", error);
    return { success: false, error: "Failed to load preferences" };
  }
}

// ── Update notification preferences ─────────────────────────────────────────

export async function updateNotificationPreferences(data: {
  emailEnabled?: boolean;
  smsEnabled?: boolean;
  whatsappEnabled?: boolean;
  pushEnabled?: boolean;
  typeOverrides?: Record<string, boolean>;
}) {
  try {
    const user = await requireUser();
    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        emailEnabled: data.emailEnabled ?? true,
        smsEnabled: data.smsEnabled ?? true,
        whatsappEnabled: data.whatsappEnabled ?? true,
        pushEnabled: data.pushEnabled ?? true,
        typeOverrides: data.typeOverrides ?? undefined,
      },
      update: {
        ...(data.emailEnabled !== undefined && { emailEnabled: data.emailEnabled }),
        ...(data.smsEnabled !== undefined && { smsEnabled: data.smsEnabled }),
        ...(data.whatsappEnabled !== undefined && { whatsappEnabled: data.whatsappEnabled }),
        ...(data.pushEnabled !== undefined && { pushEnabled: data.pushEnabled }),
        ...(data.typeOverrides !== undefined && { typeOverrides: data.typeOverrides }),
      },
    });
    return { success: true, preferences: prefs };
  } catch (error) {
    console.error("updateNotificationPreferences:", error);
    return { success: false, error: "Failed to update preferences" };
  }
}
