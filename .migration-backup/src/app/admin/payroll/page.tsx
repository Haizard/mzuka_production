"use client";

import { useCallback, useEffect, useState } from "react";
import { Wallet, Users, DollarSign, Calendar, Plus, Loader2, CheckCircle, TrendingUp } from "lucide-react";
import { getPayrollDataAction, getPayrollSummaryAction, recordPayrollPaymentAction } from "./actions";
import { STAFF_ROLES } from "@/app/admin/employees/staff-roles";

interface StaffMember { id: string; name: string; email: string; staffRole: string | null; createdAt: Date; }
interface PayrollExpense { id: string; description: string; amountCents: number; recordedAt: Date; }

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const currentPeriod = () => {
  const d = new Date();
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

function roleLabel(role: string | null) {
  return STAFF_ROLES.find((r) => r.value === role)?.label ?? role ?? "Staff";
}
function roleColour(role: string | null) {
  return STAFF_ROLES.find((r) => r.value === role)?.colour ?? "bg-zinc-500/15 text-zinc-400";
}

export default function PayrollPage() {
  const [staff, setStaff]                   = useState<StaffMember[]>([]);
  const [payments, setPayments]             = useState<PayrollExpense[]>([]);
  const [summary, setSummary]               = useState<{ monthTotalCents: number; yearTotalCents: number; allTimeCents: number } | null>(null);
  const [loading, setLoading]               = useState(true);
  const [showForm, setShowForm]             = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [successMsg, setSuccessMsg]         = useState<string | null>(null);

  const [selectedStaff, setSelectedStaff]   = useState("");
  const [amount, setAmount]                 = useState("");
  const [period, setPeriod]                 = useState(currentPeriod());
  const [notes, setNotes]                   = useState("");

  const load = useCallback(async () => {
    const [data, sumData] = await Promise.all([getPayrollDataAction(), getPayrollSummaryAction()]);
    if (data.success) {
      setStaff(data.staff as StaffMember[]);
      setPayments(data.payrollExpenses as PayrollExpense[]);
    }
    if (sumData.success) {
      setSummary({
        monthTotalCents: sumData.monthTotalCents ?? 0,
        yearTotalCents: sumData.yearTotalCents ?? 0,
        allTimeCents: sumData.allTimeCents ?? 0,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !amount || !period) return;
    setSubmitting(true);
    const member = staff.find((s) => s.id === selectedStaff);
    const result = await recordPayrollPaymentAction({
      staffId: selectedStaff,
      staffName: member?.name ?? selectedStaff,
      amountCents: Math.round(parseFloat(amount) * 100),
      period,
      notes,
    });
    if (result.success) {
      setSuccessMsg(`Payment recorded for ${member?.name} — ${fmt(Math.round(parseFloat(amount) * 100))}`);
      setShowForm(false);
      setAmount(""); setNotes(""); setSelectedStaff("");
      await load();
      setTimeout(() => setSuccessMsg(null), 5000);
    }
    setSubmitting(false);
  };

  return (
    <main className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Human Resources</p>
        <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-[var(--gold)]" /> Payroll
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Record and track employee payroll payments</p>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex items-center gap-3 text-sm text-emerald-300">
          <CheckCircle className="h-4 w-4 shrink-0" /> {successMsg}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "This Month", value: fmt(summary.monthTotalCents), icon: Calendar, colour: "text-violet-400" },
            { label: "This Year",  value: fmt(summary.yearTotalCents),  icon: TrendingUp, colour: "text-[var(--gold)]" },
            { label: "All Time",   value: fmt(summary.allTimeCents),    icon: DollarSign, colour: "text-emerald-400" },
          ].map(({ label, value, icon: Icon, colour }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${colour}`} />
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
              </div>
              <p className={`text-xl font-bold ${colour}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Record payment button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          <Users className="inline h-4 w-4 mr-1 text-zinc-500" />
          {staff.length} staff member{staff.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setShowForm((x) => !x)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-400 transition"
        >
          <Plus className="h-4 w-4" /> Record Payment
        </button>
      </div>

      {/* New payment form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--gold)]/20 bg-[var(--surface)] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">New Payroll Payment</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Employee</label>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]/40"
              >
                <option value="">Select employee…</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({roleLabel(s.staffRole)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Pay Period</label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="e.g. June 2026"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--gold)]/40"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-7 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--gold)]/40"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bonus, overtime, etc."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--gold)]/40"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              Confirm Payment
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/5 transition">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Staff roster */}
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-8 text-center text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading…
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {staff.map((s) => {
            const paid = payments.filter((p) => p.description.includes(s.name)).reduce((sum, p) => sum + p.amountCents, 0);
            return (
              <div key={s.id} className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center text-sm font-bold text-[var(--gold)]">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${roleColour(s.staffRole)}`}>
                    {roleLabel(s.staffRole)}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                <p className="text-xs text-zinc-500 truncate mb-2">{s.email}</p>
                <div className="border-t border-white/10 pt-2 mt-2">
                  <p className="text-xs text-zinc-500">Total paid</p>
                  <p className="text-sm font-bold text-emerald-400">{paid > 0 ? fmt(paid) : "—"}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Payment History</h3>
          </div>
          <div className="divide-y divide-white/5">
            {payments.slice(0, 30).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{p.description}</p>
                  <p className="text-xs text-zinc-500">{fmtDate(p.recordedAt)}</p>
                </div>
                <p className="text-sm font-bold text-emerald-400 shrink-0">{fmt(p.amountCents)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
