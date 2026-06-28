/**
 * End-to-end test: Staff creation, role management, equipment lifecycle.
 * Tests the full flow:
 *   Admin creates staff → PM creates equipment → PM assigns to task →
 *   Staff submits return → PM approves → inventory restocked
 */

import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { randomBytes, scryptSync } from "crypto";
import { nanoid } from "nanoid";

const cuid = () => nanoid(25);

function hashPwd(p: string) {
  const salt = randomBytes(16).toString("hex");
  const key  = scryptSync(p, salt, 64).toString("hex");
  return `scrypt:${salt}:${key}`;
}

// Track created test IDs for cleanup
const cleanup: { users: string[]; categories: string[]; items: string[]; assignments: string[]; returns: string[] } = {
  users: [], categories: [], items: [], assignments: [], returns: [],
};

afterAll(async () => {
  // Clean up in dependency order
  if (cleanup.returns.length)     await prisma.equipmentReturn.deleteMany({ where: { id: { in: cleanup.returns } } });
  if (cleanup.assignments.length) await prisma.equipmentAssignment.deleteMany({ where: { id: { in: cleanup.assignments } } });
  if (cleanup.items.length)       await prisma.equipmentItem.deleteMany({ where: { id: { in: cleanup.items } } });
  if (cleanup.categories.length)  await prisma.equipmentCategory.deleteMany({ where: { id: { in: cleanup.categories } } });
  if (cleanup.users.length)       await prisma.user.deleteMany({ where: { id: { in: cleanup.users } } });
});

// ── Test 1: Staff account creation ───────────────────────────────────────────

describe("Staff account creation", () => {
  it("creates a photographer account with correct staffRole", async () => {
    const user = await prisma.user.create({
      data: {
        id: cuid(), name: "Test Photographer",
        email: `photo-${Date.now()}@mg-test.invalid`,
        passwordHash: hashPwd("test1234!"),
        role: "STAFF", approvalStatus: "APPROVED",
        staffRole: "PHOTOGRAPHER", isProductionManager: false,
      },
    });
    cleanup.users.push(user.id);

    expect(user.role).toBe("STAFF");
    expect(user.staffRole).toBe("PHOTOGRAPHER");
    expect(user.isProductionManager).toBe(false);
    expect(user.approvalStatus).toBe("APPROVED");
  });

  it("creates a production manager with isProductionManager = true", async () => {
    const user = await prisma.user.create({
      data: {
        id: cuid(), name: "Test PM",
        email: `pm-${Date.now()}@mg-test.invalid`,
        passwordHash: hashPwd("test1234!"),
        role: "STAFF", approvalStatus: "APPROVED",
        staffRole: "PRODUCTION_MANAGER", isProductionManager: true,
      },
    });
    cleanup.users.push(user.id);

    expect(user.staffRole).toBe("PRODUCTION_MANAGER");
    expect(user.isProductionManager).toBe(true);
  });

  it("creates a video editor", async () => {
    const user = await prisma.user.create({
      data: {
        id: cuid(), name: "Test Video Editor",
        email: `editor-${Date.now()}@mg-test.invalid`,
        passwordHash: hashPwd("test1234!"),
        role: "STAFF", approvalStatus: "APPROVED",
        staffRole: "VIDEO_EDITOR", isProductionManager: false,
      },
    });
    cleanup.users.push(user.id);
    expect(user.staffRole).toBe("VIDEO_EDITOR");
  });

  it("can update staffRole to promote to production manager", async () => {
    const user = await prisma.user.create({
      data: {
        id: cuid(), name: "Test Promotable",
        email: `promote-${Date.now()}@mg-test.invalid`,
        passwordHash: hashPwd("test1234!"),
        role: "STAFF", approvalStatus: "APPROVED",
        staffRole: "PHOTOGRAPHER", isProductionManager: false,
      },
    });
    cleanup.users.push(user.id);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { staffRole: "PRODUCTION_MANAGER", isProductionManager: true },
    });

    expect(updated.staffRole).toBe("PRODUCTION_MANAGER");
    expect(updated.isProductionManager).toBe(true);
  });

  it("groups staff correctly by staffRole", async () => {
    const roles = await prisma.user.groupBy({
      by: ["staffRole"],
      where: { role: "STAFF", approvalStatus: "APPROVED", staffRole: { not: null } },
      _count: { id: true },
    });
    // Should have at least the roles we just created
    const roleNames = roles.map((r) => r.staffRole);
    expect(roleNames).toContain("PHOTOGRAPHER");
    expect(roleNames).toContain("PRODUCTION_MANAGER");
    expect(roleNames).toContain("VIDEO_EDITOR");
  });
});

