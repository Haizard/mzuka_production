"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, User, Users, Check } from "lucide-react";
import { createProjectAction } from "../actions";

interface Booking {
  id: string; title: string; clientName: string;
  eventType: string; scheduledAt: string;
}

interface StaffMember {
  id: string; name: string; email: string; staffRole: string | null;
}

export function NewProjectForm({ bookings, staff }: {
  bookings: Booking[];
  staff: StaffMember[];
}) {
  const router = useRouter();
  const [bookingId,   setBookingId]   = useState("");
  const [shootDate,   setShootDate]   = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [notes,       setNotes]       = useState("");
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  const selected = bookings.find((b) => b.id === bookingId);

  const roleColour: Record<string, string> = {
    PHOTOGRAPHER:       "text-blue-300",
    VIDEO_EDITOR:       "text-cyan-300",
    EDITOR:             "text-indigo-300",
    PRODUCTION_MANAGER: "text-violet-300",
    COORDINATOR:        "text-emerald-300",
    ASSISTANT:          "text-zinc-400",
    DRIVER:             "text-amber-300",
    HUMAN_RESOURCE:     "text-rose-300",
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) { setError("Please select a booking"); return; }
    setSaving(true);
    setError("");

    const res = await createProjectAction(bookingId, {
      shootDate:   shootDate   || undefined,
      editDueDate: editDueDate || undefined,
      notes:       notes       || undefined,
    });

    if (res.success && res.project) {
      router.push(`/admin/production/${res.project.id}`);
    } else {
      setError(res.error ?? "Failed to create project");
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-6 sticky top-4">
      <h3 className="text-lg font-semibold text-white mb-5">Project Setup</h3>

      <form onSubmit={submit} className="space-y-5">
        {/* Booking selector */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            Select Booking *
          </label>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {bookings.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBookingId(b.id)}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  bookingId === b.id
                    ? "border-[var(--gold)] bg-[var(--gold)]/10"
                    : "border-white/10 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{b.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{b.clientName} · {b.eventType}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(b.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  {bookingId === b.id && (
                    <Check className="h-4 w-4 text-[var(--gold)] shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected booking summary */}
        {selected && (
          <div className="rounded-lg border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-3">
            <p className="text-xs text-[var(--gold)] font-semibold mb-1">Selected</p>
            <p className="text-sm text-white font-medium">{selected.title}</p>
            <p className="text-xs text-zinc-400">{selected.clientName}</p>
          </div>
        )}

        {/* Dates */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Shoot Date
            </label>
            <input
              type="datetime-local"
              value={shootDate}
              onChange={(e) => setShootDate(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
              Edit Due Date
            </label>
            <input
              type="datetime-local"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)] transition"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
            Internal Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Special requirements, equipment notes, call times…"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)] transition resize-none placeholder-zinc-600"
          />
        </div>

        {/* Staff reference */}
        {staff.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              <Users className="inline h-3.5 w-3.5 mr-1" />
              Available Staff ({staff.length})
            </label>
            <div className="rounded-lg bg-white/5 border border-white/10 p-3 max-h-36 overflow-y-auto space-y-1">
              {staff.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-zinc-600 shrink-0" />
                    <span className="text-zinc-300">{s.name}</span>
                  </div>
                  <span className={`${roleColour[s.staffRole ?? ""] ?? "text-zinc-500"}`}>
                    {s.staffRole?.replace("_"," ") ?? "—"}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-1.5">
              Staff assignment is done after project creation on the project detail page.
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!bookingId || saving}
          className="w-full py-3 rounded-xl bg-[var(--gold)] text-black font-bold hover:bg-yellow-400 disabled:opacity-40 transition text-sm"
        >
          {saving ? "Creating Project…" : "Create Production Project"}
        </button>
      </form>
    </div>
  );
}
