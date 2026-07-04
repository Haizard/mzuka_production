"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Trash2, RefreshCw, Send, CheckCircle2, XCircle,
  Clock, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import type { InvoiceStatus } from "@prisma/client";
import {
  getAllInvoices, createInvoiceAction, updateInvoiceStatusAction,
  deleteInvoiceAction, getApprovedClients,
} from "../actions";
import { getAllBookings } from "@/app/admin/bookings/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InvoiceItem { id: string; description: string; quantity: number; unitCents: number; totalCents: number }
interface Invoice {
  id: string; number: string; status: InvoiceStatus;
  subtotalCents: number; taxCents: number; totalCents: number; currency: string;
  notes: string | null; dueAt: Date | null; paidAt: Date | null; createdAt: Date;
  client: { id: string; name: string; email: string };
  booking: { id: string; title: string; serviceType: string } | null;
  items: InvoiceItem[];
}
interface Client  { id: string; name: string; email: string }
interface Booking { id: string; title: string; client: { name: string } }

const STATUS_COLOURS: Record<InvoiceStatus, string> = {
  DRAFT:     "bg-zinc-700/50 text-zinc-400",
  SENT:      "bg-blue-500/15 text-blue-300",
  PAID:      "bg-emerald-500/15 text-emerald-300",
  OVERDUE:   "bg-red-500/15 text-red-300",
  CANCELLED: "bg-zinc-800/60 text-zinc-500",
};

const STATUS_ICON: Record<InvoiceStatus, React.ElementType> = {
  DRAFT:     FileText,
  SENT:      Send,
  PAID:      CheckCircle2,
  OVERDUE:   Clock,
  CANCELLED: XCircle,
};