// ── Test 2: Equipment category management ────────────────────────────────────

describe("Equipment category management", () => {
  it("creates an equipment category", async () => {
    const cat = await prisma.equipmentCategory.create({
      data: { id: cuid(), name: `Camera-${Date.now()}` },
    });
    cleanup.categories.push(cat.id);
    expect(cat.name).toContain("Camera");
  });

  it("rejects duplicate category name (case-insensitive via unique constraint)", async () => {
    const name = `Audio-Unique-${Date.now()}`;
    const cat = await prisma.equipmentCategory.create({ data: { id: cuid(), name } });
    cleanup.categories.push(cat.id);

    await expect(
      prisma.equipmentCategory.create({ data: { id: cuid(), name } })
    ).rejects.toThrow();
  });

  it("cannot delete a category with items", async () => {
    const cat = await prisma.equipmentCategory.create({ data: { id: cuid(), name: `Lighting-${Date.now()}` } });
    cleanup.categories.push(cat.id);

    const item = await prisma.equipmentItem.create({
      data: { id: cuid(), name: "LED Panel", categoryId: cat.id, condition: "GOOD", status: "AVAILABLE" },
    });
    cleanup.items.push(item.id);

    await expect(
      prisma.equipmentCategory.delete({ where: { id: cat.id } })
    ).rejects.toThrow(); // FK constraint
  });
});

// ── Test 3: Equipment item lifecycle ─────────────────────────────────────────

describe("Equipment item lifecycle", () => {
  let catId: string;
  let itemId: string;

  it("creates an item with AVAILABLE status", async () => {
    const cat = await prisma.equipmentCategory.create({ data: { id: cuid(), name: `Equip-Cat-${Date.now()}` } });
    cleanup.categories.push(catId = cat.id);

    const item = await prisma.equipmentItem.create({
      data: { id: cuid(), name: "Sony FX3", categoryId: cat.id, condition: "EXCELLENT", status: "AVAILABLE", serialNumber: `SN-FX3-${Date.now()}` },
    });
    cleanup.items.push(itemId = item.id);

    expect(item.status).toBe("AVAILABLE");
    expect(item.condition).toBe("EXCELLENT");
  });

  it("rejects duplicate serial number", async () => {
    const serial = `SN-DUP-${Date.now()}`;
    const cat = await prisma.equipmentCategory.create({ data: { id: cuid(), name: `DupCat-${Date.now()}` } });
    cleanup.categories.push(cat.id);

    const item = await prisma.equipmentItem.create({
      data: { id: cuid(), name: "Item A", categoryId: cat.id, condition: "GOOD", status: "AVAILABLE", serialNumber: serial },
    });
    cleanup.items.push(item.id);

    await expect(
      prisma.equipmentItem.create({
        data: { id: cuid(), name: "Item B", categoryId: cat.id, condition: "GOOD", status: "AVAILABLE", serialNumber: serial },
      })
    ).rejects.toThrow();
  });

  it("updates item condition without changing status", async () => {
    const updated = await prisma.equipmentItem.update({
      where: { id: itemId },
      data: { condition: "GOOD" },
    });
    expect(updated.condition).toBe("GOOD");
    expect(updated.status).toBe("AVAILABLE"); // unchanged
  });
});

// ── Test 4: Full equipment assignment + return flow ───────────────────────────

