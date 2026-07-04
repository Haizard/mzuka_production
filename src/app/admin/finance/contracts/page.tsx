"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus, Trash2, RefreshCw, FileSignature, Send,
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import type { ContractStatus } from "@prisma/client";
import {
  getAllContracts, createContractAction, updateContractStatusAction,
  deleteContractAction, getApprovedClients,
} from "../actions";
import { getAllBookings } from "@/app/admin/bookings/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Contract {
  id: string; title: string; body: string; status: ContractStatus;
  signedAt: Date | null; expiresAt: Date | null; createdAt: Date;
  client:  { id: string; name: string; email: string };
  booking: { id: string; title: string } | null;
}
interface Client  { id: string; name: string; email: string }
interface Booking { id: string; title: string; client: { name: string } }

const STATUS_COLOURS: Record<ContractStatus, string> = {
  DRAFT:     "bg-zinc-700/50 text-zinc-400",
  SENT:      "bg-blue-500/15 text-blue-300",
  SIGNED:    "bg-emerald-500/15 text-emerald-300",
  EXPIRED:   "bg-amber-500/15 text-amber-300",
  CANCELLED: "bg-zinc-800/60 text-zinc-500",
};

const CONTRACT_TEMPLATE = `SERVICE AGREEMENT — MUZUKA GILBERT

This agreement is entered into between Muzuka Gilbert Photography ("Photographer") and the client named below ("Client").

SERVICES
The Photographer agrees to provide the following services:
[Describe services here]

EVENT DETAILS
Date: [Event Date]
Location: [Location]
Duration: [Hours]

PAYMENT TERMS
Total Fee: $[Amount]
Deposit (50%): $[Deposit] — due upon signing
Balance: Due 7 days before the event

DELIVERABLES
The Photographer will deliver edited photos within [X] weeks of the event date, made available through the secure Muzuka Gilbert gallery platform.

GALLERY ACCESS
All images are protected. The Client may not share, download, or distribute images without prior written consent from the Photographer. Gallery access expires [X] days after delivery.

COPYRIGHT
All images remain the intellectual property of Muzuka Gilbert. The Client is granted a personal-use licence only.

CANCELLATION POLICY
Cancellations within 14 days of the event will forfeit the full deposit.

By signing below, both parties agree to the terms stated above.

Photographer: Muzuka Gilbert
Client: [Client Name]
Date: [Date]`;