function usd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmt(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [invoices,  setInvoices]  = useState<Invoice[]>([]);
  const [clients,   setClients]   = useState<Client[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [showNew,   setShowNew]   = useState(false);
  const [filter,    setFilter]    = useState<InvoiceStatus | "ALL">("ALL");
  const [acting,    setActing]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [invRes, cliRes, bkRes] = await Promise.all([
      getAllInvoices(),
      getApprovedClients(),
      getAllBookings({ limit: 200 }),
    ]);
    if (invRes.success) setInvoices(invRes.invoices as unknown as Invoice[]);
    if (cliRes.success) setClients(cliRes.clients);
    if (bkRes.success)  setBookings(bkRes.bookings as unknown as Booking[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const changeStatus = async (id: string, status: InvoiceStatus) => {
    setActing(id);
    await updateInvoiceStatusAction(id, status);
    await load();
    setActing(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    setActing(id);
    await deleteInvoiceAction(id);
    await load();
    setActing(null);
  };

  const filtered = filter === "ALL" ? invoices : invoices.filter((i) => i.status === filter);

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Finance</p>
          <h2 className="text-2xl font-bold text-white mt-1">Invoices</h2>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white transition"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-500 transition">
            <Plus className="h-4 w-4" /> New Invoice
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", "DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition capitalize ${
              filter === s ? "bg-white/15 text-white border-white/20" : "border-white/10 text-zinc-400 hover:text-white"
            }`}>
            {s.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500">Loading invoices…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-lg border border-white/10 bg-[var(--surface)] text-zinc-500">No invoices found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const Icon = STATUS_ICON[inv.status];
            const isExp = expanded === inv.id;
            return (
              <div key={inv.id} className="rounded-lg border border-white/10 bg-[var(--surface)]">
                {/* Summary row */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition"
                  onClick={() => setExpanded(isExp ? null : inv.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOURS[inv.status]}`}>
                        <Icon className="h-3 w-3" />{inv.status}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">{inv.number}</span>
                    </div>
                    <p className="mt-1.5 font-semibold text-white">{inv.client.name}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {inv.booking?.title ?? "No booking"} · Due {fmt(inv.dueAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4 shrink-0">
                    <p className="text-lg font-bold text-[var(--gold)]">{usd(inv.totalCents)}</p>
                    {isExp ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExp && (
                  <div className="px-5 pb-5 border-t border-white/10 pt-4 space-y-4">
                    {/* Line items */}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-zinc-500 border-b border-white/10">
                          <th className="pb-2">Description</th>
                          <th className="pb-2 text-right">Qty</th>
                          <th className="pb-2 text-right">Unit</th>
                          <th className="pb-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {inv.items.map((item) => (
                          <tr key={item.id} className="text-zinc-300">
                            <td className="py-2">{item.description}</td>
                            <td className="py-2 text-right text-zinc-400">{item.quantity}</td>
                            <td className="py-2 text-right text-zinc-400">{usd(item.unitCents)}</td>
                            <td className="py-2 text-right font-medium">{usd(item.totalCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/10 text-sm">
                          <td colSpan={3} className="pt-2 text-right text-zinc-400">Subtotal</td>
                          <td className="pt-2 text-right text-white">{usd(inv.subtotalCents)}</td>
                        </tr>
                        {inv.taxCents > 0 && (
                          <tr className="text-sm">
                            <td colSpan={3} className="text-right text-zinc-400">Tax</td>
                            <td className="text-right text-white">{usd(inv.taxCents)}</td>
                          </tr>
                        )}
                        <tr className="text-sm font-bold">
                          <td colSpan={3} className="text-right text-[var(--gold)]">Total</td>
                          <td className="text-right text-[var(--gold)]">{usd(inv.totalCents)}</td>
                        </tr>
                      </tfoot>
                    </table>

                    {inv.notes && <p className="text-xs text-zinc-400 italic">{inv.notes}</p>}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {inv.status === "DRAFT" && (
                        <button onClick={() => changeStatus(inv.id, "SENT")} disabled={acting === inv.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition disabled:opacity-50">
                          <Send className="h-3.5 w-3.5" /> Mark Sent
                        </button>
                      )}
                      {["DRAFT","SENT","OVERDUE"].includes(inv.status) && (
                        <button onClick={() => changeStatus(inv.id, "PAID")} disabled={acting === inv.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition disabled:opacity-50">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark Paid
                        </button>
                      )}
                      {["SENT","PAID"].includes(inv.status) && (
                        <button onClick={() => changeStatus(inv.id, "OVERDUE")} disabled={acting === inv.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition disabled:opacity-50">
                          <Clock className="h-3.5 w-3.5" /> Mark Overdue
                        </button>
                      )}
                      {inv.status !== "CANCELLED" && (
                        <button onClick={() => changeStatus(inv.id, "CANCELLED")} disabled={acting === inv.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-zinc-700/40 hover:bg-zinc-700/70 text-zinc-400 transition disabled:opacity-50">
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </button>
                      )}
                      <button onClick={() => remove(inv.id)} disabled={acting === inv.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-600/15 hover:bg-red-600/30 text-red-400 transition disabled:opacity-50 ml-auto">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewInvoiceModal
          clients={clients}
          bookings={bookings}
          onClose={() => setShowNew(false)}
          onCreated={load}
        />
      )}
    </main>
  );
}

// ── New Invoice Modal ─────────────────────────────────────────────────────────

function NewInvoiceModal({ clients, bookings, onClose, onCreated }: {
  clients: Client[]; bookings: Booking[];
  onClose: () => void; onCreated: () => void;
}) {
  const [clientId,   setClientId]   = useState("");
  const [bookingId,  setBookingId]  = useState("");
  const [dueAt,      setDueAt]      = useState("");
  const [taxPercent, setTaxPercent] = useState(0);
  const [notes,      setNotes]      = useState("");
  const [items,      setItems]      = useState([{ description: "", quantity: 1, unitCents: 0 }]);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");

  const addItem    = () => setItems((p) => [...p, { description: "", quantity: 1, unitCents: 0 }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const setItem    = (i: number, field: string, val: string | number) =>
    setItems((p) => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitCents, 0);
  const tax      = Math.round(subtotal * taxPercent / 100);
  const total    = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { setError("Select a client"); return; }
    if (items.some((i) => !i.description.trim())) { setError("All items need a description"); return; }
    setSaving(true);
    const res = await createInvoiceAction({
      clientId, bookingId: bookingId || undefined,
      items, notes: notes || undefined,
      dueAt: dueAt || undefined, taxPercent,
    });
    if (res.success) { onCreated(); onClose(); }
    else { setError(res.error ?? "Failed"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl rounded-xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-5">New Invoice</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Client *</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} required
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
                <option value="">Select client…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Booking (optional)</label>
              <select value={bookingId} onChange={(e) => setBookingId(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]">
                <option value="">None</option>
                {bookings.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-400">Line Items</label>
              <button type="button" onClick={addItem} className="text-xs text-[var(--gold)] hover:underline">+ Add item</button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    value={item.description}
                    onChange={(e) => setItem(i, "description", e.target.value)}
                    placeholder="Description"
                    className="col-span-5 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--gold)]"
                  />
                  <input type="number" min={1}
                    value={item.quantity}
                    onChange={(e) => setItem(i, "quantity", parseInt(e.target.value) || 1)}
                    className="col-span-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-[var(--gold)]"
                  />
                  <input type="number" min={0} step={0.01}
                    value={(item.unitCents / 100).toFixed(2)}
                    onChange={(e) => setItem(i, "unitCents", Math.round(parseFloat(e.target.value || "0") * 100))}
                    placeholder="0.00"
                    className="col-span-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white text-right focus:outline-none focus:border-[var(--gold)]"
                  />
                  <span className="col-span-1 text-xs text-zinc-400 text-right">
                    ${((item.quantity * item.unitCents) / 100).toFixed(0)}
                  </span>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="col-span-1 text-zinc-600 hover:text-red-400 transition text-center">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tax + totals */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Tax %</label>
              <input type="number" min={0} max={100} value={taxPercent}
                onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Due Date</label>
              <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
            </div>
          </div>

          <div className="rounded-lg bg-white/5 p-3 text-sm space-y-1">
            <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span>${(subtotal/100).toFixed(2)}</span></div>
            {tax > 0 && <div className="flex justify-between text-zinc-400"><span>Tax</span><span>${(tax/100).toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-[var(--gold)] border-t border-white/10 pt-1 mt-1"><span>Total</span><span>${(total/100).toFixed(2)}</span></div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)] resize-none" />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-500 disabled:opacity-50 transition">
              {saving ? "Creating…" : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
