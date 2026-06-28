"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import type { ExpenseCategory } from "@prisma/client";
import {
  getAllExpenses, createExpenseAction, deleteExpenseAction,
  getExpensesByCategory,
} from "../actions";
import { getAllBookings } from "@/app/admin/bookings/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Expense {
  id: string; category: ExpenseCategory; description: string;
  amountCents: number; currency: string; receiptUrl: string | null;
  recordedAt: Date; createdAt: Date;
  booking: { id: string; title: string } | null;
}

interface CategoryGroup { category: ExpenseCategory; _sum: { amountCents: number | null }; _count: { id: number } }
interface Booking { id: string; title: string; client: { name: string } }

const CATEGORIES: ExpenseCategory[] = [
  "EQUIPMENT","TRAVEL","EDITING","MARKETING","SOFTWARE","VENUE","STAFF","OTHER"
];

const CAT_COLOURS: Record<ExpenseCategory, string> = {
  EQUIPMENT:  "text-blue-300 bg-blue-500/15",
  TRAVEL:     "text-amber-300 bg-amber-500/15",
  EDITING:    "text-violet-300 bg-violet-500/15",
  MARKETING:  "text-pink-300 bg-pink-500/15",
  SOFTWARE:   "text-cyan-300 bg-cyan-500/15",
  VENUE:      "text-orange-300 bg-orange-500/15",
  STAFF:      "text-emerald-300 bg-emerald-500/15",
  OTHER:      "text-zinc-400 bg-zinc-700/50",
};

function usd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [expenses,  setExpenses]  = useState<Expense[]>([]);
  const [grouped,   setGrouped]   = useState<CategoryGroup[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showNew,   setShowNew]   = useState(false);
  const [filter,    setFilter]    = useState<ExpenseCategory | "ALL">("ALL");
  const [deleting,  setDeleting]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [expRes, grpRes, bkRes] = await Promise.all([
      getAllExpenses(),
      getExpensesByCategory(),
      getAllBookings({ limit: 200 }),
    ]);
    if (expRes.success) setExpenses(expRes.expenses as unknown as Expense[]);
    if (grpRes.success) setGrouped(grpRes.grouped as CategoryGroup[]);
    if (bkRes.success)  setBookings(bkRes.bookings as unknown as Booking[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const remove = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    setDeleting(id);
    await deleteExpenseAction(id);
    await load();
    setDeleting(null);
  };

  const filtered = filter === "ALL" ? expenses : expenses.filter((e) => e.category === filter);
  const total    = expenses.reduce((s, e) => s + e.amountCents, 0);

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Finance</p>
          <h2 className="text-2xl font-bold text-white mt-1">Expenses</h2>
          <p className="mt-1 text-sm text-zinc-400">Total: <span className="text-red-400 font-semibold">{usd(total)}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white transition"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-500 transition">
            <Plus className="h-4 w-4" /> Record Expense
          </button>
        </div>
      </div>

      {/* Category breakdown */}
      {grouped.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {grouped.map((g) => (
            <button key={g.category}
              onClick={() => setFilter(filter === g.category ? "ALL" : g.category)}
              className={`rounded-lg border p-4 text-left transition ${
                filter === g.category ? "border-[var(--gold)]/40 bg-[var(--gold)]/5" : "border-white/10 bg-[var(--surface)] hover:border-white/20"
              }`}>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_COLOURS[g.category]}`}>
                {g.category}
              </span>
              <p className="mt-3 text-lg font-bold text-red-400">{usd(g._sum.amountCents ?? 0)}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{g._count.id} expense{g._count.id !== 1 ? "s" : ""}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${filter === "ALL" ? "bg-white/15 text-white border-white/20" : "border-white/10 text-zinc-400 hover:text-white"}`}>
          All
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setFilter(filter === c ? "ALL" : c)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize transition ${
              filter === c ? "bg-white/15 text-white border-white/20" : "border-white/10 text-zinc-400 hover:text-white"
            }`}>
            {c.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500">Loading expenses…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-lg border border-white/10 bg-[var(--surface)] text-zinc-500">No expenses found</div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-[var(--surface)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-zinc-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Booking</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((exp) => (
                  <tr key={exp.id} className="hover:bg-white/5 transition">
                    <td className="px-5 py-3 text-white font-medium">{exp.description}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CAT_COLOURS[exp.category]}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-zinc-400 text-xs">{exp.booking?.title ?? "—"}</td>
                    <td className="px-5 py-3 text-zinc-400 text-xs">{fmt(exp.recordedAt)}</td>
                    <td className="px-5 py-3 text-right font-semibold text-red-400">{usd(exp.amountCents)}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => remove(exp.id)} disabled={deleting === exp.id}
                        className="text-zinc-600 hover:text-red-400 transition disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showNew && (
        <NewExpenseModal bookings={bookings} onClose={() => setShowNew(false)} onCreated={load} />
      )}
    </main>
  );
}

// ── New Expense Modal ─────────────────────────────────────────────────────────

function NewExpenseModal({ bookings, onClose, onCreated }: {
  bookings: Booking[]; onClose: () => void; onCreated: () => void;
}) {
  const [category,    setCategory]    = useState<ExpenseCategory>("OTHER");
  const [description, setDescription] = useState("");
  const [amount,      setAmount]      = useState("");
  const [bookingId,   setBookingId]   = useState("");
  const [recordedAt,  setRecordedAt]  = useState(new Date().toISOString().slice(0, 10));
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (!description.trim() || cents <= 0) { setError("Description and valid amount are required"); return; }
    setSaving(true);
    const res = await createExpenseAction({
      category, description,
      amountCents: cents,
      bookingId: bookingId || undefined,
      recordedAt,
    });
    if (res.success) { onCreated(); onClose(); }
    else { setError(res.error ?? "Failed"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-5">Record Expense</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Description *</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} required
              placeholder="e.g. Camera battery replacement"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Amount (USD) *</label>
              <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required
                placeholder="0.00"
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Date</label>
              <input type="date" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Linked Booking (optional)</label>
            <select value={bookingId} onChange={(e) => setBookingId(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
              <option value="">None</option>
              {bookings.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-500 disabled:opacity-50 transition">
              {saving ? "Saving…" : "Record Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
