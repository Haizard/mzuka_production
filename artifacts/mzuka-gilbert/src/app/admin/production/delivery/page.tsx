"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  PackageCheck, Clock, Lock, Unlock, RefreshCw,
  CheckCircle2, AlertTriangle, ExternalLink,
} from "lucide-react";
import { getDeliveryStatus, markDeliveredAction } from "../actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = "SHOOTING" | "CULLING" | "EDITING" | "REVIEW" | "DELIVERED" | "ARCHIVED";

interface Project {
  id: string;
  stage: Stage;
  deliveredAt: Date | null;
  editDueDate: Date | null;
  booking: {
    id: string;
    title: string;
    serviceType: string;
    scheduledAt: Date;
    client: { id: string; name: string; email: string };
    package: { name: string } | null;
    payments: { status: string; amountCents: number }[];
    gallery: {
      id: string;
      isDownloadOpen: boolean;
      expiresAt: Date | null;
      mediaAssets: { id: string; releaseStatus: string }[];
    } | null;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function deliveryScore(project: Project): { label: string; colour: string; pct: number } {
  const gallery = project.booking.gallery;
  const isPaid = project.booking.payments.some((p) => p.status === "PAID");
  const released = gallery?.mediaAssets.filter((a) => a.releaseStatus === "RELEASED").length ?? 0;
  const total    = gallery?.mediaAssets.length ?? 0;
  const isDelivered = project.stage === "DELIVERED";
  const expired = gallery?.expiresAt ? new Date(gallery.expiresAt) < new Date() : false;

  if (isDelivered && isPaid && released > 0) return { label: "Complete", colour: "text-emerald-400", pct: 100 };
  if (expired)   return { label: "Expired",   colour: "text-red-400",   pct: 20 };
  if (!isPaid)   return { label: "Unpaid",    colour: "text-amber-400", pct: 40 };
  if (total === 0) return { label: "No media", colour: "text-zinc-500", pct: 10 };
  if (released < total) return { label: `${released}/${total} released`, colour: "text-violet-400", pct: Math.round((released / total) * 80) };
  return { label: "Ready", colour: "text-blue-400", pct: 80 };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DeliveryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"all" | "pending" | "delivered">("all");
  const [marking, setMarking]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getDeliveryStatus();
    if (res.success) setProjects(res.projects as unknown as Project[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const handleMarkDelivered = async (projectId: string) => {
    if (!confirm("Mark this project as delivered?")) return;
    setMarking(projectId);
    await markDeliveredAction(projectId);
    await load();
    setMarking(null);
  };

  const filtered = projects.filter((p) => {
    if (filter === "delivered") return p.stage === "DELIVERED";
    if (filter === "pending")   return p.stage !== "DELIVERED" && p.stage !== "ARCHIVED";
    return true;
  });

  // Summary counts
  const total     = projects.length;
  const delivered = projects.filter((p) => p.stage === "DELIVERED").length;
  const pending   = projects.filter((p) => !["DELIVERED","ARCHIVED"].includes(p.stage)).length;
  const overdue   = projects.filter((p) =>
    p.editDueDate && new Date(p.editDueDate) < new Date() && !["DELIVERED","ARCHIVED"].includes(p.stage)
  ).length;

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Delivery Status</h2>
          <p className="mt-1 text-sm text-zinc-400">Track gallery delivery for every project</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Total",     value: total,     colour: "text-white",         icon: PackageCheck },
          { label: "Delivered", value: delivered, colour: "text-emerald-400",   icon: CheckCircle2 },
          { label: "Pending",   value: pending,   colour: "text-amber-400",     icon: Clock },
          { label: "Overdue",   value: overdue,   colour: "text-red-400",       icon: AlertTriangle },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-white/10 bg-[var(--surface)] p-4 flex items-center gap-3">
            <s.icon className={`h-6 w-6 ${s.colour} shrink-0`} />
            <div>
              <p className={`text-2xl font-bold ${s.colour}`}>{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all","pending","delivered"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition ${
              filter === f ? "bg-white/15 text-white border-white/20" : "border-white/10 text-zinc-400 hover:text-white"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500">Loading delivery data…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-lg border border-white/10 bg-[var(--surface)] text-zinc-500">
          No projects found
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 bg-[var(--surface)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-zinc-500 uppercase tracking-wider">
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Stage</th>
                  <th className="px-5 py-3">Gallery</th>
                  <th className="px-5 py-3">Delivery</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((project) => {
                  const score    = deliveryScore(project);
                  const gallery  = project.booking.gallery;
                  const isPaid   = project.booking.payments.some((p) => p.status === "PAID");
                  const released = gallery?.mediaAssets.filter((a) => a.releaseStatus === "RELEASED").length ?? 0;
                  const total_assets = gallery?.mediaAssets.length ?? 0;
                  const isOverdue = project.editDueDate && new Date(project.editDueDate) < new Date() && !["DELIVERED","ARCHIVED"].includes(project.stage);

                  return (
                    <tr key={project.id} className="hover:bg-white/5 transition">
                      {/* Project */}
                      <td className="px-5 py-4">
                        <div>
                          <Link href={`/admin/production/${project.id}`}
                            className="font-medium text-white hover:text-[var(--gold)] transition flex items-center gap-1">
                            {project.booking.title}
                            <ExternalLink className="h-3 w-3 opacity-50" />
                          </Link>
                          <p className="text-xs text-zinc-500 mt-0.5">{project.booking.serviceType} · {fmt(project.booking.scheduledAt)}</p>
                        </div>
                      </td>

                      {/* Client */}
                      <td className="px-5 py-4">
                        <p className="text-white">{project.booking.client.name}</p>
                        <p className="text-xs text-zinc-500">{project.booking.client.email}</p>
                      </td>

                      {/* Stage */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className={`text-xs font-medium ${
                            project.stage === "DELIVERED" ? "text-emerald-400" :
                            project.stage === "REVIEW"    ? "text-amber-400"   :
                            project.stage === "EDITING"   ? "text-violet-400"  : "text-zinc-400"
                          }`}>{project.stage}</span>
                          {isOverdue && (
                            <p className="text-xs text-red-400 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Overdue
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Gallery */}
                      <td className="px-5 py-4">
                        {!gallery ? (
                          <span className="text-zinc-600 text-xs">Not created</span>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-xs text-zinc-300">{released}/{total_assets} released</p>
                            <div className="flex items-center gap-1.5 text-xs">
                              {isPaid
                                ? <><Unlock className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">Paid</span></>
                                : <><Lock className="h-3.5 w-3.5 text-amber-400" /><span className="text-amber-400">Unpaid</span></>
                              }
                            </div>
                            {gallery.expiresAt && (
                              <p className="text-xs text-zinc-500">Expires {fmt(gallery.expiresAt)}</p>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Delivery progress */}
                      <td className="px-5 py-4">
                        <div>
                          <p className={`text-xs font-medium ${score.colour}`}>{score.label}</p>
                          <div className="mt-1.5 w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-[var(--gold)] transition-all" style={{ width: `${score.pct}%` }} />
                          </div>
                          {project.deliveredAt && (
                            <p className="text-xs text-zinc-500 mt-1">{fmt(project.deliveredAt)}</p>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {gallery && (
                            <Link href={`/admin/security`}
                              className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white transition">
                              Permissions
                            </Link>
                          )}
                          {!["DELIVERED","ARCHIVED"].includes(project.stage) && (
                            <button
                              onClick={() => handleMarkDelivered(project.id)}
                              disabled={marking === project.id}
                              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 transition disabled:opacity-50"
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                              {marking === project.id ? "…" : "Mark Delivered"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
