"use server";

import type { ProjectStage, TaskStatus } from "@prisma/client";
import { requireAdminAccess, requireAnyAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";

function requireProductionAccess() {
  return requireAdminAccess("/admin/production");
}

function requireCalendarAccess() {
  return requireAdminAccess("/admin/production/calendar");
}

function requireDeliveryAccess() {
  return requireAdminAccess("/admin/production/delivery");
}

function requireProductionStatsAccess() {
  return requireAnyAdminAccess(["/admin/production", "/admin/reports"]);
}

// ── Project ───────────────────────────────────────────────────────────────────

/** Create a project for a confirmed booking */
export async function createProjectAction(
  bookingId: string,
  data: { shootDate?: string; editDueDate?: string; notes?: string }
) {
  try {
    await requireProductionAccess();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { project: true },
    });
    if (!booking) return { success: false, error: "Booking not found" };
    if (booking.project) return { success: false, error: "Project already exists for this booking" };

    const project = await prisma.project.create({
      data: {
        bookingId,
        stage: "SHOOTING",
        shootDate: data.shootDate ? new Date(data.shootDate) : undefined,
        editDueDate: data.editDueDate ? new Date(data.editDueDate) : undefined,
        notes: data.notes,
      },
      include: { booking: { include: { client: true, package: true } } },
    });

    return { success: true, project };
  } catch (error) {
    console.error("Failed to create project:", error);
    return { success: false, error: "Failed to create project" };
  }
}

/** Get all projects — production dashboard */
export async function getAllProjects() {
  try {
    await requireProductionAccess();

    const projects = await prisma.project.findMany({
      include: {
        booking: {
          include: {
            client: { select: { id: true, name: true, email: true, phone: true } },
            package: true,
            gallery: { select: { id: true, mediaAssets: { select: { id: true } } } },
            payments: true,
          },
        },
        assignments: {
          include: { staff: { select: { id: true, name: true, role: true } } },
        },
        tasks: { orderBy: { createdAt: "asc" } },
        internalNotes: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, projects };
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return { success: false, error: "Failed to load projects", projects: [] };
  }
}

/** Get a single project with full detail */
export async function getProjectById(projectId: string) {
  try {
    await requireProductionAccess();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        booking: {
          include: {
            client: true,
            package: true,
            gallery: { include: { mediaAssets: true } },
            payments: true,
            reminders: true,
          },
        },
        assignments: {
          include: { staff: { select: { id: true, name: true, email: true, role: true } } },
        },
        tasks: {
          include: { assignee: { select: { id: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
        internalNotes: {
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: "desc" },
        },
        communications: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) return { success: false, error: "Project not found", project: null };
    return { success: true, project };
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return { success: false, error: "Failed to load project", project: null };
  }
}

/** Advance project to next pipeline stage */
export async function updateProjectStageAction(projectId: string, stage: ProjectStage) {
  try {
    const admin = await requireProductionAccess();

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        stage,
        deliveredAt: stage === "DELIVERED" ? new Date() : undefined,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "BOOKING_UPDATED",
        entity: "Project",
        entityId: projectId,
        metadata: { newStage: stage },
      },
    });

    return { success: true, project: updated };
  } catch (error) {
    console.error("Failed to update project stage:", error);
    return { success: false, error: "Failed to update stage" };
  }
}

/** Update project dates / notes */
export async function updateProjectAction(
  projectId: string,
  data: { shootDate?: string | null; editDueDate?: string | null; notes?: string }
) {
  try {
    await requireProductionAccess();

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        shootDate: data.shootDate ? new Date(data.shootDate) : data.shootDate === null ? null : undefined,
        editDueDate: data.editDueDate ? new Date(data.editDueDate) : data.editDueDate === null ? null : undefined,
        notes: data.notes,
      },
    });

    return { success: true, project: updated };
  } catch (error) {
    console.error("Failed to update project:", error);
    return { success: false, error: "Failed to update project" };
  }
}

// ── Staff assignment ──────────────────────────────────────────────────────────

export async function assignStaffAction(projectId: string, staffId: string, role: string) {
  try {
    await requireProductionAccess();

    // Prevent duplicates
    const existing = await prisma.staffAssignment.findFirst({
      where: { projectId, staffId },
    });
    if (existing) return { success: false, error: "Staff already assigned" };

    const assignment = await prisma.staffAssignment.create({
      data: { projectId, staffId, role },
      include: { staff: { select: { id: true, name: true, role: true } } },
    });

    return { success: true, assignment };
  } catch (error) {
    console.error("Failed to assign staff:", error);
    return { success: false, error: "Failed to assign staff" };
  }
}

export async function removeStaffAssignmentAction(assignmentId: string) {
  try {
    await requireProductionAccess();
    await prisma.staffAssignment.delete({ where: { id: assignmentId } });
    return { success: true };
  } catch (error) {
    console.error("Failed to remove assignment:", error);
    return { success: false, error: "Failed to remove assignment" };
  }
}

export async function getStaffMembers() {
  try {
    await requireProductionAccess();
    const staff = await prisma.user.findMany({
      where: { role: { in: ["FOUNDER", "ADMIN", "STAFF"] }, approvalStatus: "APPROVED" },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
    return { success: true, staff };
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return { success: false, error: "Failed to load staff", staff: [] };
  }
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function createTaskAction(
  projectId: string,
  data: { title: string; description?: string; assigneeId?: string; dueAt?: string }
) {
  try {
    await requireProductionAccess();

    const task = await prisma.projectTask.create({
      data: {
        projectId,
        title: data.title,
        description: data.description,
        assigneeId: data.assigneeId || null,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        status: "TODO",
      },
      include: { assignee: { select: { id: true, name: true } } },
    });

    return { success: true, task };
  } catch (error) {
    console.error("Failed to create task:", error);
    return { success: false, error: "Failed to create task" };
  }
}

export async function updateTaskStatusAction(taskId: string, status: TaskStatus) {
  try {
    await requireProductionAccess();

    const task = await prisma.projectTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === "DONE" ? new Date() : null,
      },
    });

    return { success: true, task };
  } catch (error) {
    console.error("Failed to update task:", error);
    return { success: false, error: "Failed to update task" };
  }
}

