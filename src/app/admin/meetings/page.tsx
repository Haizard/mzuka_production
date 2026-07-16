"use client";

import { useEffect, useState } from "react";
import { Video, Plus, X, Calendar, Clock, Users, ExternalLink, Maximize2, Minimize2 } from "lucide-react";

interface Meeting {
  id: string; title: string; description?: string; roomId: string;
  scheduledAt: string; endsAt?: string; isActive: boolean;
  createdBy: { id: string; name: string };
}

function fmt(d: string) {
  return new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", scheduledAt: "", endsAt: "" });
  const [creating, setCreating] = useState(false);

  async function load() {
    const res = await fetch("/api/meetings");
    if (res.ok) { const d = await res.json(); setMeetings(d.meetings ?? []); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.scheduledAt || creating) return;
    setCreating(true);
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      await load();
      setShowForm(false);
      setForm({ title: "", description: "", scheduledAt: "", endsAt: "" });
    }
    setCreating(false);
  }

  async function deactivate(id: string) {
    await fetch(`/api/meetings?id=${id}`, { method: "DELETE" });
    if (activeMeeting?.id === id) setActiveMeeting(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Video className="h-5 w-5 text-[var(--gold)]" /> Meeting Rooms
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">Create and manage virtual meetings — embedded inside the platform</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:opacity-90 transition"
        >
          <Plus className="h-4 w-4" /> New Meeting
        </button>
      </div>

      {/* Create Meeting Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white">Create Meeting Room</h2>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={create} className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Meeting Title *</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Pre-shoot Consultation"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--gold)]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Description</label>
                <textarea
                  rows={2}
                  placeholder="What is this meeting about?"
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--gold)]/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Start Time *</label>
                  <input
                    required
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--gold)]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">End Time</label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={e => setForm(p => ({ ...p, endsAt: e.target.value }))}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--gold)]/50"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-zinc-400 text-sm hover:bg-white/5 transition">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex-1 px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
                  {creating ? "Creating…" : "Create Meeting"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded Meeting Room */}
      {activeMeeting && (
        <div className={`bg-[var(--surface)] border border-[var(--gold)]/30 rounded-2xl overflow-hidden ${fullscreen ? "fixed inset-4 z-40" : ""}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">{activeMeeting.title}</span>
              <span className="text-xs text-zinc-500">Room: {activeMeeting.roomId}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFullscreen(f => !f)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition"
              >
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <a
                href={`https://meet.jit.si/${activeMeeting.roomId}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition"
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <button
                onClick={() => { setActiveMeeting(null); setFullscreen(false); }}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <iframe
            src={`https://meet.jit.si/${activeMeeting.roomId}#config.startWithAudioMuted=false&config.prejoinPageEnabled=false&appData.localStorageContent=null`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full"
            style={{ height: fullscreen ? "calc(100% - 53px)" : "520px", border: "none" }}
            title={activeMeeting.title}
          />
        </div>
      )}

      {/* Meeting list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-6 w-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-[var(--surface)] border border-white/10 rounded-2xl flex flex-col items-center justify-center py-16 gap-3">
          <Video className="h-12 w-12 text-zinc-700" />
          <p className="text-zinc-500 text-sm">No meetings scheduled yet</p>
          <button onClick={() => setShowForm(true)} className="text-[var(--gold)] text-sm hover:underline">Create your first meeting</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meetings.map(m => {
            const isActive = activeMeeting?.id === m.id;
            const isPast = m.endsAt ? new Date(m.endsAt) < new Date() : false;
            return (
              <div key={m.id} className={`bg-[var(--surface)] border rounded-2xl p-4 flex flex-col gap-3 ${isActive ? "border-[var(--gold)]/40" : "border-white/10"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{m.title}</h3>
                    {m.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{m.description}</p>}
                  </div>
                  <button
                    onClick={() => deactivate(m.id)}
                    className="shrink-0 p-1 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>{fmt(m.scheduledAt)}</span>
                  </div>
                  {m.endsAt && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>Ends {fmt(m.endsAt)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    <span>Created by {m.createdBy.name}</span>
                  </div>
                </div>

                <button
                  onClick={() => { setActiveMeeting(isActive ? null : m); if (!isActive) window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={isPast}
                  className={`mt-auto w-full py-2 rounded-xl text-sm font-semibold transition ${
                    isPast ? "bg-white/5 text-zinc-600 cursor-not-allowed" :
                    isActive ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                    "bg-[var(--gold)] text-black hover:opacity-90"
                  }`}
                >
                  {isPast ? "Meeting Ended" : isActive ? "Leave Meeting" : "Join Meeting"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
