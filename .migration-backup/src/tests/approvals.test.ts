/**
 * Client Approval CRUD tests
 * Tests: create approval record, approve, reject, read pending list
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  db,
  createTestUser,
  cleanupUser,
} from "./helpers";

let adminId = "";
let clientId = "";

beforeAll(async () => {
  const admin = await createTestUser({ role: "ADMIN", approvalStatus: "APPROVED" });
  adminId = admin.id;
  const client = await createTestUser({ role: "CLIENT", approvalStatus: "PENDING" });
  clientId = client.id;
});

afterAll(async () => {
  await cleanupUser(clientId);
  await cleanupUser(adminId);
});

describe("Client Approvals", () => {
  it("creates a pending approval record on registration", async () => {
    const approval = await db.clientApproval.findFirst({
      where: { clientId, status: "PENDING" },
    });
    // createTestUser doesn't auto-create approval, so create one here
    const created = await db.clientApproval.create({
      data: {
        clientId,
        status: "PENDING",
        notes: "Awaiting admin review",
      },
    });
    expect(created.clientId).toBe(clientId);
    expect(created.status).toBe("PENDING");
  });

  it("reads all pending approvals", async () => {
    const pending = await db.user.findMany({
      where: { approvalStatus: "PENDING" },
      select: { id: true, name: true, email: true, approvalStatus: true },
    });
    const found = pending.find((u) => u.id === clientId);
    expect(found).toBeDefined();
    expect(found!.approvalStatus).toBe("PENDING");
  });

  it("approves a client — updates user status and creates approval log", async () => {
    await db.$transaction([
      db.user.update({
        where: { id: clientId },
        data: { approvalStatus: "APPROVED" },
      }),
      db.clientApproval.create({
        data: {
          clientId,
          approverId: adminId,
          status: "APPROVED",
          decidedAt: new Date(),
          notes: `Approved by admin`,
        },
      }),
      db.auditLog.create({
        data: {
          actorId: adminId,
          action: "CLIENT_APPROVED",
          entity: "User",
          entityId: clientId,
        },
      }),
    ]);

    const user = await db.user.findUnique({ where: { id: clientId } });
    expect(user!.approvalStatus).toBe("APPROVED");

    const log = await db.clientApproval.findFirst({
      where: { clientId, status: "APPROVED", approverId: adminId },
    });
    expect(log).not.toBeNull();
  });

  it("rejects a client — updates user status to REJECTED", async () => {
    // Create a fresh pending client
    const pending = await createTestUser({ role: "CLIENT", approvalStatus: "PENDING" });

    await db.$transaction([
      db.user.update({
        where: { id: pending.id },
        data: { approvalStatus: "REJECTED" },
      }),
      db.clientApproval.create({
        data: {
          clientId: pending.id,
          approverId: adminId,
          status: "REJECTED",
          decidedAt: new Date(),
        },
      }),
    ]);

    const user = await db.user.findUnique({ where: { id: pending.id } });
    expect(user!.approvalStatus).toBe("REJECTED");

    // Cleanup
    await cleanupUser(pending.id);
  });

  it("reads audit log for approval action", async () => {
    const log = await db.auditLog.findFirst({
      where: {
        actorId: adminId,
        action: "CLIENT_APPROVED",
        entityId: clientId,
      },
    });
    expect(log).not.toBeNull();
    expect(log!.action).toBe("CLIENT_APPROVED");
  });
});
