"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";
import { sendApprovalMessage, sendRejectionMessage } from "@/lib/messages";

export async function approveClientAction(formData: FormData) {
  const admin = await requireAdminAccess("/admin/approvals");
  const clientId = String(formData.get("clientId") ?? "");

  if (!clientId) return;

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

  // Notify client — fetch after transaction so we have fresh data
  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (client) {
    sendApprovalMessage(client).catch((err) =>
      console.error("[messages] approval send failed:", err)
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/approvals");
}

export async function rejectClientAction(formData: FormData) {
  const admin = await requireAdminAccess("/admin/approvals");
  const clientId = String(formData.get("clientId") ?? "");

  if (!clientId) return;

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

  const client = await prisma.user.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, email: true },
  });
  if (client) {
    sendRejectionMessage(client).catch((err) =>
      console.error("[messages] rejection send failed:", err)
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/approvals");
}
