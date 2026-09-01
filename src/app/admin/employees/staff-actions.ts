"use server";

import { canManageEmployees, requireAdminAccess, isFounderOnlyRole } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { nanoid } from "nanoid";
import type { StaffRoleValue } from "./staff-roles";

function cuid() { return nanoid(25); }

// ── Create a new staff account (admin only) ───────────────────────────────────

export async function createStaffMemberAction(data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  staffRole: StaffRoleValue;
}) {
  try {
    const admin = await requireAdminAccess("/admin/employees");
    if (!canManageEmployees(admin)) return { success: false, error: "Forbidden" };

    // SECURITY: Only the FOUNDER can create ADMIN-staff accounts.
    // HR and other managers cannot elevate themselves or others to admin.
    if (isFounderOnlyRole(data.staffRole) && admin.role !== "FOUNDER") {
      return { success: false, error: "Only the founder can create admin accounts" };
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return { success: false, error: "An account with this email already exists" };

    // isProductionManager is derived from staffRole — no separate flag
    const isPM = data.staffRole === "PRODUCTION_MANAGER";

    const member = await prisma.user.create({
      data: {
        id:                 cuid(),
        name:               data.name,
        email:              data.email,
        phone:              data.phone ?? null,
        passwordHash:       await hashPassword(data.password),
        role:               "STAFF",
        approvalStatus:     "APPROVED",
        staffRole:          data.staffRole,
        isProductionManager: isPM,
        emailVerifiedAt:    new Date(),
      },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, staffRole: true, isProductionManager: true, createdAt: true,
        staffAssignments: {
          include: { project: { select: { id: true, stage: true, booking: { select: { title: true } } } } },
          take: 2,
        },
      },
    });

    await prisma.clientApproval.create({
      data: {
        clientId:  member.id,
        status:    "APPROVED",
        decidedAt: new Date(),
        notes:     `Staff account created by ${admin.email} — role: ${data.staffRole}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId:  admin.id,
        action:   "ROLE_CHANGED",
        entity:   "User",
        entityId: member.id,
        metadata: { staffRole: data.staffRole, action: "STAFF_CREATED", createdBy: admin.email },
      },
    });

    return { success: true, member };
  } catch (error) {
    console.error("createStaffMember:", error);
    return { success: false, error: "Failed to create staff member" };
  }
}

// ── Update staff role (admin only) ────────────────────────────────────────────

export async function updateStaffRoleAction(staffId: string, staffRole: string) {
  try {
    const admin = await requireAdminAccess("/admin/employees");
    if (!canManageEmployees(admin)) return { success: false, error: "Forbidden" };

    // SECURITY: Prevent self-elevation
    if (staffId === admin.id) {
      return { success: false, error: "You cannot change your own role" };
    }

    const staff = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) return { success: false, error: "Staff member not found" };
    if (!["STAFF","ADMIN","FOUNDER"].includes(staff.role)) {
      return { success: false, error: "Can only update roles for staff accounts" };
    }
    // SECURITY: Only the FOUNDER can assign the ADMIN staff role
    if (isFounderOnlyRole(staffRole) && admin.role !== "FOUNDER") {
      return { success: false, error: "Only the founder can assign admin roles" };
    }

    const prevRole = staff.staffRole;
    const newUserRole = staffRole === "ADMIN" ? "ADMIN" : "STAFF";
    const isPM = staffRole === "PRODUCTION_MANAGER";

    await prisma.user.update({
      where: { id: staffId },
      data: { staffRole, role: newUserRole, isProductionManager: isPM },
    });

    await prisma.auditLog.create({
      data: {
        actorId:  admin.id,
        action:   "ROLE_CHANGED",
        entity:   "User",
        entityId: staffId,
        metadata: {
          previousRole: prevRole,
          newRole: staffRole,
          userRole: newUserRole,
          changedBy: admin.email,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("updateStaffRole:", error);
    return { success: false, error: "Failed to update role" };
  }
}

// ── Suspend / Activate staff (admin only) ─────────────────────────────────────

export async function suspendStaffAction(staffId: string) {
  try {
    const admin = await requireAdminAccess("/admin/employees");
    if (!canManageEmployees(admin)) return { success: false, error: "Forbidden" };
    if (staffId === admin.id) return { success: false, error: "You cannot suspend your own account" };

    const staff = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) return { success: false, error: "Staff member not found" };
    if (staff.role === "FOUNDER") return { success: false, error: "Cannot suspend the founder account" };

    await prisma.user.update({
      where: { id: staffId },
      data: { approvalStatus: "DEACTIVATED" },
    });

    await prisma.auditLog.create({
      data: {
        actorId:  admin.id,
        action:   "STAFF_SUSPENDED",
        entity:   "User",
        entityId: staffId,
        metadata: { suspendedBy: admin.email, reason: "Account deactivated by admin" },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("suspendStaff:", error);
    return { success: false, error: "Failed to suspend staff member" };
  }
}

export async function activateStaffAction(staffId: string) {
  try {
    const admin = await requireAdminAccess("/admin/employees");
    if (!canManageEmployees(admin)) return { success: false, error: "Forbidden" };

    const staff = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) return { success: false, error: "Staff member not found" };
    if (staff.approvalStatus !== "DEACTIVATED") {
      return { success: false, error: "Account is not deactivated" };
    }

    await prisma.user.update({
      where: { id: staffId },
      data: { approvalStatus: "APPROVED" },
    });

    await prisma.auditLog.create({
      data: {
        actorId:  admin.id,
        action:   "STAFF_ACTIVATED",
        entity:   "User",
        entityId: staffId,
        metadata: { activatedBy: admin.email },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("activateStaff:", error);
    return { success: false, error: "Failed to activate staff member" };
  }
}

