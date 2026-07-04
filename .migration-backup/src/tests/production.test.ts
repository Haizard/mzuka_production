/**
 * Phase 3 — Production Management tests
 *
 * Covers every CRUD operation directly via the Prisma client:
 *   Project (create, read, update stage, update dates, stats, calendar, delivery)
 *   StaffAssignment (assign, duplicate guard, remove)
 *   ProjectTask (create, read, update status, delete)
 *   ProjectNote (add, read, delete)
 *   ClientCommunication (log, read)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  db,
  createTestUser,
  createTestPackage,
  createTestBooking,
  cleanupUser,
  cleanupBooking,
  cleanupPackage,
} from "./helpers";

// ── Shared fixtures ───────────────────────────────────────────────────────────

let clientId  = "";
let adminId   = "";
let staffId   = "";
let packageId = "";
let bookingId = "";
const projectIds: string[] = [];
const extraBookingIds: string[] = []; // bookings created inside tests

async function cleanupProject(id: string) {
  await db.clientCommunication.deleteMany({ where: { projectId: id } });
  await db.projectNote.deleteMany({ where: { projectId: id } });
  await db.projectTask.deleteMany({ where: { projectId: id } });
  await db.staffAssignment.deleteMany({ where: { projectId: id } });
  await db.project.deleteMany({ where: { id } });
}

beforeAll(async () => {
  const client = await createTestUser({ role: "CLIENT",  approvalStatus: "APPROVED" });
  clientId = client.id;
  const admin  = await createTestUser({ role: "ADMIN",   approvalStatus: "APPROVED" });
  adminId  = admin.id;
  const staff  = await createTestUser({ role: "STAFF",   approvalStatus: "APPROVED" });
  staffId  = staff.id;
  const pkg    = await createTestPackage({ priceCents: 60000 });
  packageId    = pkg.id;
  const booking = await createTestBooking(clientId, packageId);
  bookingId    = booking.id;
});

afterAll(async () => {
  // Batch-delete all related child rows first, then projects, then bookings
  if (projectIds.length > 0) {
    await db.clientCommunication.deleteMany({ where: { projectId: { in: projectIds } } });
    await db.projectNote.deleteMany({ where: { projectId: { in: projectIds } } });
    await db.projectTask.deleteMany({ where: { projectId: { in: projectIds } } });
    await db.staffAssignment.deleteMany({ where: { projectId: { in: projectIds } } });
    await db.project.deleteMany({ where: { id: { in: projectIds } } });
  }
  // Clean extra bookings created inline
  for (const id of extraBookingIds) await cleanupBooking(id);
  await cleanupBooking(bookingId);
  await cleanupPackage(packageId);
  await cleanupUser(staffId);
  await cleanupUser(adminId);
  await cleanupUser(clientId);
}, 60000);

// ── Helper ────────────────────────────────────────────────────────────────────

async function makeProject(overrides: {
  shootDate?: Date;
  editDueDate?: Date;
  notes?: string;
} = {}) {
  const b = await createTestBooking(clientId, packageId);
  extraBookingIds.push(b.id);
  const p = await db.project.create({
    data: {
      bookingId: b.id,
      stage: "SHOOTING",
      ...overrides,
    },
  });
  projectIds.push(p.id);
  return { project: p, booking: b };
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT
// ─────────────────────────────────────────────────────────────────────────────

describe("Project — Create", () => {
  it("creates a project linked to a booking", async () => {
    const { project } = await makeProject({ notes: "Wedding in Nairobi" });

    expect(project.id).toBeTruthy();
    expect(project.bookingId).toBeTruthy();
    expect(project.stage).toBe("SHOOTING");
    expect(project.notes).toBe("Wedding in Nairobi");
    expect(project.deliveredAt).toBeNull();
  });

  it("creates a project with shoot and edit-due dates", async () => {
    const shootDate   = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const editDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const { project } = await makeProject({ shootDate, editDueDate });

    expect(project.shootDate).not.toBeNull();
    expect(project.editDueDate).not.toBeNull();
  });

  it("prevents two projects for the same booking", async () => {
    // bookingId already has a project from beforeAll scope? No — we use fresh bookings.
    // Create a booking and a project, then try again.
    const b = await createTestBooking(clientId, packageId);
    extraBookingIds.push(b.id);

    const p = await db.project.create({ data: { bookingId: b.id, stage: "SHOOTING" } });
    projectIds.push(p.id);

    await expect(
      db.project.create({ data: { bookingId: b.id, stage: "EDITING" } })
    ).rejects.toThrow(); // unique constraint on bookingId
  });
});

describe("Project — Read", () => {
  let projectId = "";

  beforeAll(async () => {
    const { project } = await makeProject();
    projectId = project.id;
  });

  it("reads a project by id with booking relation", async () => {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { booking: { include: { client: true } } },
    });
    expect(project).not.toBeNull();
    expect(project!.booking.client.id).toBe(clientId);
  });

  it("reads all projects ordered by createdAt desc", async () => {
    const projects = await db.project.findMany({ orderBy: { createdAt: "desc" } });
    expect(projects.length).toBeGreaterThanOrEqual(1);
  });

  it("filters projects by stage", async () => {
    const shooting = await db.project.findMany({ where: { stage: "SHOOTING" } });
    expect(shooting.every((p) => p.stage === "SHOOTING")).toBe(true);
  });
});

describe("Project — Update stage", () => {
  let projectId = "";

  beforeAll(async () => {
    const { project } = await makeProject();
    projectId = project.id;
  });

  it("advances from SHOOTING → EDITING", async () => {
    const updated = await db.project.update({ where: { id: projectId }, data: { stage: "EDITING" } });
    expect(updated.stage).toBe("EDITING");
  });

  it("advances from EDITING → REVIEW", async () => {
    const updated = await db.project.update({ where: { id: projectId }, data: { stage: "REVIEW" } });
    expect(updated.stage).toBe("REVIEW");
  });

  it("marks DELIVERED and timestamps deliveredAt", async () => {
    const updated = await db.project.update({
      where: { id: projectId },
      data: { stage: "DELIVERED", deliveredAt: new Date() },
    });
    expect(updated.stage).toBe("DELIVERED");
    expect(updated.deliveredAt).not.toBeNull();
  });
});

describe("Project — Update dates & notes", () => {
  let projectId = "";

  beforeAll(async () => {
    const { project } = await makeProject();
    projectId = project.id;
  });

  it("sets shoot date", async () => {
    const shootDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const updated = await db.project.update({ where: { id: projectId }, data: { shootDate } });
    expect(updated.shootDate).not.toBeNull();
  });

  it("updates notes", async () => {
    const updated = await db.project.update({
      where: { id: projectId },
      data: { notes: "Updated production notes" },
    });
    expect(updated.notes).toBe("Updated production notes");
  });

  it("clears edit due date (set to null)", async () => {
    // Set first
    await db.project.update({
      where: { id: projectId },
      data: { editDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
    });
    // Then clear
    const cleared = await db.project.update({ where: { id: projectId }, data: { editDueDate: null } });
    expect(cleared.editDueDate).toBeNull();
  });
});

describe("Project — Stats", () => {
  it("counts projects by stage", async () => {
    const total     = await db.project.count();
    const shooting  = await db.project.count({ where: { stage: "SHOOTING" } });
    const delivered = await db.project.count({ where: { stage: "DELIVERED" } });
    expect(total).toBeGreaterThanOrEqual(0);
    expect(shooting + delivered).toBeLessThanOrEqual(total);
  });

  it("counts overdue projects (editDueDate in past, not delivered/archived)", async () => {
    const overdue = await db.project.count({
      where: {
        editDueDate: { lt: new Date() },
        stage: { notIn: ["DELIVERED", "ARCHIVED"] },
      },
    });
    expect(overdue).toBeGreaterThanOrEqual(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STAFF ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────

describe("StaffAssignment — CRUD", () => {
  let projectId = "";

  beforeAll(async () => {
    const { project } = await makeProject();
    projectId = project.id;
  });

  it("assigns a staff member to a project", async () => {
    const assignment = await db.staffAssignment.create({
      data: { projectId, staffId, role: "Photographer" },
      include: { staff: { select: { id: true, name: true } } },
    });
    expect(assignment.id).toBeTruthy();
    expect(assignment.staffId).toBe(staffId);
    expect(assignment.role).toBe("Photographer");
  });

  it("prevents duplicate assignment — enforced in action layer (DB allows it, action checks first)", async () => {
    // The DB itself has no unique constraint on (projectId, staffId).
    // Duplicate prevention is handled in assignStaffAction before creating.
    // Test: verify findFirst correctly detects an existing assignment.
    const existing = await db.staffAssignment.findFirst({ where: { projectId, staffId } });
    expect(existing).not.toBeNull(); // assignment from previous test exists
  });

  it("reads all assignments for a project", async () => {
    const assignments = await db.staffAssignment.findMany({
      where: { projectId },
      include: { staff: { select: { id: true, name: true } } },
    });
    expect(assignments.length).toBeGreaterThanOrEqual(1);
    expect(assignments[0].staff.id).toBe(staffId);
  });

  it("updates assignment role", async () => {
    const assignment = await db.staffAssignment.findFirst({ where: { projectId, staffId } });
    const updated = await db.staffAssignment.update({
      where: { id: assignment!.id },
      data: { role: "Lead Videographer" },
    });
    expect(updated.role).toBe("Lead Videographer");
  });

  it("removes a staff assignment", async () => {
    // Delete ALL assignments for this staff+project to avoid leftover records
    await db.staffAssignment.deleteMany({ where: { projectId, staffId } });
    const remaining = await db.staffAssignment.findMany({ where: { projectId, staffId } });
    expect(remaining.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────────────────────────────────────────

describe("ProjectTask — CRUD", () => {
  let projectId = "";

  beforeAll(async () => {
    const { project } = await makeProject();
    projectId = project.id;
  });

  it("creates a task with TODO status", async () => {
    const task = await db.projectTask.create({
      data: { projectId, title: "Cull photos", status: "TODO" },
    });
    expect(task.id).toBeTruthy();
    expect(task.status).toBe("TODO");
    expect(task.completedAt).toBeNull();
  });

  it("creates a task with assignee and due date", async () => {
    const dueAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const task = await db.projectTask.create({
      data: {
        projectId,
        title: "Export final edits",
        status: "TODO",
        assigneeId: staffId,
        dueAt,
      },
      include: { assignee: { select: { id: true, name: true } } },
    });
    expect(task.assignee?.id).toBe(staffId);
    expect(task.dueAt).not.toBeNull();
  });

  it("reads all tasks for a project in order", async () => {
    const tasks = await db.projectTask.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
    });
    expect(tasks.length).toBeGreaterThanOrEqual(2);
  });

  it("advances status TODO → IN_PROGRESS", async () => {
    const task = await db.projectTask.findFirst({ where: { projectId, status: "TODO" } });
    const updated = await db.projectTask.update({
      where: { id: task!.id },
      data: { status: "IN_PROGRESS" },
    });
    expect(updated.status).toBe("IN_PROGRESS");
  });

  it("advances status IN_PROGRESS → DONE and sets completedAt", async () => {
    const task = await db.projectTask.findFirst({ where: { projectId, status: "IN_PROGRESS" } });
    const updated = await db.projectTask.update({
      where: { id: task!.id },
      data: { status: "DONE", completedAt: new Date() },
    });
    expect(updated.status).toBe("DONE");
    expect(updated.completedAt).not.toBeNull();
  });

  it("clears completedAt when status reverts to TODO", async () => {
    const task = await db.projectTask.findFirst({ where: { projectId, status: "DONE" } });
    const reverted = await db.projectTask.update({
      where: { id: task!.id },
      data: { status: "TODO", completedAt: null },
    });
    expect(reverted.status).toBe("TODO");
    expect(reverted.completedAt).toBeNull();
  });

  it("deletes a task", async () => {
    const task = await db.projectTask.create({
      data: { projectId, title: "Temp task to delete", status: "TODO" },
    });
    await db.projectTask.delete({ where: { id: task.id } });
    const found = await db.projectTask.findUnique({ where: { id: task.id } });
    expect(found).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL NOTES
// ─────────────────────────────────────────────────────────────────────────────

describe("ProjectNote — CRUD", () => {
  let projectId = "";

  beforeAll(async () => {
    const { project } = await makeProject();
    projectId = project.id;
  });

  it("adds an internal note", async () => {
    const note = await db.projectNote.create({
      data: { projectId, authorId: adminId, body: "Client requested extra B-roll footage." },
      include: { author: { select: { id: true, name: true } } },
    });
    expect(note.id).toBeTruthy();
    expect(note.body).toContain("B-roll");
    expect(note.author.id).toBe(adminId);
  });

  it("adds a second note and reads all in desc order", async () => {
    await db.projectNote.create({
      data: { projectId, authorId: adminId, body: "Second note added." },
    });
    const notes = await db.projectNote.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });
    expect(notes.length).toBeGreaterThanOrEqual(2);
    // Most recent first
    expect(notes[0].createdAt >= notes[1].createdAt).toBe(true);
  });

  it("deletes a note", async () => {
    const note = await db.projectNote.create({
      data: { projectId, authorId: adminId, body: "Note to delete" },
    });
    await db.projectNote.delete({ where: { id: note.id } });
    const found = await db.projectNote.findUnique({ where: { id: note.id } });
    expect(found).toBeNull();
  });

  it("cascade-deletes notes when project is deleted", async () => {
    const b = await createTestBooking(clientId, packageId);
    extraBookingIds.push(b.id);
    const p = await db.project.create({ data: { bookingId: b.id, stage: "SHOOTING" } });
    await db.projectNote.create({ data: { projectId: p.id, authorId: adminId, body: "Will cascade" } });

    await db.project.delete({ where: { id: p.id } });

    const notes = await db.projectNote.findMany({ where: { projectId: p.id } });
    expect(notes).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CLIENT COMMUNICATION
// ─────────────────────────────────────────────────────────────────────────────

describe("ClientCommunication — CRUD", () => {
  let projectId = "";

  beforeAll(async () => {
    const { project } = await makeProject();
    projectId = project.id;
  });

  it("logs an email communication", async () => {
    const comm = await db.clientCommunication.create({
      data: {
        projectId,
        userId: clientId,
        channel: "email",
        subject: "Your gallery is ready",
        body: "Hi! Your photos are ready to view.",
        sentAt: new Date(),
      },
    });
    expect(comm.id).toBeTruthy();
    expect(comm.channel).toBe("email");
    expect(comm.sentAt).not.toBeNull();
  });

  it("logs an SMS communication", async () => {
    const comm = await db.clientCommunication.create({
      data: {
        projectId,
        userId: clientId,
        channel: "sms",
        subject: "SMS",
        body: "[MG] Your booking is confirmed!",
        sentAt: new Date(),
      },
    });
    expect(comm.channel).toBe("sms");
  });

  it("reads all communications for a project ordered by createdAt desc", async () => {
    const comms = await db.clientCommunication.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });
    expect(comms.length).toBeGreaterThanOrEqual(2);
    expect(comms[0].user.id).toBe(clientId);
  });

  it("cascade-deletes communications when project is deleted", async () => {
    const b = await createTestBooking(clientId, packageId);
    extraBookingIds.push(b.id);
    const p = await db.project.create({ data: { bookingId: b.id, stage: "SHOOTING" } });
    await db.clientCommunication.create({
      data: { projectId: p.id, userId: clientId, channel: "email", subject: "Test", body: "cascade" },
    });
    await db.project.delete({ where: { id: p.id } });
    const comms = await db.clientCommunication.findMany({ where: { projectId: p.id } });
    expect(comms).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────────────────────────────────────────

describe("Calendar — getCalendarEvents query", () => {
  it("returns bookings scheduled in the current month", async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    // Create a booking in current month
    const b = await createTestBooking(clientId, packageId);
    extraBookingIds.push(b.id);

    const midMonth = new Date(year, month - 1, 15, 10, 0, 0);
    await db.booking.update({ where: { id: b.id }, data: { scheduledAt: midMonth, status: "CONFIRMED" } });

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59);

    const bookings = await db.booking.findMany({
      where: {
        scheduledAt: { gte: start, lte: end },
        status: { notIn: ["CANCELLED"] },
      },
    });

    expect(bookings.some((bk) => bk.id === b.id)).toBe(true);
  });

  it("excludes cancelled bookings", async () => {
    const b = await createTestBooking(clientId, packageId);
    extraBookingIds.push(b.id);

    const now = new Date();
    await db.booking.update({
      where: { id: b.id },
      data: {
        scheduledAt: new Date(now.getFullYear(), now.getMonth(), 20),
        status: "CANCELLED",
      },
    });

    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const bookings = await db.booking.findMany({
      where: { scheduledAt: { gte: start, lte: end }, status: { notIn: ["CANCELLED"] } },
    });
    expect(bookings.every((bk) => bk.status !== "CANCELLED")).toBe(true);
  });

  it("returns projects with shoot dates in the current month", async () => {
    const now = new Date();
    const b = await createTestBooking(clientId, packageId);
    extraBookingIds.push(b.id);

    const shootDate = new Date(now.getFullYear(), now.getMonth(), 10);
    const p = await db.project.create({
      data: { bookingId: b.id, stage: "SHOOTING", shootDate },
    });
    projectIds.push(p.id);

    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const projects = await db.project.findMany({
      where: { OR: [{ shootDate: { gte: start, lte: end } }, { editDueDate: { gte: start, lte: end } }] },
    });
    expect(projects.some((pr) => pr.id === p.id)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY STATUS
// ─────────────────────────────────────────────────────────────────────────────

describe("Delivery Status", () => {
  it("marks a project as delivered", async () => {
    const { project } = await makeProject();
    const delivered = await db.project.update({
      where: { id: project.id },
      data: { stage: "DELIVERED", deliveredAt: new Date() },
    });
    expect(delivered.stage).toBe("DELIVERED");
    expect(delivered.deliveredAt).not.toBeNull();
  });

  it("counts delivered vs pending projects", async () => {
    const [delivered, pending] = await Promise.all([
      db.project.count({ where: { stage: "DELIVERED" } }),
      db.project.count({ where: { stage: { notIn: ["DELIVERED", "ARCHIVED"] } } }),
    ]);
    expect(delivered).toBeGreaterThanOrEqual(0);
    expect(pending).toBeGreaterThanOrEqual(0);
  });

  it("reads delivery data with gallery and payment info", async () => {
    const { project } = await makeProject();
    const full = await db.project.findUnique({
      where: { id: project.id },
      include: {
        booking: {
          include: {
            client: { select: { id: true, name: true, email: true } },
            payments: { select: { status: true, amountCents: true } },
            gallery: {
              select: {
                id: true,
                isDownloadOpen: true,
                expiresAt: true,
                mediaAssets: { select: { id: true, releaseStatus: true } },
              },
            },
          },
        },
      },
    });
    expect(full).not.toBeNull();
    expect(full!.booking.client.email).toBeTruthy();
    // gallery may or may not exist — just check the shape
    expect(Array.isArray(full!.booking.payments)).toBe(true);
  });

  it("overdue query correctly excludes delivered projects", async () => {
    // Create a project with an editDueDate in the past but mark it DELIVERED
    const b = await createTestBooking(clientId, packageId);
    extraBookingIds.push(b.id);

    const p = await db.project.create({
      data: {
        bookingId: b.id,
        stage: "DELIVERED",
        deliveredAt: new Date(),
        editDueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      },
    });
    projectIds.push(p.id);

    const overdue = await db.project.findMany({
      where: {
        id: p.id,
        editDueDate: { lt: new Date() },
        stage: { notIn: ["DELIVERED", "ARCHIVED"] },
      },
    });
    // Should NOT appear in overdue because it's DELIVERED
    expect(overdue).toHaveLength(0);
  });
});
