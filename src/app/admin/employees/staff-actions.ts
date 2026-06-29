"use server";

import { requireAdmin } from "@/lib/auth";
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
    await requireAdmin();

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return { success: false, error: "An account with this email already exists" };

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

    // Create the ClientApproval record
    await prisma.clientApproval.create({
      data: {
        clientId:  member.id,
        status:    "APPROVED",
        decidedAt: new Date(),
        notes:     `Staff account created by admin — role: ${data.staffRole}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        action:   "CLIENT_APPROVED",
        entity:   "User",
        entityId: member.id,
        metadata: { staffRole: data.staffRole, createdByAdmin: true },
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
    await requireAdmin();

    const staff = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) return { success: false, error: "Staff member not found" };
    if (!["STAFF","ADMIN","FOUNDER"].includes(staff.role)) {
      return { success: false, error: "Can only update roles for staff accounts" };
    }

    // When promoting to ADMIN staffRole, also elevate the UserRole enum so
    // they gain full admin-level access immediately (session re-validates from DB).
    // All other staffRoles stay as STAFF in the UserRole enum.
    const newUserRole = staffRole === "ADMIN" ? "ADMIN" : "STAFF";
    // Sync isProductionManager with staffRole so both signals stay consistent
    const isPM = staffRole === "PRODUCTION_MANAGER";

    await prisma.user.update({
      where: { id: staffId },
      data: { staffRole, role: newUserRole, isProductionManager: isPM },
    });

    await prisma.auditLog.create({
      data: {
        action: "CLIENT_APPROVED",
        entity: "User",
        entityId: staffId,
        metadata: { staffRole, userRole: newUserRole, updatedByAdmin: true },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("updateStaffRole:", error);
    return { success: false, error: "Failed to update role" };
  }
}


