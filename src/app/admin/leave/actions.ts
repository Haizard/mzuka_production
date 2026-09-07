"use server";

import { requireAdminAccess, canEditEmployees } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";

function requireLeaveAccess() {
  return requireAdminAccess("/admin/leave");
}

// ── Get all leave requests ──────────────────────────────────────────────────

export async function getLeaveRequests(filters?: {
  status?: string;
  staffId?: string;
}) {
  try {
    await requireLeaveAccess();

    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.staffId) where.staffId = filters.staffId;

    const [requests, staff] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          staff: { select: { id: true, name: true, email: true, staffRole: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { role: { in: ["STAFF", "ADMIN"] }, approvalStatus: "APPROVED" },
        select: { id: true, name: true, staffRole: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return { success: true, requests, staff };
  } catch (error) {
    console.error("getLeaveRequests:", error);
    return { success: false, error: "Failed to load leave requests", requests: [], staff: [] };
  }
}

// ── Get leave summary stats ─────────────────────────────────────────────────

export async function getLeaveSummary() {
  try {
    await requireLeaveAccess();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      pendingCount,
      approvedThisMonth,
      approvedThisYear,
      rejectedThisYear,
      totalStaff,
      sickDaysThisYear,
    ] = await Promise.all([
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      prisma.leaveRequest.count({
        where: { status: "APPROVED", reviewedAt: { gte: startOfMonth } },
      }),
      prisma.leaveRequest.count({
        where: { status: "APPROVED", reviewedAt: { gte: startOfYear } },
      }),
      prisma.leaveRequest.count({
        where: { status: "REJECTED", reviewedAt: { gte: startOfYear } },
      }),
      prisma.user.count({ where: { role: "STAFF", approvalStatus: "APPROVED" } }),
      prisma.leaveRequest.count({
        where: { status: "APPROVED", type: "SICK", reviewedAt: { gte: startOfYear } },
      }),
    ]);

    return {
      success: true,
      stats: { pendingCount, approvedThisMonth, approvedThisYear, rejectedThisYear, totalStaff, sickDaysThisYear },
    };
  } catch (error) {
    console.error("getLeaveSummary:", error);
    return { success: false, error: "Failed to load summary" };
  }
}

// ── Approve / Reject leave ─────────────────────────────────────────────────

export async function reviewLeaveAction(
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  note?: string
) {
  try {
    const admin = await requireLeaveAccess();

    const request = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!request) return { success: false, error: "Leave request not found" };
    if (request.status !== "PENDING") return { success: false, error: "Leave request is not pending" };

    const updated = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: decision,
        reviewedById: admin.id,
        reviewNote: note || null,
        reviewedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: decision === "APPROVED" ? "LEAVE_APPROVED" : "LEAVE_REJECTED",
        entity: "LeaveRequest",
        entityId: requestId,
        metadata: {
          staffId: request.staffId,
          type: request.type,
          startDate: request.startDate,
          endDate: request.endDate,
          decision,
          reviewedBy: admin.email,
        },
      },
    });

    return { success: true, request: updated };
  } catch (error) {
    console.error("reviewLeave:", error);
    return { success: false, error: "Failed to review leave request" };
  }
}

// ── Cancel a leave request (staff can cancel their own pending request) ─────

export async function cancelLeaveAction(requestId: string) {
  try {
    const admin = await requireLeaveAccess();

    const request = await prisma.leaveRequest.findUnique({ where: { id: requestId } });
    if (!request) return { success: false, error: "Leave request not found" };

    // Only the requester or an admin can cancel
    if (request.staffId !== admin.id && !canEditEmployees(admin)) {
      return { success: false, error: "You do not have permission to cancel this request" };
    }

    if (request.status !== "PENDING") {
      return { success: false, error: "Can only cancel pending requests" };
    }

    const updated = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: { status: "CANCELLED" },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "LEAVE_REJECTED", // reuse enum
        entity: "LeaveRequest",
        entityId: requestId,
        metadata: { action: "CANCELLED", cancelledBy: admin.email },
      },
    });

    return { success: true, request: updated };
  } catch (error) {
    console.error("cancelLeave:", error);
    return { success: false, error: "Failed to cancel leave request" };
  }
}

// ── Bulk approve pending requests ───────────────────────────────────────────

export async function bulkApproveLeaveAction(requestIds: string[]) {
  try {
    const admin = await requireLeaveAccess();
    if (!canEditEmployees(admin)) {
      return { success: false, error: "You do not have permission" };
    }

    const result = await prisma.leaveRequest.updateMany({
      where: { id: { in: requestIds }, status: "PENDING" },
      data: {
        status: "APPROVED",
        reviewedById: admin.id,
        reviewedAt: new Date(),
        reviewNote: "Bulk approved",
      },
    });

    return { success: true, count: result.count };
  } catch (error) {
    console.error("bulkApproveLeave:", error);
    return { success: false, error: "Failed to bulk approve" };
  }
}
