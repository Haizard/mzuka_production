"use server";

import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { canManageEmployees, canManageFinance } from "@/lib/admin-permissions";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function ok<T>(data: T) { return { success: true, data } as const; }
function fail(message: string) { return { success: false, error: message } as const; }

/* ── File a new emergency report ─────────────────────────────────────────── */

export async function fileEmergencyReport(input: {
  title: string;
  category: string;
  severity: string;
  description: string;
  staffInvolved?: string;
  witnesses?: string;
  location?: string;
  dateOfIncident: string;
  attachments?: Array<{ name: string; url: string; type: string }>;
  followUpRequired?: boolean;
  followUpDate?: string;
  followUpNotes?: string;
}) {
  const user = await requireAdmin();

  // Only HR, Admin, Founder can file reports
  const allowed = ["FOUNDER", "ADMIN"].includes(user.role) || user.staffRole === "HUMAN_RESOURCE";
  if (!allowed) return fail("You do not have permission to file emergency reports.");

  try {
    const report = await prisma.emergencyReport.create({
      data: {
        title: input.title,
        category: input.category as any,
        severity: input.severity as any,
        description: input.description,
        staffInvolved: input.staffInvolved || null,
        witnesses: input.witnesses || null,
        location: input.location || null,
        dateOfIncident: new Date(input.dateOfIncident),
        attachments: input.attachments ? JSON.parse(JSON.stringify(input.attachments)) : undefined,
        followUpRequired: input.followUpRequired ?? false,
        followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
        followUpNotes: input.followUpNotes || null,
        reportedById: user.id,
      },
      include: {
        reportedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "EMERGENCY_REPORT_FILED",
        entity: "EmergencyReport",
        entityId: report.id,
        metadata: { title: report.title, severity: report.severity, category: report.category },
      },
    });

    return ok(report);
  } catch (err) {
    console.error("[fileEmergencyReport]", err);
    return fail("Failed to file report. Please try again.");
  }
}

/* ── List reports ────────────────────────────────────────────────────────── */

export async function listEmergencyReports(filters?: {
  status?: string;
  severity?: string;
  category?: string;
  search?: string;
}) {
  const user = await requireAdmin();

  const where: any = {};
  if (filters?.status && filters.status !== "ALL") where.status = filters.status;
  if (filters?.severity && filters.severity !== "ALL") where.severity = filters.severity;
  if (filters?.category && filters.category !== "ALL") where.category = filters.category;
  if (filters?.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { staffInvolved: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const reports = await prisma.emergencyReport.findMany({
    where,
    include: {
      reportedBy: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true } },
      updates: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: [
      { severity: "asc" },   // CRITICAL first (alphabetically)
      { createdAt: "desc" },
    ],
  });

  return ok(reports);
}

/* ── Get single report ───────────────────────────────────────────────────── */

export async function getEmergencyReport(reportId: string) {
  const user = await requireAdmin();

  const report = await prisma.emergencyReport.findUnique({
    where: { id: reportId },
    include: {
      reportedBy: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true } },
      updates: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!report) return fail("Report not found.");
  return ok(report);
}

/* ── Update report status ────────────────────────────────────────────────── */

export async function updateReportStatus(reportId: string, status: string, resolutionNotes?: string) {
  const user = await requireAdmin();

  const report = await prisma.emergencyReport.findUnique({ where: { id: reportId } });
  if (!report) return fail("Report not found.");

  const updateData: any = { status };

  if (status === "RESOLVED") {
    updateData.resolvedById = user.id;
    updateData.resolvedAt = new Date();
    if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
  }

  const updated = await prisma.emergencyReport.update({
    where: { id: reportId },
    data: updateData,
    include: {
      reportedBy: { select: { id: true, name: true, email: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
  });

  // Audit log
  const action = status === "RESOLVED" ? "EMERGENCY_REPORT_RESOLVED" : "EMERGENCY_REPORT_ESCALATED";
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action,
      entity: "EmergencyReport",
      entityId: reportId,
      metadata: { status, title: report.title },
    },
  });

  return ok(updated);
}

/* ── Add update / note to report ─────────────────────────────────────────── */

export async function addReportUpdate(reportId: string, body: string, isEscalation = false) {
  const user = await requireAdmin();

  const report = await prisma.emergencyReport.findUnique({ where: { id: reportId } });
  if (!report) return fail("Report not found.");

  const update = await prisma.reportUpdate.create({
    data: {
      reportId,
      authorId: user.id,
      body,
      isEscalation,
    },
    include: {
      author: { select: { id: true, name: true } },
    },
  });

  // If escalation, also update the report status
  if (isEscalation) {
    await prisma.emergencyReport.update({
      where: { id: reportId },
      data: { status: "ESCALATED" },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "EMERGENCY_REPORT_ESCALATED",
        entity: "EmergencyReport",
        entityId: reportId,
        metadata: { title: report.title, escalatedBy: user.name },
      },
    });
  }

  return ok(update);
}

/* ── Update follow-up settings ───────────────────────────────────────────── */

export async function updateFollowUp(reportId: string, followUpRequired: boolean, followUpDate?: string, followUpNotes?: string) {
  const user = await requireAdmin();

  const report = await prisma.emergencyReport.findUnique({ where: { id: reportId } });
  if (!report) return fail("Report not found.");

  const updated = await prisma.emergencyReport.update({
    where: { id: reportId },
    data: {
      followUpRequired,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      followUpNotes: followUpNotes || null,
    },
  });

  return ok(updated);
}

/* ── Summary stats ───────────────────────────────────────────────────────── */

export async function getReportStats() {
  const user = await requireAdmin();

  const [total, open, escalated, resolved, pendingFollowUp, criticalCount] = await Promise.all([
    prisma.emergencyReport.count(),
    prisma.emergencyReport.count({ where: { status: "OPEN" } }),
    prisma.emergencyReport.count({ where: { status: "ESCALATED" } }),
    prisma.emergencyReport.count({ where: { status: "RESOLVED" } }),
    prisma.emergencyReport.count({ where: { followUpRequired: true, status: { not: "RESOLVED" } } }),
    prisma.emergencyReport.count({ where: { severity: "CRITICAL", status: { not: "RESOLVED" } } }),
  ]);

  // By category
  const byCategory = await prisma.emergencyReport.groupBy({
    by: ["category"],
    _count: true,
    orderBy: { _count: { category: "desc" } },
  });

  // Recent 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentCount = await prisma.emergencyReport.count({
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  return ok({
    total,
    open,
    escalated,
    resolved,
    pendingFollowUp,
    criticalCount,
    recentCount,
    byCategory: byCategory.map((c) => ({ category: c.category, count: c._count })),
  });
}
