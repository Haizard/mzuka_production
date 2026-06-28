"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, XCircle, Package } from "lucide-react";
import { getPendingReturnsAction, reviewReturnRequestAction } from "../actions";

interface ReturnRequest {
  id: string;
  returnNote: string | null;
  submittedAt: Date;
  requestedBy: { id: string; name: string; email: string };
  assignment: {
    item: { name: string; serialNumber: string | null; category: { name: string } };
    task: {
      title: string;
      project: { booking: { client: { name: string } } };
    };
  };
}

function fmt(d: Date | string) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ReturnsPage() {
  const [returns, setReturns]   = useState<ReturnRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason]     = useState("");
  const [msg, setMsg]           = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getPendingReturnsAction();
    if (res.success) setReturns(res.returns as unknown as ReturnRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  };

  const approve = async (id: string) => {
    setActing(id);
    const res = await reviewReturnRequestAction(id, "APPROVED");
    if (res.success) { flash("Return approved — item marked available"); load(); }
    else flash(res.error ?? "Failed", false);
    setActing(null);
  };

  const reject = async () => {
    if (!rejectId) return;
    if (!reason.trim()) { flash("Rejection reason is required", false); return; }
    setActing(rejectId);
    const res = await reviewReturnRequestAction(rejectId, "REJECTED", reason);
    if (res.success) { flash("Return request rejected"); setRejectId(null); setReason(""); load(); }
    else flash(res.error ?? "Failed", false);
    setActing(null);
  };

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Production Manager</p>
          <h2 className="text-2xl font-bold text-white mt-1">Equipment Return Requests</h2>
          <p className="mt-1 text-sm text-zinc-400">Review and approve equipment returns from photographers and editors</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white transition">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {msg && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" : "border-red-500/20 bg-red-500/10 text-red-300"}`}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-zinc-500">Loading…</div>
      ) : returns.length === 0 ? (
        <div className="py-16 text-center rounded-lg border border-white/10 bg-[var(--surface)]">
          <Package className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400">No pending return requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map((r) => (
            <div key={r.id} className="rounded-lg border border-amber-500/20 bg-[var(--surface)] p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-semibold text-white">{r.assignment.item.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {r.assignment.item.category.name}
                    {r.assignment.item.serialNumber && ` · SN: ${r.assignment.item.serialNumber}`}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 shrink-0">Pending</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 text-sm mb-4">
                <div>
                  <p className="text-xs text-zinc-500">Staff Member</p>
                  <p className="text-white">{r.requestedBy.name}</p>
                  <p className="text-xs text-zinc-500">{r.requestedBy.email}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Task</p>
                  <p className="text-white">{r.assignment.task.title}</p>
                  <p className="text-xs text-zinc-400">{r.assignment.task.project.booking.client.name}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Submitted</p>
                  <p className="text-white">{fmt(r.submittedAt)}</p>
                </div>
              </div>

              {r.returnNote && (
                <div className="mb-4 rounded-lg bg-white/5 p-3">
                  <p className="text-xs text-zinc-500 mb-1">Return note</p>
                  <p className="text-sm text-zinc-300 italic">{r.returnNote}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => approve(r.id)} disabled={acting === r.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-sm font-medium transition disabled:opacity-50">
                  <CheckCircle2 className="h-4 w-4" /> Approve Return
                </button>
                <button onClick={() => { setRejectId(r.id); setReason(""); }} disabled={acting === r.id}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600/15 hover:bg-red-600/30 text-red-400 text-sm font-medium transition disabled:opacity-50">
                  <XCircle className="h-4 w-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--surface)] p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Reject Return Request</h3>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Reason for rejection *</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                placeholder="Explain why the return is rejected…" maxLength={500}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-400 resize-none" />
              <p className="text-xs text-zinc-600 mt-1 text-right">{reason.length}/500</p>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setRejectId(null); setReason(""); }}
                className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">Cancel</button>
              <button onClick={reject} disabled={!!acting}
                className="px-4 py-2 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-300 text-sm font-semibold disabled:opacity-50 transition">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
