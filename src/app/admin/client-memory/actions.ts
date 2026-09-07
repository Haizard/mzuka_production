"use server";

import { requireAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";

// ── Get all client memories ─────────────────────────────────────────────────

export async function getAllClientMemories(search?: string) {
  try {
    await requireAdminAccess("/admin/client-memory");

    const memories = await prisma.clientMemory.findMany({
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Enrich with booking stats for clients without a memory record
    const clientIds = memories.map((m) => m.clientId);
    const allClients = await prisma.user.findMany({
      where: { role: "CLIENT", approvalStatus: "APPROVED" },
      select: { id: true, name: true, email: true, phone: true, createdAt: true },
    });

    const enriched = allClients
      .filter((c) => !clientIds.includes(c.id))
      .map((c) => ({
        id: null,
        clientId: c.id,
        preferredName: null,
        birthday: null,
        anniversary: null,
        preferredContact: "email",
        notes: null,
        preferences: null,
        totalSessions: 0,
        totalSpentCents: 0,
        lastSessionAt: null,
        lastContactAt: null,
        createdAt: null,
        updatedAt: null,
        client: c,
        isNew: true,
      }));

    return {
      success: true,
      memories: memories.map((m) => ({ ...m, isNew: false })),
      newClients: enriched,
    };
  } catch (error) {
    console.error("getAllClientMemories:", error);
    return { success: false, error: "Failed to load client memories", memories: [], newClients: [] };
  }
}

// ── Get single client memory ────────────────────────────────────────────────

export async function getClientMemory(clientId: string) {
  try {
    await requireAdminAccess("/admin/client-memory");

    const [memory, client, bookings, messages] = await Promise.all([
      prisma.clientMemory.findUnique({ where: { clientId } }),
      prisma.user.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, email: true, phone: true, createdAt: true },
      }),
      prisma.booking.findMany({
        where: { clientId },
        include: { package: true, payments: true, gallery: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.message.findMany({
        where: { userId: clientId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    if (!client) return { success: false, error: "Client not found" };

    // Compute stats
    const totalSessions = bookings.filter((b) => b.status === "COMPLETED").length;
    const totalSpentCents = bookings.reduce((sum, b) => {
      const paid = b.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amountCents, 0);
      return sum + paid;
    }, 0);
    const lastSession = bookings.find((b) => b.status === "COMPLETED");

    // Auto-create memory if it doesn't exist
    let mem = memory;
    if (!mem) {
      mem = await prisma.clientMemory.create({
        data: {
          clientId,
          totalSessions,
          totalSpentCents,
          lastSessionAt: lastSession?.scheduledAt ?? null,
          lastContactAt: messages[0]?.createdAt ?? null,
        },
      });
    }

    return {
      success: true,
      memory: mem,
      client,
      bookings,
      messages,
      stats: { totalSessions, totalSpentCents, lastSessionAt: lastSession?.scheduledAt ?? null },
    };
  } catch (error) {
    console.error("getClientMemory:", error);
    return { success: false, error: "Failed to load client memory" };
  }
}

// ── Update client memory ────────────────────────────────────────────────────

export async function updateClientMemory(
  clientId: string,
  data: {
    preferredName?: string;
    birthday?: Date | null;
    anniversary?: Date | null;
    preferredContact?: string;
    notes?: string;
    preferences?: Record<string, unknown>;
  }
) {
  try {
    const admin = await requireAdminAccess("/admin/client-memory");

    const memory = await prisma.clientMemory.upsert({
      where: { clientId },
      create: {
        clientId,
        ...(data.preferredName !== undefined && { preferredName: data.preferredName }),
        ...(data.birthday !== undefined && { birthday: data.birthday }),
        ...(data.anniversary !== undefined && { anniversary: data.anniversary }),
        ...(data.preferredContact !== undefined && { preferredContact: data.preferredContact }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.preferences !== undefined && { preferences: data.preferences as any }),
      },
      update: {
        ...(data.preferredName !== undefined && { preferredName: data.preferredName }),
        ...(data.birthday !== undefined && { birthday: data.birthday }),
        ...(data.anniversary !== undefined && { anniversary: data.anniversary }),
        ...(data.preferredContact !== undefined && { preferredContact: data.preferredContact }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.preferences !== undefined && { preferences: data.preferences as any }),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "CLIENT_APPROVED",
        entity: "ClientMemory",
        entityId: clientId,
        metadata: { updatedBy: admin.email, fields: Object.keys(data) },
      },
    });

    return { success: true, memory };
  } catch (error) {
    console.error("updateClientMemory:", error);
    return { success: false, error: "Failed to update memory" };
  }
}

// ── Refresh client stats ────────────────────────────────────────────────────

export async function refreshClientStats(clientId: string) {
  try {
    await requireAdminAccess("/admin/client-memory");

    const [bookings, messages] = await Promise.all([
      prisma.booking.findMany({
        where: { clientId },
        include: { payments: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.message.findMany({
        where: { userId: clientId },
        orderBy: { createdAt: "desc" },
        take: 1,
      }),
    ]);

    const totalSessions = bookings.filter((b) => b.status === "COMPLETED").length;
    const totalSpentCents = bookings.reduce((sum, b) => {
      return sum + b.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amountCents, 0);
    }, 0);
    const lastSession = bookings.find((b) => b.status === "COMPLETED");

    await prisma.clientMemory.update({
      where: { clientId },
      data: {
        totalSessions,
        totalSpentCents,
        lastSessionAt: lastSession?.scheduledAt ?? null,
        lastContactAt: messages[0]?.createdAt ?? null,
      },
    });

    return { success: true, stats: { totalSessions, totalSpentCents, lastSessionAt: lastSession?.scheduledAt ?? null } };
  } catch (error) {
    console.error("refreshClientStats:", error);
    return { success: false, error: "Failed to refresh stats" };
  }
}