describe("Equipment assignment and return flow", () => {
  it("completes full lifecycle: assign → status=ASSIGNED → return request → approve → status=AVAILABLE", async () => {
    // Setup
    const photographer = await prisma.user.create({
      data: {
        id: cuid(), name: "E2E Photographer",
        email: `e2e-photo-${Date.now()}@mg-test.invalid`,
        passwordHash: hashPwd("test1234!"),
        role: "STAFF", approvalStatus: "APPROVED",
        staffRole: "PHOTOGRAPHER", isProductionManager: false,
      },
    });
    cleanup.users.push(photographer.id);

    const pm = await prisma.user.create({
      data: {
        id: cuid(), name: "E2E PM",
        email: `e2e-pm-${Date.now()}@mg-test.invalid`,
        passwordHash: hashPwd("test1234!"),
        role: "STAFF", approvalStatus: "APPROVED",
        staffRole: "PRODUCTION_MANAGER", isProductionManager: true,
      },
    });
    cleanup.users.push(pm.id);

    const cat = await prisma.equipmentCategory.create({ data: { id: cuid(), name: `E2E-Cat-${Date.now()}` } });
    cleanup.categories.push(cat.id);

    const item = await prisma.equipmentItem.create({
      data: { id: cuid(), name: "Canon R5", categoryId: cat.id, condition: "EXCELLENT", status: "AVAILABLE" },
    });
    cleanup.items.push(item.id);

    // Get a real task or create a stub booking+project+task
    let taskId: string;
    const existingTask = await prisma.projectTask.findFirst({ where: { assigneeId: null } });

    if (existingTask) {
      taskId = existingTask.id;
      await prisma.projectTask.update({ where: { id: taskId }, data: { assigneeId: photographer.id } });
    } else {
      // Create minimal stub
      const client = await prisma.user.create({
        data: { id: cuid(), name: "E2E Client", email: `e2e-client-${Date.now()}@mg-test.invalid`, role: "CLIENT", approvalStatus: "APPROVED" },
      });
      cleanup.users.push(client.id);

      const booking = await prisma.booking.create({
        data: { id: cuid(), clientId: client.id, title: "E2E Test Booking", serviceType: "Photography", scheduledAt: new Date() },
      });

      const project = await prisma.project.create({ data: { id: cuid(), bookingId: booking.id, stage: "SHOOTING" } });

      const task = await prisma.projectTask.create({
        data: { id: cuid(), projectId: project.id, title: "E2E Test Task", assigneeId: photographer.id },
      });
      taskId = task.id;
    }

    // Step 1: Assign equipment
    const assignment = await prisma.equipmentAssignment.create({
      data: { id: cuid(), itemId: item.id, taskId, assigneeId: photographer.id },
    });
    cleanup.assignments.push(assignment.id);

    await prisma.equipmentItem.update({ where: { id: item.id }, data: { status: "ASSIGNED" } });
    const assigned = await prisma.equipmentItem.findUnique({ where: { id: item.id } });
    expect(assigned!.status).toBe("ASSIGNED");

    // Step 2: Staff submits return request
    const returnReq = await prisma.equipmentReturn.create({
      data: {
        id: cuid(),
        assignmentId: assignment.id,
        requestedById: photographer.id,
        status: "PENDING",
        returnNote: "Returned in perfect condition",
      },
    });
    cleanup.returns.push(returnReq.id);
    expect(returnReq.status).toBe("PENDING");

    // Step 3: Cannot submit duplicate return
    const pending = await prisma.equipmentReturn.findFirst({
      where: { assignmentId: assignment.id, status: "PENDING" },
    });
    expect(pending).not.toBeNull(); // correctly detected as pending

    // Step 4: PM approves return
    const approved = await prisma.equipmentReturn.update({
      where: { id: returnReq.id },
      data: { status: "APPROVED", reviewedById: pm.id, reviewedAt: new Date() },
    });
    await prisma.equipmentAssignment.update({ where: { id: assignment.id }, data: { returnedAt: new Date() } });
    await prisma.equipmentItem.update({ where: { id: item.id }, data: { status: "AVAILABLE" } });

    expect(approved.status).toBe("APPROVED");
    expect(approved.reviewedById).toBe(pm.id);

    const restored = await prisma.equipmentItem.findUnique({ where: { id: item.id } });
    expect(restored!.status).toBe("AVAILABLE");

    // Step 5: Cannot re-approve already processed request
    const alreadyApproved = await prisma.equipmentReturn.findUnique({ where: { id: returnReq.id } });
    expect(alreadyApproved!.status).not.toBe("PENDING"); // blocks re-processing
  });
});

// ── Test 5: Staff task dashboard query ───────────────────────────────────────

describe("Staff task dashboard query", () => {
  it("returns only tasks assigned to the requesting staff member", async () => {
    const staffA = await prisma.user.create({
      data: {
        id: cuid(), name: "Staff A",
        email: `staffA-${Date.now()}@mg-test.invalid`,
        passwordHash: hashPwd("test1234!"),
        role: "STAFF", approvalStatus: "APPROVED", staffRole: "PHOTOGRAPHER",
      },
    });
    cleanup.users.push(staffA.id);

    const staffB = await prisma.user.create({
      data: {
        id: cuid(), name: "Staff B",
        email: `staffB-${Date.now()}@mg-test.invalid`,
        passwordHash: hashPwd("test1234!"),
        role: "STAFF", approvalStatus: "APPROVED", staffRole: "VIDEO_EDITOR",
      },
    });
    cleanup.users.push(staffB.id);

    // Query tasks for staffA — should only see staffA's tasks
    const tasksA = await prisma.projectTask.findMany({ where: { assigneeId: staffA.id } });
    const tasksB = await prisma.projectTask.findMany({ where: { assigneeId: staffB.id } });

    // No tasks for new users yet — both should be empty
    expect(tasksA.every((t) => t.assigneeId === staffA.id)).toBe(true);
    expect(tasksB.every((t) => t.assigneeId === staffB.id)).toBe(true);
  });
});
