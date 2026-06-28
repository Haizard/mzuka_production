"use server";

import type { EquipmentStatus, ConditionStatus } from "@prisma/client";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";

function cuid() { return nanoid(25); }

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function requireProductionManager() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const isAdmin = ["FOUNDER", "ADMIN"].includes(user.role);
  const isPM    = user.role === "STAFF" && (user as { isProductionManager?: boolean }).isProductionManager;
  if (!isAdmin && !isPM) throw new Error("Forbidden: Production Manager access required");
  return user;
}

async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (!["FOUNDER","ADMIN","STAFF"].includes(user.role)) throw new Error("Forbidden");
  return user;
}

// ── Production Manager toggle (admin only) ────────────────────────────────────

export async function toggleProductionManagerAction(staffId: string, isProductionManager: boolean) {
  try {
    await requireAdmin();
    const staff = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staff || staff.role !== "STAFF") return { success: false, error: "User must be STAFF role" };
    await prisma.user.update({ where: { id: staffId }, data: { isProductionManager } });
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle PM:", error);
    return { success: false, error: "Failed to update role" };
  }
}

// ── Equipment Categories ──────────────────────────────────────────────────────

export async function createCategoryAction(name: string) {
  try {
    await requireProductionManager();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) return { success: false, error: "Name must be 1–100 characters" };

    const existing = await prisma.equipmentCategory.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" } },
    });
    if (existing) return { success: false, error: "Category already exists" };

    const category = await prisma.equipmentCategory.create({
      data: { id: cuid(), name: trimmed },
    });
    return { success: true, category };
  } catch (error) {
    console.error("createCategory:", error);
    return { success: false, error: "Failed to create category" };
  }
}

export async function updateCategoryAction(categoryId: string, name: string) {
  try {
    await requireProductionManager();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 100) return { success: false, error: "Name must be 1–100 characters" };

    const duplicate = await prisma.equipmentCategory.findFirst({
      where: { name: { equals: trimmed, mode: "insensitive" }, NOT: { id: categoryId } },
    });
    if (duplicate) return { success: false, error: "Category name already exists" };

    const category = await prisma.equipmentCategory.update({ where: { id: categoryId }, data: { name: trimmed } });
    return { success: true, category };
  } catch (error) {
    console.error("updateCategory:", error);
    return { success: false, error: "Failed to update category" };
  }
}

export async function deleteCategoryAction(categoryId: string) {
  try {
    await requireProductionManager();
    const count = await prisma.equipmentItem.count({ where: { categoryId } });
    if (count > 0) return { success: false, error: `Cannot delete: category has ${count} equipment item(s)` };
    await prisma.equipmentCategory.delete({ where: { id: categoryId } });
    return { success: true };
  } catch (error) {
    console.error("deleteCategory:", error);
    return { success: false, error: "Failed to delete category" };
  }
}

export async function getCategoriesAction() {
  try {
    await requireStaff();
    const categories = await prisma.equipmentCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { items: true } } },
    });
    return { success: true, categories };
  } catch (error) {
    console.error("getCategories:", error);
    return { success: false, error: "Failed to load categories", categories: [] };
  }
}

// ── Equipment Items ───────────────────────────────────────────────────────────

export async function createEquipmentItemAction(data: {
  name: string; categoryId: string; condition: ConditionStatus;
  serialNumber?: string; notes?: string;
}) {
  try {
    const actor = await requireProductionManager();
    if (!data.name.trim() || data.name.length > 150) return { success: false, error: "Name must be 1–150 characters" };

    if (data.serialNumber?.trim()) {
      const dup = await prisma.equipmentItem.findUnique({ where: { serialNumber: data.serialNumber.trim() } });
      if (dup) return { success: false, error: "Serial number already exists" };
    }

    const item = await prisma.equipmentItem.create({
      data: {
        id: cuid(),
        name: data.name.trim(),
        categoryId: data.categoryId,
        condition: data.condition,
        status: "AVAILABLE",
        serialNumber: data.serialNumber?.trim() || null,
        notes: data.notes?.trim() || null,
      },
      include: { category: true },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id, action: "BOOKING_UPDATED",
        entity: "EquipmentItem", entityId: item.id,
        metadata: { action: "EQUIPMENT_CREATED", name: item.name },
      },
    });

    return { success: true, item };
  } catch (error) {
    console.error("createEquipmentItem:", error);
    return { success: false, error: "Failed to create equipment item" };
  }
}

