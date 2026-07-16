"use client";

import { useEffect, useState } from "react";
import { Video, Calendar, Clock, Users, ExternalLink, X, Maximize2, Minimize2 } from "lucide-react";

interface Meeting {
  id: string; title: string; description?: string; roomId: string;
  scheduledAt: string; endsAt?: string; isActive: boolean;
  createdBy: { id: string; name: string };
}

function fmt(d: string) {
  return new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export default function StaffMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    fetch("/api/meetings")
      .then(r => r.ok ? r.json() : { meetings: [] })
      .then(d => { setMeetings(d.meetings ?? []); setLoading(false); });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Video className="h-5 w-5 text-[var(--gold)]" /> Team Meetings
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">Virtual meetings scheduled by the admin team</p>
      </div>

      {activeMeeting && (
        <div className={`bg-[var(--surface)] border border-[var(--gold)]/30 rounded-2xl overflow-hidden ${fullscreen ? "fixed inset-4 z-50" : ""}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-semibold text-white">{activeMeeting.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setFullscreen(f => !f)} className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition">
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <a href={`https://meet.jit.si/${activeMeeting.roomId}`} target="_blank" rel="noreferrer"
                className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition">
                <ExternalLink className="h-4 w-4" />
              </a>
              <button onClick={() => { setActiveMeeting(null); setFullscreen(false); }}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <iframe
            src={`https://meet.jit.si/${activeMeeting.roomId}#config.startWithAudioMuted=false&config.prejoinPageEnabled=false`}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full"
            style={{ height: fullscreen ? "calc(100% - 53px)" : "500px", border: "none" }}
            title={activeMeeting.title}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="h-6 w-6 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="bg-[var(--surface)] border border-white/10 rounded-2xl flex flex-col items-center justify-center py-16 gap-3">
          <Video className="h-12 w-12 text-zinc-700" />
          <p className="text-zinc-500 text-sm">No meetings scheduled</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {meetings.map(m => {
            const isActive = activeMeeting?.id === m.id;
            const isPast = m.endsAt ? new Date(m.endsAt) < new Date() : false;
            return (
              <div key={m.id} className={`bg-[var(--surface)] border rounded-2xl p-4 flex flex-col gap-3 ${isActive ? "border-[var(--gold)]/40" : "border-white/10"}`}>
                <div>
                  <h3 className="text-sm font-semibold text-white">{m.title}</h3>
                  {m.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{m.description}</p>}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Calendar className="h-3.5 w-3.5" /><span>{fmt(m.scheduledAt)}</span>
                  </div>
                  {m.endsAt && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock className="h-3.5 w-3.5" /><span>Ends {fmt(m.endsAt)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Users className="h-3.5 w-3.5" /><span>By {m.createdBy.name}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setActiveMeeting(isActive ? null : m); if (!isActive) window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={isPast}
                  className={`w-full py-2 rounded-xl text-sm font-semibold transition ${
                    isPast ? "bg-white/5 text-zinc-600 cursor-not-allowed" :
                    isActive ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                    "bg-[var(--gold)] text-black hover:opacity-90"
                  }`}
                >
                  {isPast ? "Ended" : isActive ? "Leave Meeting" : "Join Meeting"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
