"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function getPayrollDataAction() {
  try {
    await requireAdmin();

    const [staff, payrollExpenses] = await Promise.all([
      prisma.user.findMany({
        where: { role: { in: ["STAFF", "ADMIN"] }, approvalStatus: "APPROVED" },
        select: { id: true, name: true, email: true, staffRole: true, createdAt: true },
        orderBy: { name: "asc" },
      }),
      prisma.expense.findMany({
        where: { category: "STAFF" },
        orderBy: { recordedAt: "desc" },
      }),
    ]);

    return { success: true, staff, payrollExpenses };
  } catch (error) {
    console.error("getPayrollData:", error);
    return { success: false, error: "Failed to load payroll data", staff: [], payrollExpenses: [] };
  }
}

export async function recordPayrollPaymentAction(data: {
  staffId: string;
  staffName: string;
  amountCents: number;
  period: string;
  notes?: string;
}) {
  try {
    await requireAdmin();

    const expense = await prisma.expense.create({
      data: {
        category: "STAFF",
        description: `Payroll — ${data.staffName} — ${data.period}`,
        amountCents: data.amountCents,
        currency: "USD",
        recordedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: "CLIENT_APPROVED",
        entity: "Expense",
        entityId: expense.id,
        metadata: { type: "payroll", staffId: data.staffId, staffName: data.staffName, period: data.period, amountCents: data.amountCents },
      },
    });

    return { success: true, expense };
  } catch (error) {
    console.error("recordPayrollPayment:", error);
    return { success: false, error: "Failed to record payment" };
  }
}

export async function getPayrollSummaryAction() {
  try {
    await requireAdmin();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear  = new Date(now.getFullYear(), 0, 1);

    const [monthTotal, yearTotal, allTime, recentPayments] = await Promise.all([
      prisma.expense.aggregate({ where: { category: "STAFF", recordedAt: { gte: startOfMonth } }, _sum: { amountCents: true } }),
      prisma.expense.aggregate({ where: { category: "STAFF", recordedAt: { gte: startOfYear }  }, _sum: { amountCents: true } }),
      prisma.expense.aggregate({ where: { category: "STAFF" }, _sum: { amountCents: true } }),
      prisma.expense.findMany({
        where: { category: "STAFF" },
        orderBy: { recordedAt: "desc" },
        take: 20,
      }),
    ]);

    return {
      success: true,
      monthTotalCents: monthTotal._sum.amountCents ?? 0,
      yearTotalCents:  yearTotal._sum.amountCents  ?? 0,
      allTimeCents:    allTime._sum.amountCents    ?? 0,
      recentPayments,
    };
  } catch (error) {
    console.error("getPayrollSummary:", error);
    return { success: false, error: "Failed to load summary" };
  }
}
