"use server";

import type { InvoiceStatus, ExpenseCategory, ContractStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";

// ── Helpers ───────────────────────────────────────────────────────────────────

function cuid() {
  return nanoid(25);
}

async function nextInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  const num = String(count + 1).padStart(4, "0");
  const year = new Date().getFullYear();
  return `MG-${year}-${num}`;
}

// ── Revenue dashboard ─────────────────────────────────────────────────────────

export async function getFinanceSummary() {
  try {
    await requireAdmin();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear  = new Date(now.getFullYear(), 0, 1);

    const [
      totalRevenue,
      monthRevenue,
      yearRevenue,
      totalExpenses,
      monthExpenses,
      yearExpenses,
      unpaidInvoices,
      overdueInvoices,
      paidInvoices,
      recentPayments,
    ] = await Promise.all([
      // Revenue = sum of PAID payments
      prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
      prisma.payment.aggregate({ where: { status: "PAID", createdAt: { gte: startOfMonth } }, _sum: { amountCents: true } }),
      prisma.payment.aggregate({ where: { status: "PAID", createdAt: { gte: startOfYear  } }, _sum: { amountCents: true } }),
      // Expenses
      prisma.expense.aggregate({ _sum: { amountCents: true } }),
      prisma.expense.aggregate({ where: { recordedAt: { gte: startOfMonth } }, _sum: { amountCents: true } }),
      prisma.expense.aggregate({ where: { recordedAt: { gte: startOfYear  } }, _sum: { amountCents: true } }),
      // Invoice counts
      prisma.invoice.count({ where: { status: { in: ["DRAFT", "SENT"] } } }),
      prisma.invoice.count({ where: { status: "OVERDUE" } }),
      prisma.invoice.count({ where: { status: "PAID" } }),
      // Recent payments
      prisma.payment.findMany({
        where: { status: "PAID" },
        include: { booking: { include: { client: { select: { name: true, email: true } } } } },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    ]);

    const totalRev  = totalRevenue._sum.amountCents ?? 0;
    const totalExp  = totalExpenses._sum.amountCents ?? 0;

    return {
      success: true,
      summary: {
        totalRevenue:  totalRev,
        monthRevenue:  monthRevenue._sum.amountCents ?? 0,
        yearRevenue:   yearRevenue._sum.amountCents ?? 0,
        totalExpenses: totalExp,
        monthExpenses: monthExpenses._sum.amountCents ?? 0,
        yearExpenses:  yearExpenses._sum.amountCents ?? 0,
        netProfit:     totalRev - totalExp,
        unpaidInvoices,
        overdueInvoices,
        paidInvoices,
      },
      recentPayments,
    };
  } catch (error) {
    console.error("Failed to fetch finance summary:", error);
    return { success: false, error: "Failed to load finance summary" };
  }
}

// ── Invoices ──────────────────────────────────────────────────────────────────

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitCents: number;
}

export async function createInvoiceAction(data: {
  clientId: string;
  bookingId?: string;
  items: InvoiceItemInput[];
  notes?: string;
  dueAt?: string;
  taxPercent?: number;
}) {
  try {
    const admin = await requireAdmin();

    const subtotal  = data.items.reduce((s, i) => s + i.quantity * i.unitCents, 0);
    const taxPct    = data.taxPercent ?? 0;
    const taxCents  = Math.round(subtotal * taxPct / 100);
    const total     = subtotal + taxCents;
    const number    = await nextInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        id:            cuid(),
        clientId:      data.clientId,
        bookingId:     data.bookingId ?? null,
        number,
        status:        "DRAFT",
        subtotalCents: subtotal,
        taxCents,
        totalCents:    total,
        notes:         data.notes,
        dueAt:         data.dueAt ? new Date(data.dueAt) : null,
        items: {
          create: data.items.map((i) => ({
            id:          cuid(),
            description: i.description,
            quantity:    i.quantity,
            unitCents:   i.unitCents,
            totalCents:  i.quantity * i.unitCents,
          })),
        },
      },
      include: { items: true, client: { select: { name: true, email: true } } },
    });

    await prisma.auditLog.create({
      data: {
        actorId:  admin.id,
        action:   "BOOKING_UPDATED",
        entity:   "Invoice",
        entityId: invoice.id,
        metadata: { number, totalCents: total },
      },
    });

    return { success: true, invoice };
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return { success: false, error: "Failed to create invoice" };
  }
}

export async function updateInvoiceStatusAction(invoiceId: string, status: InvoiceStatus) {
  try {
    await requireAdmin();

    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status,
        paidAt: status === "PAID" ? new Date() : undefined,
      },
    });

    return { success: true, invoice };
  } catch (error) {
    console.error("Failed to update invoice status:", error);
    return { success: false, error: "Failed to update invoice" };
  }
}

export async function deleteInvoiceAction(invoiceId: string) {
  try {
    await requireAdmin();
    await prisma.invoice.delete({ where: { id: invoiceId } });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return { success: false, error: "Failed to delete invoice" };
  }
}

export async function getAllInvoices(filters: { status?: InvoiceStatus; clientId?: string } = {}) {
  try {
    await requireAdmin();

    const where: Record<string, unknown> = {};
    if (filters.status)   where.status   = filters.status;
    if (filters.clientId) where.clientId = filters.clientId;

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client:  { select: { id: true, name: true, email: true } },
        booking: { select: { id: true, title: true, serviceType: true } },
        items:   true,
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, invoices };
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return { success: false, error: "Failed to load invoices", invoices: [] };
  }
}

