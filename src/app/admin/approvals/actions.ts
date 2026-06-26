"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function approveClientAction(formData: FormData) {
  const admin = await requireAdmin();
  const clientId = String(formData.get("clientId") ?? "");

  if (!clientId) {
    return;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: clientId },
      data: { approvalStatus: "APPROVED" },
    }),
    prisma.clientApproval.create({
      data: {
        clientId,
        approverId: admin.id,
        status: "APPROVED",
        decidedAt: new Date(),
        notes: `Approved by ${admin.email}`,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "CLIENT_APPROVED",
        entity: "User",
        entityId: clientId,
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/approvals");
}

export async function rejectClientAction(formData: FormData) {
  const admin = await requireAdmin();
  const clientId = String(formData.get("clientId") ?? "");

  if (!clientId) {
    return;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: clientId },
      data: { approvalStatus: "REJECTED" },
    }),
    prisma.clientApproval.create({
      data: {
        clientId,
        approverId: admin.id,
        status: "REJECTED",
        decidedAt: new Date(),
        notes: `Rejected by ${admin.email}`,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "ACCESS_REVOKED",
        entity: "User",
        entityId: clientId,
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/approvals");
}