export async function updateEquipmentItemAction(itemId: string, data: {
  name?: string; condition?: ConditionStatus; status?: EquipmentStatus; notes?: string;
}) {
  try {
    const actor = await requireProductionManager();

    if (data.status && ["UNDER_MAINTENANCE","RETIRED"].includes(data.status)) {
      const activeAssignment = await prisma.equipmentAssignment.findFirst({
        where: { itemId, returnedAt: null },
      });
      if (activeAssignment) return { success: false, error: "Cannot change status: item is currently assigned" };
    }

    const prevItem = await prisma.equipmentItem.findUnique({ where: { id: itemId } });

    const item = await prisma.equipmentItem.update({
      where: { id: itemId },
      data: {
        ...(data.name      ? { name: data.name.trim() } : {}),
        ...(data.condition ? { condition: data.condition } : {}),
        ...(data.status    ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: { category: true },
    });

    if (data.condition && prevItem && data.condition !== prevItem.condition) {
      await prisma.auditLog.create({
        data: {
          actorId: actor.id, action: "BOOKING_UPDATED",
          entity: "EquipmentItem", entityId: itemId,
          metadata: { action: "EQUIPMENT_CONDITION_UPDATED", prev: prevItem.condition, next: data.condition },
        },
      });
    }

    return { success: true, item };
  } catch (error) {
    console.error("updateEquipmentItem:", error);
    return { success: false, error: "Failed to update equipment item" };
  }
}

export async function deleteEquipmentItemAction(itemId: string) {
  try {
    await requireProductionManager();
    const active = await prisma.equipmentAssignment.findFirst({ where: { itemId, returnedAt: null } });
    if (active) return { success: false, error: "Cannot delete: item is currently assigned" };
    await prisma.equipmentItem.delete({ where: { id: itemId } });
    return { success: true };
  } catch (error) {
    console.error("deleteEquipmentItem:", error);
    return { success: false, error: "Failed to delete equipment item" };
  }
}

export async function getEquipmentItemsAction(filters: { categoryId?: string; status?: EquipmentStatus } = {}) {
  try {
    await requireStaff();
    const where: Record<string, unknown> = {};
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.status)     where.status     = filters.status;

    const items = await prisma.equipmentItem.findMany({
      where,
      include: { category: true },
      orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
    });
    return { success: true, items };
  } catch (error) {
    console.error("getEquipmentItems:", error);
    return { success: false, error: "Failed to load equipment", items: [] };
  }
}

// ── Equipment Assignments ─────────────────────────────────────────────────────

export async function assignEquipmentAction(data: { taskId: string; itemId: string }) {
  try {
    const actor = await requireProductionManager();

    const task = await prisma.projectTask.findUnique({
      where: { id: data.taskId },
      include: { assignee: true },
    });
    if (!task) return { success: false, error: "Task not found" };
    if (!task.assigneeId) return { success: false, error: "Task has no assignee — assign a staff member first" };

    const item = await prisma.equipmentItem.findUnique({ where: { id: data.itemId } });
    if (!item) return { success: false, error: "Equipment item not found" };
    if (item.status !== "AVAILABLE") return { success: false, error: `Item is not available (current status: ${item.status})` };

    const assignment = await prisma.equipmentAssignment.create({
      data: {
        id: cuid(),
        itemId: data.itemId,
        taskId: data.taskId,
        assigneeId: task.assigneeId,
      },
      include: { item: { include: { category: true } }, assignee: { select: { id: true, name: true } } },
    });

    // Mark item as ASSIGNED
    await prisma.equipmentItem.update({ where: { id: data.itemId }, data: { status: "ASSIGNED" } })
      .catch((e) => console.error("[equipment] status update failed:", e));

    await prisma.auditLog.create({
      data: {
        actorId: actor.id, action: "BOOKING_UPDATED",
        entity: "EquipmentAssignment", entityId: assignment.id,
        metadata: { action: "EQUIPMENT_ASSIGNED", itemId: data.itemId, taskId: data.taskId, assigneeId: task.assigneeId },
      },
    });

    return { success: true, assignment };
  } catch (error) {
    console.error("assignEquipment:", error);
    return { success: false, error: "Failed to assign equipment" };
  }
}

export async function getTaskEquipmentAction(taskId: string) {
  try {
    await requireStaff();
    const assignments = await prisma.equipmentAssignment.findMany({
      where: { taskId, returnedAt: null },
      include: {
        item: { include: { category: true } },
        assignee: { select: { id: true, name: true } },
        returns: { orderBy: { submittedAt: "desc" }, take: 1 },
      },
    });
    return { success: true, assignments };
  } catch (error) {
    console.error("getTaskEquipment:", error);
    return { success: false, error: "Failed to load assignments", assignments: [] };
  }
}

// ── Return Requests ───────────────────────────────────────────────────────────

export async function submitReturnRequestAction(data: {
  assignmentId: string; returnNote?: string;
}) {
  try {
    const user = await requireStaff();

    const assignment = await prisma.equipmentAssignment.findUnique({
      where: { id: data.assignmentId },
      include: { task: true },
    });
    if (!assignment) return { success: false, error: "Assignment not found" };
    if (assignment.assigneeId !== user.id) return { success: false, error: "You are not the assignee for this equipment" };
    if (assignment.returnedAt) return { success: false, error: "Equipment already returned" };

    const pending = await prisma.equipmentReturn.findFirst({
      where: { assignmentId: data.assignmentId, status: "PENDING" },
    });
    if (pending) return { success: false, error: "A return request is already pending for this item" };

    if (data.returnNote && data.returnNote.length > 500) {
      return { success: false, error: "Return note must be 500 characters or less" };
    }

    const returnReq = await prisma.equipmentReturn.create({
      data: {
        id: cuid(),
        assignmentId: data.assignmentId,
        requestedById: user.id,
        status: "PENDING",
        returnNote: data.returnNote || null,
      },
      include: {
        assignment: { include: { item: { include: { category: true } }, task: true } },
        requestedBy: { select: { id: true, name: true } },
      },
    });

    return { success: true, returnRequest: returnReq };
  } catch (error) {
    console.error("submitReturnRequest:", error);
    return { success: false, error: "Failed to submit return request" };
  }
}

export async function getPendingReturnsAction() {
  try {
    await requireProductionManager();
    const returns = await prisma.equipmentReturn.findMany({
      where: { status: "PENDING" },
      include: {
        assignment: {
          include: {
            item: { include: { category: true } },
            task: { include: { project: { include: { booking: { include: { client: { select: { name: true } } } } } } } },
          },
        },
        requestedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { submittedAt: "asc" },
    });
    return { success: true, returns };
  } catch (error) {
    console.error("getPendingReturns:", error);
    return { success: false, error: "Failed to load pending returns", returns: [] };
  }
}

export async function reviewReturnRequestAction(
  returnId: string,
  decision: "APPROVED" | "REJECTED",
  rejectionReason?: string
) {
  try {
    const actor = await requireProductionManager();

    const returnReq = await prisma.equipmentReturn.findUnique({
      where: { id: returnId },
      include: { assignment: { include: { item: true } } },
    });
    if (!returnReq) return { success: false, error: "Return request not found" };
    if (returnReq.status !== "PENDING") return { success: false, error: "Return request already processed" };

    if (decision === "REJECTED") {
      if (!rejectionReason?.trim()) return { success: false, error: "Rejection reason is required" };
      if (rejectionReason.length > 500) return { success: false, error: "Rejection reason must be 500 characters or less" };
    }

    const updated = await prisma.equipmentReturn.update({
      where: { id: returnId },
      data: {
        status: decision,
        reviewedById: actor.id,
        reviewedAt: new Date(),
        rejectionReason: decision === "REJECTED" ? rejectionReason : null,
      },
    });

    if (decision === "APPROVED") {
      // Close the assignment and free the item
      await prisma.equipmentAssignment.update({
        where: { id: returnReq.assignmentId },
        data: { returnedAt: new Date() },
      });
      await prisma.equipmentItem.update({
        where: { id: returnReq.assignment.itemId },
        data: { status: "AVAILABLE" },
      });

      await prisma.auditLog.create({
        data: {
          actorId: actor.id, action: "BOOKING_UPDATED",
          entity: "EquipmentReturn", entityId: returnId,
          metadata: {
            action: "EQUIPMENT_RETURNED",
            itemId: returnReq.assignment.itemId,
            assigneeId: returnReq.assignment.assigneeId,
            condition: returnReq.assignment.item.condition,
          },
        },
      });
    }

    return { success: true, returnRequest: updated };
  } catch (error) {
    console.error("reviewReturnRequest:", error);
    return { success: false, error: "Failed to process return request" };
  }
}

// ── Staff task dashboard ──────────────────────────────────────────────────────

export async function getMyTasksAction() {
  try {
    const user = await requireStaff();

    const tasks = await prisma.projectTask.findMany({
      where: { assigneeId: user.id },
      include: {
        project: {
          include: {
            booking: { include: { client: { select: { name: true } }, gallery: { select: { id: true } } } },
          },
        },
        equipmentAssignments: {
          where: { returnedAt: null },
          include: {
            item: { include: { category: true } },
            returns: { where: { status: "PENDING" }, take: 1 },
          },
        },
      },
      orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    });

    return { success: true, tasks, userId: user.id };
  } catch (error) {
    console.error("getMyTasks:", error);
    return { success: false, error: "Failed to load tasks", tasks: [], userId: "" };
  }
}

// ── Staff media submission ────────────────────────────────────────────────────

export async function getStaffUploadUrlAction(data: {
  taskId: string; filename: string; mimeType: string; sizeBytes?: number;
}) {
  try {
    const user = await requireStaff();

    const task = await prisma.projectTask.findUnique({
      where: { id: data.taskId },
      include: {
        project: { include: { booking: { include: { gallery: true } } } },
      },
    });

    if (!task) return { success: false, error: "Task not found" };
    if (task.assigneeId !== user.id) return { success: false, error: "You are not assigned to this task" };

    const gallery = task.project.booking.gallery;
    if (!gallery) return { success: false, error: "No gallery exists for this project. Ask an admin to create one first." };

    const { generateS3UploadUrl, validateMediaFile } = await import("@/lib/s3");

    const validation = validateMediaFile(data.mimeType, data.filename, data.sizeBytes);
    if (!validation.valid) return { success: false, error: validation.error };

    const bookingId = task.project.booking.id;
    const result = await generateS3UploadUrl(bookingId, data.filename, data.mimeType, "raw", data.sizeBytes);
    if (!result.success || !result.uploadUrl || !result.s3Key) {
      return { success: false, error: result.error ?? "Failed to generate upload URL" };
    }

    // Create the MediaAsset DB record
    const { nanoid: nid } = await import("nanoid");
    const mediaAsset = await prisma.mediaAsset.create({
      data: {
        id: nid(25),
        galleryId: gallery.id,
        kind: validation.kind!,
        originalKey: result.s3Key,
        filename: data.filename,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes ? BigInt(data.sizeBytes) : null,
        releaseStatus: "DRAFT",
        uploadedByStaffId: user.id,
      },
    });

    return {
      success: true,
      uploadUrl: result.uploadUrl,
      s3Key: result.s3Key,
      mediaAssetId: mediaAsset.id,
      galleryId: gallery.id,
    };
  } catch (error) {
    console.error("getStaffUploadUrl:", error);
    return { success: false, error: "Failed to prepare upload" };
  }
}

export async function confirmStaffUploadAction(mediaAssetId: string, taskId: string) {
  try {
    const user = await requireStaff();

    const task = await prisma.projectTask.findUnique({ where: { id: taskId } });
    if (!task || task.assigneeId !== user.id) return { success: false, error: "Not authorized for this task" };

    const asset = await prisma.mediaAsset.findUnique({ where: { id: mediaAssetId } });
    if (!asset) return { success: false, error: "Media asset not found" };

    // Trigger preview generation non-blocking
    const { generatePreviewAction } = await import("@/app/admin/galleries/actions");
    generatePreviewAction(mediaAssetId).catch((e) => console.error("[staff-upload] preview failed:", e));

    return { success: true };
  } catch (error) {
    console.error("confirmStaffUpload:", error);
    return { success: false, error: "Failed to confirm upload" };
  }
}