export async function deleteTaskAction(taskId: string) {
  try {
    await requireProductionAccess();
    await prisma.projectTask.delete({ where: { id: taskId } });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete task:", error);
    return { success: false, error: "Failed to delete task" };
  }
}

// ── Internal notes ────────────────────────────────────────────────────────────

export async function addNoteAction(projectId: string, body: string) {
  try {
    const admin = await requireProductionAccess();

    const note = await prisma.projectNote.create({
      data: { projectId, authorId: admin.id, body },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    return { success: true, note };
  } catch (error) {
    console.error("Failed to add note:", error);
    return { success: false, error: "Failed to add note" };
  }
}

export async function deleteNoteAction(noteId: string) {
  try {
    await requireProductionAccess();
    await prisma.projectNote.delete({ where: { id: noteId } });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete note:", error);
    return { success: false, error: "Failed to delete note" };
  }
}

// ── Client communication log ──────────────────────────────────────────────────

export async function logCommunicationAction(
  projectId: string,
  data: { userId: string; channel: string; subject: string; body: string; sentAt?: Date }
) {
  try {
    await requireProductionAccess();

    const comm = await prisma.clientCommunication.create({
      data: {
        projectId,
        userId: data.userId,
        channel: data.channel,
        subject: data.subject,
        body: data.body,
        sentAt: data.sentAt ?? new Date(),
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return { success: true, comm };
  } catch (error) {
    console.error("Failed to log communication:", error);
    return { success: false, error: "Failed to log communication" };
  }
}

// ── Production stats ──────────────────────────────────────────────────────────

export async function getProductionStats() {
  try {
    await requireProductionStatsAccess();

    const [total, shooting, editing, review, delivered] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { stage: "SHOOTING" } }),
      prisma.project.count({ where: { stage: "EDITING" } }),
      prisma.project.count({ where: { stage: "REVIEW" } }),
      prisma.project.count({ where: { stage: "DELIVERED" } }),
    ]);

    // Overdue: editDueDate in the past and not delivered/archived
    const overdue = await prisma.project.count({
      where: {
        editDueDate: { lt: new Date() },
        stage: { notIn: ["DELIVERED", "ARCHIVED"] },
      },
    });

    return { success: true, stats: { total, shooting, editing, review, delivered, overdue } };
  } catch (error) {
    console.error("Failed to fetch production stats:", error);
    return { success: false, error: "Failed to load stats" };
  }
}

// ── Calendar ──────────────────────────────────────────────────────────────────

/**
 * Returns all bookings and projects for a given month, shaped for the calendar.
 * month is 1-indexed (1 = January).
 */
export async function getCalendarEvents(year: number, month: number) {
  try {
    await requireCalendarAccess();

    const start = new Date(year, month - 1, 1);
    const end   = new Date(year, month, 0, 23, 59, 59); // last day of month

    const [bookings, projects] = await Promise.all([
      prisma.booking.findMany({
        where: {
          scheduledAt: { gte: start, lte: end },
          status: { notIn: ["CANCELLED"] },
        },
        include: {
          client: { select: { id: true, name: true } },
          package: { select: { name: true } },
          project: { select: { id: true, stage: true } },
        },
        orderBy: { scheduledAt: "asc" },
      }),
      prisma.project.findMany({
        where: {
          OR: [
            { shootDate:   { gte: start, lte: end } },
            { editDueDate: { gte: start, lte: end } },
          ],
        },
        include: {
          booking: { select: { id: true, title: true, serviceType: true } },
        },
      }),
    ]);

    return { success: true, bookings, projects };
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return { success: false, error: "Failed to load calendar", bookings: [], projects: [] };
  }
}

// ── Delivery status ───────────────────────────────────────────────────────────

/** Mark a project as delivered and timestamp it */
export async function markDeliveredAction(projectId: string) {
  try {
    const admin = await requireDeliveryAccess();

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { stage: "DELIVERED", deliveredAt: new Date() },
      include: { booking: { include: { client: true } } },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "MEDIA_RELEASED",
        entity: "Project",
        entityId: projectId,
        metadata: { deliveredAt: project.deliveredAt },
      },
    });

    return { success: true, project };
  } catch (error) {
    console.error("Failed to mark delivered:", error);
    return { success: false, error: "Failed to mark as delivered" };
  }
}

/** Get delivery summary — all projects with delivery info */
export async function getDeliveryStatus() {
  try {
    await requireDeliveryAccess();

    const projects = await prisma.project.findMany({
      include: {
        booking: {
          include: {
            client: { select: { id: true, name: true, email: true } },
            package: { select: { name: true } },
            gallery: {
              select: {
                id: true,
                isDownloadOpen: true,
                expiresAt: true,
                mediaAssets: { select: { id: true, releaseStatus: true } },
              },
            },
            payments: { select: { status: true, amountCents: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, projects };
  } catch (error) {
    console.error("Failed to fetch delivery status:", error);
    return { success: false, error: "Failed to load delivery status", projects: [] };
  }
}