export async function getInvoiceById(invoiceId: string) {
  try {
    await requireAdmin();

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client:  true,
        booking: { include: { package: true } },
        items:   true,
      },
    });

    if (!invoice) return { success: false, error: "Invoice not found", invoice: null };
    return { success: true, invoice };
  } catch (error) {
    console.error("Failed to fetch invoice:", error);
    return { success: false, error: "Failed to load invoice", invoice: null };
  }
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function createExpenseAction(data: {
  category: ExpenseCategory;
  description: string;
  amountCents: number;
  currency?: string;
  bookingId?: string;
  recordedAt?: string;
  receiptUrl?: string;
}) {
  try {
    await requireAdmin();

    const expense = await prisma.expense.create({
      data: {
        id:          cuid(),
        category:    data.category,
        description: data.description,
        amountCents: data.amountCents,
        currency:    data.currency ?? "USD",
        bookingId:   data.bookingId ?? null,
        recordedAt:  data.recordedAt ? new Date(data.recordedAt) : new Date(),
        receiptUrl:  data.receiptUrl ?? null,
      },
      include: { booking: { select: { id: true, title: true } } },
    });

    return { success: true, expense };
  } catch (error) {
    console.error("Failed to create expense:", error);
    return { success: false, error: "Failed to record expense" };
  }
}

export async function deleteExpenseAction(expenseId: string) {
  try {
    await requireAdmin();
    await prisma.expense.delete({ where: { id: expenseId } });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete expense:", error);
    return { success: false, error: "Failed to delete expense" };
  }
}

export async function getAllExpenses(filters: { category?: ExpenseCategory; bookingId?: string } = {}) {
  try {
    await requireAdmin();

    const where: Record<string, unknown> = {};
    if (filters.category)  where.category  = filters.category;
    if (filters.bookingId) where.bookingId = filters.bookingId;

    const expenses = await prisma.expense.findMany({
      where,
      include: { booking: { select: { id: true, title: true } } },
      orderBy: { recordedAt: "desc" },
    });

    return { success: true, expenses };
  } catch (error) {
    console.error("Failed to fetch expenses:", error);
    return { success: false, error: "Failed to load expenses", expenses: [] };
  }
}

export async function getExpensesByCategory() {
  try {
    await requireAdmin();

    const grouped = await prisma.expense.groupBy({
      by: ["category"],
      _sum: { amountCents: true },
      _count: { id: true },
      orderBy: { _sum: { amountCents: "desc" } },
    });

    return { success: true, grouped };
  } catch (error) {
    console.error("Failed to group expenses:", error);
    return { success: false, error: "Failed to load expense breakdown", grouped: [] };
  }
}

// ── Contracts ─────────────────────────────────────────────────────────────────

export async function createContractAction(data: {
  clientId: string;
  bookingId?: string;
  title: string;
  body: string;
  expiresAt?: string;
}) {
  try {
    const admin = await requireAdmin();

    const contract = await prisma.contract.create({
      data: {
        id:        cuid(),
        clientId:  data.clientId,
        bookingId: data.bookingId ?? null,
        title:     data.title,
        body:      data.body,
        status:    "DRAFT",
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
      include: {
        client:  { select: { id: true, name: true, email: true } },
        booking: { select: { id: true, title: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId:  admin.id,
        action:   "BOOKING_UPDATED",
        entity:   "Contract",
        entityId: contract.id,
        metadata: { title: data.title, clientId: data.clientId },
      },
    });

    return { success: true, contract };
  } catch (error) {
    console.error("Failed to create contract:", error);
    return { success: false, error: "Failed to create contract" };
  }
}

export async function updateContractStatusAction(contractId: string, status: ContractStatus) {
  try {
    await requireAdmin();

    const contract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        status,
        signedAt: status === "SIGNED" ? new Date() : undefined,
      },
    });

    return { success: true, contract };
  } catch (error) {
    console.error("Failed to update contract:", error);
    return { success: false, error: "Failed to update contract" };
  }
}

export async function deleteContractAction(contractId: string) {
  try {
    await requireAdmin();
    await prisma.contract.delete({ where: { id: contractId } });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete contract:", error);
    return { success: false, error: "Failed to delete contract" };
  }
}

export async function getAllContracts(filters: { status?: ContractStatus; clientId?: string } = {}) {
  try {
    await requireAdmin();

    const where: Record<string, unknown> = {};
    if (filters.status)   where.status   = filters.status;
    if (filters.clientId) where.clientId = filters.clientId;

    const contracts = await prisma.contract.findMany({
      where,
      include: {
        client:  { select: { id: true, name: true, email: true } },
        booking: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: true, contracts };
  } catch (error) {
    console.error("Failed to fetch contracts:", error);
    return { success: false, error: "Failed to load contracts", contracts: [] };
  }
}

// ── Clients list (for dropdowns) ──────────────────────────────────────────────

export async function getApprovedClients() {
  try {
    await requireAdmin();
    const clients = await prisma.user.findMany({
      where: { role: "CLIENT", approvalStatus: "APPROVED" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return { success: true, clients };
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return { success: false, error: "Failed to load clients", clients: [] };
  }
}
