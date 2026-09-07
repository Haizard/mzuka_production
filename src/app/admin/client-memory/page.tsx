"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Brain, Search, Loader2, CheckCircle2, User, CalendarDays,
  DollarSign, MessageCircle, ChevronDown, ChevronUp, Heart,
  Phone, Mail, Edit3, Save, X, RefreshCw,
} from "lucide-react";
import { getAllClientMemories, getClientMemory, updateClientMemory, refreshClientStats } from "./actions";

interface ClientMemoryItem {
  id: string | null;
  clientId: string;
  preferredName: string | null;
  birthday: string | null;
  anniversary: string | null;
  preferredContact: string | null;
  notes: string | null;
  preferences: Record<string, unknown> | null;
  totalSessions: number;
  totalSpentCents: number;
  lastSessionAt: string | null;
  lastContactAt: string | null;
  client: { id: string; name: string; email: string; phone: string | null; createdAt: string };
  isNew?: boolean;
}

interface ClientDetail {
  memory: { id: string | null; preferredName: string | null; birthday: string | null; anniversary: string | null; preferredContact: string | null; notes: string | null; preferences: Record<string, unknown> | null; totalSessions: number; totalSpentCents: number; lastSessionAt: string | null; lastContactAt: string | null } | null;
  client: { id: string; name: string; email: string; phone: string | null; createdAt: string };
  bookings: Array<{ id: string; title: string; serviceType: string; status: string; scheduledAt: string; paymentStatus: string; payments: Array<{ amountCents: number; status: string }> }>;
  messages: Array<{ id: string; subject: string; channel: string; createdAt: string }>;
  stats: { totalSessions: number; totalSpentCents: number; lastSessionAt: string | null };
}