function fmt(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients,   setClients]   = useState<Client[]>([]);
  const [bookings,  setBookings]  = useState<Booking[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showNew,   setShowNew]   = useState(false);
  const [filter,    setFilter]    = useState<ContractStatus | "ALL">("ALL");
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [acting,    setActing]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [ctrRes, cliRes, bkRes] = await Promise.all([
      getAllContracts(),
      getApprovedClients(),
      getAllBookings({ limit: 200 }),
    ]);
    if (ctrRes.success) setContracts(ctrRes.contracts as unknown as Contract[]);
    if (cliRes.success) setClients(cliRes.clients);
    if (bkRes.success)  setBookings(bkRes.bookings as unknown as Booking[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const changeStatus = async (id: string, status: ContractStatus) => {
    setActing(id);
    await updateContractStatusAction(id, status);
    await load();
    setActing(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this contract?")) return;
    setActing(id);
    await deleteContractAction(id);
    await load();
    setActing(null);
  };

  const filtered = filter === "ALL" ? contracts : contracts.filter((c) => c.status === filter);

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Finance</p>
          <h2 className="text-2xl font-bold text-white mt-1">Contracts</h2>
          <p className="mt-1 text-sm text-zinc-400">Digital agreements and client records</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white transition"><RefreshCw className="h-4 w-4" /></button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-500 transition">
            <Plus className="h-4 w-4" /> New Contract
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {(["ALL","DRAFT","SENT","SIGNED","EXPIRED"] as const).map((s) => {
          const count = s === "ALL" ? contracts.length : contracts.filter((c) => c.status === s).length;
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-lg border p-4 text-left transition ${filter === s ? "border-[var(--gold)]/40 bg-[var(--gold)]/5" : "border-white/10 bg-[var(--surface)] hover:border-white/20"}`}>
              <p className="text-xl font-bold text-white">{count}</p>
              <p className="text-xs text-zinc-500 capitalize mt-0.5">{s.toLowerCase()}</p>
            </button>
          );
        })}
      </div>

      {/* Contract list */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500">Loading contracts…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-lg border border-white/10 bg-[var(--surface)] text-zinc-500">No contracts found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((contract) => {
            const isExp = expanded === contract.id;
            const isExpired = contract.expiresAt ? new Date(contract.expiresAt) < new Date() : false;
            return (
              <div key={contract.id} className="rounded-lg border border-white/10 bg-[var(--surface)]">
                {/* Summary row */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition"
                  onClick={() => setExpanded(isExp ? null : contract.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLOURS[contract.status]}`}>
                        {contract.status}
                      </span>
                      {isExpired && contract.status !== "EXPIRED" && (
                        <span className="text-xs text-amber-400">⚠ Expired</span>
                      )}
                    </div>
                    <p className="mt-1.5 font-semibold text-white">{contract.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {contract.client.name} · {contract.booking?.title ?? "No booking"} · {fmt(contract.createdAt)}
                    </p>
                    {contract.signedAt && (
                      <p className="text-xs text-emerald-400 mt-0.5">✓ Signed {fmt(contract.signedAt)}</p>
                    )}
                  </div>
                  <div className="ml-4 shrink-0">
                    {isExp ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                  </div>
                </div>

                {/* Expanded body + actions */}
                {isExp && (
                  <div className="px-5 pb-5 border-t border-white/10 pt-4 space-y-4">
                    <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed bg-white/5 rounded-lg p-4 max-h-64 overflow-y-auto">
                      {contract.body}
                    </pre>
                    {contract.expiresAt && (
                      <p className="text-xs text-zinc-500">Expires: {fmt(contract.expiresAt)}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {contract.status === "DRAFT" && (
                        <button onClick={() => changeStatus(contract.id, "SENT")} disabled={acting === contract.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 transition disabled:opacity-50">
                          <Send className="h-3.5 w-3.5" /> Mark Sent
                        </button>
                      )}
                      {["DRAFT","SENT"].includes(contract.status) && (
                        <button onClick={() => changeStatus(contract.id, "SIGNED")} disabled={acting === contract.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition disabled:opacity-50">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark Signed
                        </button>
                      )}
                      {contract.status !== "EXPIRED" && contract.status !== "CANCELLED" && (
                        <button onClick={() => changeStatus(contract.id, "EXPIRED")} disabled={acting === contract.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition disabled:opacity-50">
                          <Clock className="h-3.5 w-3.5" /> Mark Expired
                        </button>
                      )}
                      {contract.status !== "CANCELLED" && (
                        <button onClick={() => changeStatus(contract.id, "CANCELLED")} disabled={acting === contract.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-zinc-700/40 hover:bg-zinc-700/70 text-zinc-400 transition disabled:opacity-50">
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </button>
                      )}
                      <button onClick={() => remove(contract.id)} disabled={acting === contract.id}
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
        <NewContractModal
          clients={clients}
          bookings={bookings}
          onClose={() => setShowNew(false)}
          onCreated={load}
        />
      )}
    </main>
  );
}

// ── New Contract Modal ────────────────────────────────────────────────────────

function NewContractModal({ clients, bookings, onClose, onCreated }: {
  clients: Client[]; bookings: Booking[];
  onClose: () => void; onCreated: () => void;
}) {
  const [clientId,  setClientId]  = useState("");
  const [bookingId, setBookingId] = useState("");
  const [title,     setTitle]     = useState("");
  const [body,      setBody]      = useState(CONTRACT_TEMPLATE);
  const [expiresAt, setExpiresAt] = useState("");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { setError("Select a client"); return; }
    if (!title.trim() || !body.trim()) { setError("Title and contract body are required"); return; }
    setSaving(true);
    const res = await createContractAction({
      clientId, bookingId: bookingId || undefined,
      title, body,
      expiresAt: expiresAt || undefined,
    });
    if (res.success) { onCreated(); onClose(); }
    else { setError(res.error ?? "Failed"); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl mb-10">
        <div className="flex items-center gap-3 mb-5">
          <FileSignature className="h-5 w-5 text-[var(--gold)]" />
          <h3 className="text-lg font-semibold text-white">New Contract</h3>
        </div>
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
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Contract Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required
              placeholder="e.g. Wedding Photography Agreement"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Contract Body *</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16} required
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-zinc-200 font-mono focus:outline-none focus:border-[var(--gold)] resize-y" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Expiry Date (optional)</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-500 disabled:opacity-50 transition">
              {saving ? "Saving…" : "Create Contract"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
