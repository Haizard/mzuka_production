"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Camera, Film, Scissors, Eye, PackageCheck, Archive,
  AlertTriangle, RefreshCw, Plus, ChevronRight,
} from "lucide-react";
import { getAllProjects, getProductionStats, createProjectAction } from "./actions";
import { getAllBookings } from "@/app/admin/bookings/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = "SHOOTING" | "CULLING" | "EDITING" | "REVIEW" | "DELIVERED" | "ARCHIVED";

interface Project {
  id: string;
  stage: Stage;
  shootDate: Date | null;
  editDueDate: Date | null;
  deliveredAt: Date | null;
  booking: {
    id: string;
    title: string;
    serviceType: string;
    scheduledAt: Date;
    location: string | null;
    client: { id: string; name: string; email: string };
    package: { name: string; priceCents: number } | null;
    payments: { status: string; amountCents: number }[];
    gallery: { id: string; mediaAssets: { id: string }[] } | null;
  };
  tasks: { id: string; status: string }[];
  assignments: { id: string; role: string; staff: { id: string; name: string } }[];
}

interface Stats {
  total: number;
  shooting: number;
  editing: number;
  review: number;
  delivered: number;
  overdue: number;
}

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGES: { value: Stage; label: string; icon: React.ElementType; colour: string }[] = [
  { value: "SHOOTING",  label: "Shooting",  icon: Camera,      colour: "text-blue-400" },
  { value: "CULLING",   label: "Culling",   icon: Film,        colour: "text-yellow-400" },
  { value: "EDITING",   label: "Editing",   icon: Scissors,    colour: "text-violet-400" },
  { value: "REVIEW",    label: "Review",    icon: Eye,         colour: "text-amber-400" },
  { value: "DELIVERED", label: "Delivered", icon: PackageCheck, colour: "text-emerald-400" },
  { value: "ARCHIVED",  label: "Archived",  icon: Archive,     colour: "text-zinc-500" },
];

const stageColour: Record<Stage, string> = {
  SHOOTING:  "bg-blue-500/15 text-blue-300 border-blue-500/30",
  CULLING:   "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  EDITING:   "bg-violet-500/15 text-violet-300 border-violet-500/30",
  REVIEW:    "bg-amber-500/15 text-amber-300 border-amber-500/30",
  DELIVERED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  ARCHIVED:  "bg-zinc-800/60 text-zinc-500 border-zinc-700",
};

function fmt(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProductionPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Stage | "ALL">("ALL");
  const [showNewProject, setShowNewProject] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [pRes, sRes] = await Promise.all([getAllProjects(), getProductionStats()]);
    if (pRes.success) setProjects(pRes.projects as unknown as Project[]);
    if (sRes.success && sRes.stats) setStats(sRes.stats);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const filtered = filter === "ALL" ? projects : projects.filter((p) => p.stage === filter);

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Production</h2>
          <p className="mt-1 text-sm text-zinc-400">Pipeline, tasks, staff, and delivery tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-500 transition"
          >
            <Plus className="h-4 w-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total",     value: stats.total,     colour: "text-white" },
            { label: "Shooting",  value: stats.shooting,  colour: "text-blue-400" },
            { label: "Editing",   value: stats.editing,   colour: "text-violet-400" },
            { label: "Review",    value: stats.review,    colour: "text-amber-400" },
            { label: "Delivered", value: stats.delivered, colour: "text-emerald-400" },
            { label: "Overdue",   value: stats.overdue,   colour: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-white/10 bg-[var(--surface)] p-4 text-center">
              <p className={`text-2xl font-bold ${s.colour}`}>{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stage filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${filter === "ALL" ? "bg-white/15 text-white border-white/20" : "border-white/10 text-zinc-400 hover:text-white"}`}
        >
          All
        </button>
        {STAGES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${filter === s.value ? `${stageColour[s.value]} border-current` : "border-white/10 text-zinc-400 hover:text-white"}`}
          >
            <s.icon className="h-3.5 w-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Project list */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500">Loading projects…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-lg border border-white/10 bg-[var(--surface)]">
          <Camera className="h-10 w-10 mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500">No projects yet. Create one from a confirmed booking.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((project) => {
            const doneTasks = project.tasks.filter((t) => t.status === "DONE").length;
            const isOverdue = project.editDueDate && new Date(project.editDueDate) < new Date()
              && !["DELIVERED", "ARCHIVED"].includes(project.stage);
            const isPaid = project.booking.payments.some((p) => p.status === "PAID");

            return (
              <Link
                key={project.id}
                href={`/admin/production/${project.id}`}
                className="block rounded-lg border border-white/10 bg-[var(--surface)] p-5 hover:border-white/20 transition group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${stageColour[project.stage]}`}>
                        {project.stage}
                      </span>
                      {isOverdue && (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <AlertTriangle className="h-3 w-3" /> Overdue
                        </span>
                      )}
                      {isPaid && <span className="text-xs text-emerald-400">✓ Paid</span>}
                    </div>

                    <h3 className="mt-2 font-semibold text-white text-lg">{project.booking.title}</h3>
                    <p className="text-sm text-zinc-400">
                      {project.booking.serviceType} · {project.booking.client.name}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
                      <span>📅 Shoot: {fmt(project.shootDate ?? project.booking.scheduledAt)}</span>
                      {project.editDueDate && <span>✂️ Due: {fmt(project.editDueDate)}</span>}
                      {project.booking.location && <span>📍 {project.booking.location}</span>}
                      {project.tasks.length > 0 && (
                        <span>✅ Tasks: {doneTasks}/{project.tasks.length}</span>
                      )}
                      {project.assignments.length > 0 && (
                        <span>👤 {project.assignments.map((a) => a.staff.name).join(", ")}</span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-zinc-300 shrink-0 mt-1 transition" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* New project modal */}
      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} onCreated={load} />
      )}
    </main>
  );
}

// ── New project modal ─────────────────────────────────────────────────────────

function NewProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [bookings, setBookings] = useState<{ id: string; title: string; client: { name: string } }[]>([]);
  const [bookingId, setBookingId] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getAllBookings({ status: "CONFIRMED", limit: 100 }).then((res) => {
      if (res.success) setBookings(res.bookings as typeof bookings);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId) { setError("Select a booking"); return; }
    setSaving(true);
    const result = await createProjectAction(bookingId, { shootDate, editDueDate, notes });
    if (result.success) {
      onCreated();
      onClose();
    } else {
      setError(result.error ?? "Failed");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[var(--surface)] p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-5">New Production Project</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Booking *</label>
            <select
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]"
              required
            >
              <option value="">Select confirmed booking…</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>{b.title} — {b.client.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Shoot date</label>
              <input type="datetime-local" value={shootDate} onChange={(e) => setShootDate(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Edit due date</label>
              <input type="datetime-local" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)]" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Internal production notes…"
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--gold)] resize-none" />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">Cancel</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-semibold hover:bg-yellow-500 disabled:opacity-50 transition">
              {saving ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
