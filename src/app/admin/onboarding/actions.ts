"use server";

import { requireAdminAccess, canManageEmployees } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";

function requireOnboardingAccess() {
  return requireAdminAccess("/admin/onboarding");
}

// ── Get onboarding data ─────────────────────────────────────────────────────

export async function getOnboardingData(staffId?: string) {
  try {
    await requireOnboardingAccess();

    const [staff, tasks] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ["STAFF", "ADMIN"] }, approvalStatus: "APPROVED" },
        select: { id: true, name: true, email: true, staffRole: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.onboardingTask.findMany({
        where: staffId ? { staffId } : {},
        include: { staff: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return { success: true, staff, tasks };
  } catch (error) {
    console.error("getOnboardingData:", error);
    return { success: false, error: "Failed to load onboarding data", staff: [], tasks: [] };
  }
}

// ── Get onboarding summary per staff member ──────────────────────────────────

export async function getOnboardingSummary() {
  try {
    await requireOnboardingAccess();

    const staff = await prisma.user.findMany({
      where: { role: { in: ["STAFF", "ADMIN"] }, approvalStatus: "APPROVED" },
      select: {
        id: true,
        name: true,
        staffRole: true,
        createdAt: true,
        onboardingTasks: {
          select: { id: true, status: true, completedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const summary = staff.map((s) => {
      const total = s.onboardingTasks.length;
      const completed = s.onboardingTasks.filter((t) => t.status === "COMPLETED").length;
      const pending = s.onboardingTasks.filter((t) => t.status === "PENDING").length;
      return {
        ...s,
        totalTasks: total,
        completedTasks: completed,
        pendingTasks: pending,
        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });

    return { success: true, summary };
  } catch (error) {
    console.error("getOnboardingSummary:", error);
    return { success: false, error: "Failed to load summary", summary: [] };
  }
}

// ── Create onboarding tasks for a staff member ──────────────────────────────

export async function createOnboardingTasks(
  staffId: string,
  tasks: Array<{ title: string; description?: string; category?: string }>
) {
  try {
    const admin = await requireOnboardingAccess();
    if (!canManageEmployees(admin)) {
      return { success: false, error: "You do not have permission" };
    }

    const staff = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staff) return { success: false, error: "Staff member not found" };

    const created = await prisma.onboardingTask.createMany({
      data: tasks.map((t) => ({
        staffId,
        title: t.title,
        description: t.description ?? null,
        category: t.category ?? "general",
        status: "PENDING",
      })),
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "ONBOARDING_COMPLETED",
        entity: "OnboardingTask",
        entityId: staffId,
        metadata: { action: "TASKS_CREATED", count: created.count, createdBy: admin.email },
      },
    });

    return { success: true, count: created.count };
  } catch (error) {
    console.error("createOnboardingTasks:", error);
    return { success: false, error: "Failed to create onboarding tasks" };
  }
}

// ── Toggle task status ──────────────────────────────────────────────────────

export async function toggleTaskStatus(taskId: string, status: "COMPLETED" | "PENDING" | "SKIPPED") {
  try {
    const admin = await requireOnboardingAccess();

    const task = await prisma.onboardingTask.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, error: "Task not found" };

    const updated = await prisma.onboardingTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });

    return { success: true, task: updated };
  } catch (error) {
    console.error("toggleTaskStatus:", error);
    return { success: false, error: "Failed to update task" };
  }
}

// ── Delete an onboarding task ───────────────────────────────────────────────

export async function deleteOnboardingTask(taskId: string) {
  try {
    const admin = await requireOnboardingAccess();
    if (!canManageEmployees(admin)) {
      return { success: false, error: "You do not have permission" };
    }

    await prisma.onboardingTask.delete({ where: { id: taskId } });
    return { success: true };
  } catch (error) {
    console.error("deleteOnboardingTask:", error);
    return { success: false, error: "Failed to delete task" };
  }
}

// ── Delete all onboarding tasks for a staff member ──────────────────────────

export async function resetStaffOnboarding(staffId: string) {
  try {
    const admin = await requireOnboardingAccess();
    if (!canManageEmployees(admin)) {
      return { success: false, error: "You do not have permission" };
    }

    await prisma.onboardingTask.deleteMany({ where: { staffId } });
    return { success: true };
  } catch (error) {
    console.error("resetStaffOnboarding:", error);
    return { success: false, error: "Failed to reset onboarding" };
  }
}
