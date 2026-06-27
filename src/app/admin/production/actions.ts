"use server";

import type { ProjectStage, TaskStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ── Project ───────────────────────────────────────────────────────────────────

/** Create a project for a confirmed booking */
export async function createProjectAction(
  bookingId: string,
  data: { shootDate?: string; editDueDate?: string; notes?: string }
) {
  try {
    await requireAdmin();

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
    await requireAdmin();

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
    await requireAdmin();

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
    const admin = await requireAdmin();

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
    await requireAdmin();

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
    await requireAdmin();

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
    await requireAdmin();
    await prisma.staffAssignment.delete({ where: { id: assignmentId } });
    return { success: true };
  } catch (error) {
    console.error("Failed to remove assignment:", error);
    return { success: false, error: "Failed to remove assignment" };
  }
}

export async function getStaffMembers() {
  try {
    await requireAdmin();
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
    await requireAdmin();

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
    await requireAdmin();

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
    await requireAdmin();
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
    const admin = await requireAdmin();

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
    await requireAdmin();
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
    await requireAdmin();

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
    await requireAdmin();

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
