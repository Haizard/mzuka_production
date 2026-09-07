"use server";

import { requireAdminAccess, canEditEmployees } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";

function requireCommissionAccess() {
  return requireAdminAccess("/admin/commissions");
}

// ── Get commission data ─────────────────────────────────────────────────────

export async function getCommissionData(filters?: { staffId?: string; status?: string }) {
  try {
    await requireCommissionAccess();

    const where: Record<string, unknown> = {};
    if (filters?.staffId) where.staffId = filters.staffId;
    if (filters?.status) where.status = filters.status;

    const [commissions, staff] = await Promise.all([
      prisma.staffCommission.findMany({
        where,
        include: {
          staff: { select: { id: true, name: true, email: true, staffRole: true } },
          booking: { select: { id: true, title: true, scheduledAt: true } },
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { role: { in: ["STAFF", "ADMIN"] }, approvalStatus: "APPROVED" },
        select: { id: true, name: true, staffRole: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return { success: true, commissions, staff };
  } catch (error) {
    console.error("getCommissionData:", error);
    return { success: false, error: "Failed to load commissions", commissions: [], staff: [] };
  }
}

// ── Get commission summary ──────────────────────────────────────────────────

export async function getCommissionSummary() {
  try {
    await requireCommissionAccess();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      pendingCommissions,
      approvedNotPaid,
      totalPaidAllTime,
      monthlyCommissions,
      yearlyCommissions,
      totalCount,
      pendingCount,
    ] = await Promise.all([
      prisma.staffCommission.aggregate({
        where: { status: "PENDING" },
        _sum: { amountCents: true },
      }),
      prisma.staffCommission.aggregate({
        where: { status: "APPROVED" },
        _sum: { amountCents: true },
      }),
      prisma.staffCommission.aggregate({
        where: { status: "PAID" },
        _sum: { amountCents: true },
      }),
      prisma.staffCommission.aggregate({
        where: { status: "PAID", paidAt: { gte: startOfMonth } },
        _sum: { amountCents: true },
      }),
      prisma.staffCommission.aggregate({
        where: { status: "PAID", paidAt: { gte: startOfYear } },
        _sum: { amountCents: true },
      }),
      prisma.staffCommission.count(),
      prisma.staffCommission.count({ where: { status: "PENDING" } }),
    ]);

    return {
      success: true,
      stats: {
        pendingAmount: pendingCommissions._sum.amountCents ?? 0,
        approvedNotPaid: approvedNotPaid._sum.amountCents ?? 0,
        paidAllTime: totalPaidAllTime._sum.amountCents ?? 0,
        paidThisMonth: monthlyCommissions._sum.amountCents ?? 0,
        paidThisYear: yearlyCommissions._sum.amountCents ?? 0,
        totalCount,
        pendingCount,
      },
    };
  } catch (error) {
    console.error("getCommissionSummary:", error);
    return { success: false, error: "Failed to load summary" };
  }
}

// ── Approve commission ──────────────────────────────────────────────────────

export async function approveCommission(commissionId: string) {
  try {
    const admin = await requireCommissionAccess();
    if (!canEditEmployees(admin)) {
      return { success: false, error: "You do not have permission" };
    }

    const commission = await prisma.staffCommission.findUnique({ where: { id: commissionId } });
    if (!commission) return { success: false, error: "Commission not found" };
    if (commission.status !== "PENDING") return { success: false, error: "Can only approve pending commissions" };

    const updated = await prisma.staffCommission.update({
      where: { id: commissionId },
      data: {
        status: "APPROVED",
        approvedById: admin.id,
        approvedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "COMMISSION_APPROVED",
        entity: "StaffCommission",
        entityId: commissionId,
        metadata: {
          staffId: commission.staffId,
          amountCents: commission.amountCents,
          approvedBy: admin.email,
        },
      },
    });

    return { success: true, commission: updated };
  } catch (error) {
    console.error("approveCommission:", error);
    return { success: false, error: "Failed to approve commission" };
  }
}

// ── Mark commission as paid ─────────────────────────────────────────────────

export async function markCommissionPaid(commissionId: string) {
  try {
    const admin = await requireCommissionAccess();
    if (!canEditEmployees(admin)) {
      return { success: false, error: "You do not have permission" };
    }

    const commission = await prisma.staffCommission.findUnique({ where: { id: commissionId } });
    if (!commission) return { success: false, error: "Commission not found" };
    if (commission.status === "PAID") return { success: false, error: "Already marked as paid" };

    const updated = await prisma.staffCommission.update({
      where: { id: commissionId },
      data: { status: "PAID", paidAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "COMMISSION_PAID",
        entity: "StaffCommission",
        entityId: commissionId,
        metadata: {
          staffId: commission.staffId,
          amountCents: commission.amountCents,
          paidBy: admin.email,
        },
      },
    });

    return { success: true, commission: updated };
  } catch (error) {
    console.error("markCommissionPaid:", error);
    return { success: false, error: "Failed to mark as paid" };
  }
}

// ── Create commission entry ─────────────────────────────────────────────────

export async function createCommission(data: {
  staffId: string;
  bookingId: string;
  role: string;
  amountCents: number;
  percent?: number;
  notes?: string;
}) {
  try {
    const admin = await requireCommissionAccess();
    if (!canEditEmployees(admin)) {
      return { success: false, error: "You do not have permission" };
    }

    const commission = await prisma.staffCommission.create({
      data: {
        staffId: data.staffId,
        bookingId: data.bookingId,
        role: data.role,
        amountCents: data.amountCents,
        percent: data.percent ?? null,
        notes: data.notes ?? null,
        status: "PENDING",
      },
    });

    return { success: true, commission };
  } catch (error) {
    console.error("createCommission:", error);
    return { success: false, error: "Failed to create commission" };
  }
}

// ── Bulk approve commissions ────────────────────────────────────────────────

export async function bulkApproveCommissions(commissionIds: string[]) {
  try {
    const admin = await requireCommissionAccess();
    if (!canEditEmployees(admin)) {
      return { success: false, error: "You do not have permission" };
    }

    const result = await prisma.staffCommission.updateMany({
      where: { id: { in: commissionIds }, status: "PENDING" },
      data: {
        status: "APPROVED",
        approvedById: admin.id,
        approvedAt: new Date(),
      },
    });

    return { success: true, count: result.count };
  } catch (error) {
    console.error("bulkApproveCommissions:", error);
    return { success: false, error: "Failed to bulk approve" };
  }
}