function usd(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ClientMemoryPage() {
  const [memories, setMemories] = useState<ClientMemoryItem[]>([]);
  const [newClients, setNewClients] = useState<ClientMemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ preferredName: string; birthday: string; anniversary: string; preferredContact: string; notes: string }>({ preferredName: "", birthday: "", anniversary: "", preferredContact: "email", notes: "" });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getAllClientMemories();
    if (data.success) {
      setMemories(data.memories as ClientMemoryItem[]);
      setNewClients((data.newClients ?? []) as ClientMemoryItem[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelect = async (clientId: string) => {
    if (selectedClientId === clientId) {
      setSelectedClientId(null);
      setDetail(null);
      return;
    }
    setSelectedClientId(clientId);
    setDetailLoading(true);
    setEditing(false);
    const data = await getClientMemory(clientId);
    if (data.success) {
      setDetail(data as unknown as ClientDetail);
      const mem = data.memory;
      setEditForm({
        preferredName: mem?.preferredName ?? "",
        birthday: mem?.birthday ? new Date(mem.birthday).toISOString().split("T")[0] : "",
        anniversary: mem?.anniversary ? new Date(mem.anniversary).toISOString().split("T")[0] : "",
        preferredContact: mem?.preferredContact ?? "email",
        notes: mem?.notes ?? "",
      });
    }
    setDetailLoading(false);
  };

  const handleSave = async () => {
    if (!selectedClientId) return;
    setActionLoading("save");
    const res = await updateClientMemory(selectedClientId, {
      preferredName: editForm.preferredName || undefined,
      birthday: editForm.birthday ? new Date(editForm.birthday) : null,
      anniversary: editForm.anniversary ? new Date(editForm.anniversary) : null,
      preferredContact: editForm.preferredContact,
      notes: editForm.notes || undefined,
    });
    if (res.success) {
      flash("Client memory updated");
      setEditing(false);
      await handleSelect(selectedClientId);
    }
    setActionLoading(null);
  };

  const handleRefresh = async (clientId: string) => {
    setActionLoading(clientId + "refresh");
    await refreshClientStats(clientId);
    await handleSelect(clientId);
    await loadData();
    setActionLoading(null);
  };

  const allClients = [...memories, ...newClients];
  const filtered = allClients.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.client.name.toLowerCase().includes(q) || m.client.email.toLowerCase().includes(q);
  });

  return (
    <main className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Client Relations</p>
        <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <Brain className="h-6 w-6 text-[var(--gold)]" />
          Client Memory
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Track client preferences, history, and personal details</p>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
        </div>
      )}

      {/* Search */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search clients…"
          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--gold)]"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Client list */}
        <div className="lg:col-span-2 space-y-2">
          {loading ? (
            <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-8 text-center text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-8 text-center text-zinc-500">
              <Brain className="h-6 w-6 mx-auto mb-2 opacity-40" /> No clients found
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[70vh] overflow-y-auto">
              {filtered.map((m) => (
                <button
                  key={m.clientId}
                  onClick={() => handleSelect(m.clientId)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    selectedClientId === m.clientId
                      ? "border-[var(--gold)]/40 bg-[var(--gold)]/5"
                      : "border-white/10 bg-[var(--surface)] hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[var(--gold)]/20 flex items-center justify-center text-xs font-bold text-[var(--gold)] shrink-0">
                      {m.client.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{m.preferredName || m.client.name}</p>
                      <p className="text-[10px] text-zinc-500 truncate">{m.client.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-emerald-400">{m.totalSessions} sessions</p>
                      <p className="text-[10px] text-zinc-600">{usd(m.totalSpentCents)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-3">
          {detailLoading ? (
            <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-12 text-center text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Loading client details…
            </div>
          ) : !detail ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-[var(--surface)] p-12 text-center text-zinc-500">
              <User className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a client to view their memory</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Client header */}
              <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--gold)]/20 flex items-center justify-center text-lg font-bold text-[var(--gold)]">
                      {detail.client.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white">
                        {detail.memory?.preferredName || detail.client.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {detail.client.email}</span>
                        {detail.client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {detail.client.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRefresh(detail.client.id)}
                      disabled={actionLoading === detail.client.id + "refresh"}
                      className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition"
                    >
                      <RefreshCw className={`h-4 w-4 ${actionLoading === detail.client.id + "refresh" ? "animate-spin" : ""}`} />
                    </button>
                    <button
                      onClick={() => setEditing(!editing)}
                      className={`p-2 rounded-lg border transition ${editing ? "border-[var(--gold)]/40 bg-[var(--gold)]/10 text-[var(--gold)]" : "border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"}`}
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
                  {[
                    { label: "Sessions", value: detail.stats.totalSessions, icon: CalendarDays, colour: "text-blue-400" },
                    { label: "Total Spent", value: usd(detail.stats.totalSpentCents), icon: DollarSign, colour: "text-emerald-400" },
                    { label: "Last Session", value: fmtDate(detail.stats.lastSessionAt), icon: Heart, colour: "text-rose-400" },
                  ].map(({ label, value, icon: Icon, colour }) => (
                    <div key={label} className="text-center">
                      <Icon className={`h-4 w-4 ${colour} mx-auto mb-1`} />
                      <p className={`text-sm font-bold ${colour}`}>{value}</p>
                      <p className="text-[10px] text-zinc-600">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit form */}
              {editing && (
                <div className="rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-5 space-y-3">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Edit Client Memory</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Preferred Name</label>
                      <input value={editForm.preferredName} onChange={(e) => setEditForm({ ...editForm, preferredName: e.target.value })}
                        placeholder="How they like to be called"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--gold)]/40" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Preferred Contact</label>
                      <select value={editForm.preferredContact} onChange={(e) => setEditForm({ ...editForm, preferredContact: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--gold)]/40">
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Birthday</label>
                      <input type="date" value={editForm.birthday} onChange={(e) => setEditForm({ ...editForm, birthday: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--gold)]/40" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Anniversary</label>
                      <input type="date" value={editForm.anniversary} onChange={(e) => setEditForm({ ...editForm, anniversary: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--gold)]/40" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Notes</label>
                    <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      placeholder="Preferences, special requests, personality notes…"
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--gold)]/40 resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} disabled={actionLoading === "save"}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-xs font-semibold hover:bg-yellow-400 transition disabled:opacity-50">
                      {actionLoading === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save
                    </button>
                    <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border border-white/10 text-zinc-400 text-xs hover:text-white transition">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Recent bookings */}
              {detail.bookings.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-[var(--surface)] overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/10">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Booking History ({detail.bookings.length})</h3>
                  </div>
                  <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                    {detail.bookings.map((b) => {
                      const paid = b.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amountCents, 0);
                      const statusColour: Record<string, string> = {
                        REQUESTED: "text-blue-300", CONFIRMED: "text-emerald-300",
                        IN_PROGRESS: "text-amber-300", COMPLETED: "text-violet-300", CANCELLED: "text-red-300",
                      };
                      return (
                        <div key={b.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition">
                          <div>
                            <p className="text-sm text-white">{b.title}</p>
                            <p className="text-[10px] text-zinc-500">{b.serviceType} · {fmtDate(b.scheduledAt)}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-xs font-semibold ${statusColour[b.status] ?? "text-zinc-400"}`}>{b.status}</p>
                            <p className="text-[10px] text-emerald-400">{paid > 0 ? usd(paid) : "—"}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent messages */}
              {detail.messages.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-[var(--surface)] overflow-hidden">
                  <div className="px-5 py-3 border-b border-white/10">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                      <MessageCircle className="h-3.5 w-3.5" /> Recent Communications
                    </h3>
                  </div>
                  <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                    {detail.messages.map((m) => (
                      <div key={m.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-white/5 transition">
                        <div className="min-w-0">
                          <p className="text-xs text-white truncate">{m.subject}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${m.channel === "email" ? "text-blue-300 bg-blue-500/10" : "text-emerald-300 bg-emerald-500/10"}`}>
                            {m.channel.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-600 shrink-0">{fmtDate(m.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
