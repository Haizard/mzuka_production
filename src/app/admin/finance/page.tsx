"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Receipt, FileText,
  RefreshCw, ArrowUpRight, ArrowDownRight, Wallet,
} from "lucide-react";
import { getFinanceSummary } from "./actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  totalRevenue:   number;
  monthRevenue:   number;
  yearRevenue:    number;
  totalExpenses:  number;
  monthExpenses:  number;
  yearExpenses:   number;
  netProfit:      number;
  unpaidInvoices: number;
  overdueInvoices: number;
  paidInvoices:   number;
}

interface Payment {
  id:          string;
  amountCents: number;
  currency:    string;
  updatedAt:   Date;
  booking: {
    title:    string;
    client: { name: string; email: string };
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function usd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getFinanceSummary();
    if (res.success && res.summary) {
      setSummary(res.summary as Summary);
      setPayments((res.recentPayments ?? []) as unknown as Payment[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Finance</p>
          <h2 className="text-2xl font-bold text-white mt-1">Revenue &amp; Overview</h2>
          <p className="mt-1 text-sm text-zinc-400">Revenue, expenses, profit/loss summary</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-500">Loading financial data…</div>
      ) : summary ? (
        <>
          {/* Top KPI cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total Revenue"
              value={usd(summary.totalRevenue)}
              sub={`${usd(summary.monthRevenue)} this month`}
              icon={TrendingUp}
              colour="text-emerald-400"
              border="border-emerald-500/20"
            />
            <KpiCard
              label="Total Expenses"
              value={usd(summary.totalExpenses)}
              sub={`${usd(summary.monthExpenses)} this month`}
              icon={TrendingDown}
              colour="text-red-400"
              border="border-red-500/20"
            />
            <KpiCard
              label="Net Profit"
              value={usd(summary.netProfit)}
              sub={summary.netProfit >= 0 ? "Positive margin" : "Negative margin"}
              icon={summary.netProfit >= 0 ? ArrowUpRight : ArrowDownRight}
              colour={summary.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}
              border={summary.netProfit >= 0 ? "border-emerald-500/20" : "border-red-500/20"}
            />
            <KpiCard
              label="Year Revenue"
              value={usd(summary.yearRevenue)}
              sub={`${usd(summary.yearExpenses)} in expenses`}
              icon={Wallet}
              colour="text-[var(--gold)]"
              border="border-[var(--gold)]/20"
            />
          </div>

          {/* Invoice status + quick nav */}
          <div className="grid gap-4 sm:grid-cols-3">
            <InvoicePill label="Unpaid Invoices"  value={summary.unpaidInvoices}  colour="text-amber-400"  href="/admin/finance/invoices" />
            <InvoicePill label="Overdue Invoices" value={summary.overdueInvoices} colour="text-red-400"    href="/admin/finance/invoices" />
            <InvoicePill label="Paid Invoices"    value={summary.paidInvoices}    colour="text-emerald-400" href="/admin/finance/invoices" />
          </div>

          {/* Quick links */}
          <div className="grid gap-4 sm:grid-cols-3">
            <QuickLink href="/admin/finance/invoices"  icon={Receipt}    label="Invoices"  desc="Create, send, and track client invoices" />
            <QuickLink href="/admin/finance/expenses"  icon={TrendingDown} label="Expenses" desc="Record and categorise studio expenses" />
            <QuickLink href="/admin/finance/contracts" icon={FileText}   label="Contracts" desc="Draft, send, and store digital agreements" />
          </div>

          {/* Recent payments */}
          <div className="rounded-lg border border-white/10 bg-[var(--surface)]">
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[var(--gold)]" />
                Recent Payments
              </h3>
            </div>
            {payments.length === 0 ? (
              <p className="px-6 py-8 text-center text-zinc-500 text-sm">No payments yet</p>
            ) : (
              <div className="divide-y divide-white/5">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.booking?.title ?? "—"}</p>
                      <p className="text-xs text-zinc-500">{p.booking?.client?.name} · {fmt(p.updatedAt)}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400 shrink-0 ml-4">
                      {usd(p.amountCents)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-red-400">Failed to load finance data.</p>
      )}
    </main>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, colour, border }: {
  label: string; value: string; sub: string;
  icon: React.ElementType; colour: string; border: string;
}) {
  return (
    <div className={`rounded-lg border bg-[var(--surface)] p-5 ${border}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
        <Icon className={`h-5 w-5 ${colour}`} />
      </div>
      <p className={`text-2xl font-bold ${colour}`}>{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{sub}</p>
    </div>
  );
}

function InvoicePill({ label, value, colour, href }: {
  label: string; value: number; colour: string; href: string;
}) {
  return (
    <a href={href} className="rounded-lg border border-white/10 bg-[var(--surface)] p-4 flex items-center justify-between hover:border-white/20 transition">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className={`text-xl font-bold ${colour}`}>{value}</p>
    </a>
  );
}

function QuickLink({ href, icon: Icon, label, desc }: {
  href: string; icon: React.ElementType; label: string; desc: string;
}) {
  return (
    <a
      href={href}
      className="rounded-lg border border-white/10 bg-[var(--surface)] p-5 hover:border-[var(--gold)]/40 transition group"
    >
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--gold)] text-black mb-4">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-semibold text-white">{label}</p>
      <p className="text-sm text-zinc-400 mt-1">{desc}</p>
    </a>
  );
}
