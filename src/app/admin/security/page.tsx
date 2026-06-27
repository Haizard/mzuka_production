"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Shield,
  Eye,
  Download,
  Share2,
  Clock,
  XCircle,
  RefreshCw,
  Activity,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import {
  getSecurityStats,
  getAuditLogs,
  getAccessLogs,
  updateGalleryPermissionsAction,
  revokeGalleryAccessAction,
} from "./actions";
import { getAdminGalleries } from "@/app/admin/galleries/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: Date;
  actor: { name: string; email: string } | null;
}

interface AccessEntry {
  id: string;
  action: string;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  gallery: { id: string; title: string; slug: string } | null;
}

interface GalleryRow {
  id: string;
  title: string;
  slug: string;
  isDownloadOpen: boolean;
  isShareOpen: boolean;
  watermarkText: string | null;
  expiresAt: Date | null;
  booking: { title: string; client: { name: string; email: string } };
}

interface Stats {
  totalAccess: number;
  previewAccess: number;
  fullAccess: number;
  totalDownloads: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function actionColour(action: string): string {
  if (action.includes("APPROVED") || action.includes("RECEIVED") || action.includes("RELEASED"))
    return "text-emerald-400";
  if (action.includes("REVOKED") || action.includes("FAILED"))
    return "text-red-400";
  if (action.includes("LOGIN") || action.includes("VIEWED"))
    return "text-blue-400";
  return "text-zinc-400";
}

function fmt(d: Date | string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const [tab, setTab] = useState<"overview" | "audit" | "access" | "galleries">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessEntry[]>([]);
  const [galleries, setGalleries] = useState<GalleryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [statsRes, auditRes, accessRes, galRes] = await Promise.all([
      getSecurityStats(),
      getAuditLogs({ limit: 50 }),
      getAccessLogs(),
      getAdminGalleries(),
    ]);

    if (statsRes.success && statsRes.stats) {
      setStats(statsRes.stats);
      setRecentLogs((statsRes.recentAuditLogs ?? []) as AuditEntry[]);
    }
    if (auditRes.success) setAuditLogs(auditRes.logs as AuditEntry[]);
    if (accessRes.success) setAccessLogs(accessRes.logs as AccessEntry[]);
    if (galRes.success) setGalleries(galRes.galleries as unknown as GalleryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Gallery permission toggle
  const togglePermission = async (
    galleryId: string,
    field: "isDownloadOpen" | "isShareOpen",
    current: boolean
  ) => {
    setActionLoading(`${galleryId}-${field}`);
    await updateGalleryPermissionsAction(galleryId, { [field]: !current });
    await loadData();
    setActionLoading(null);
  };

  // Revoke gallery
  const revokeAccess = async (galleryId: string) => {
    if (!confirm("Revoke all access to this gallery immediately? The client will lose access right now.")) return;
    setActionLoading(`${galleryId}-revoke`);
    await revokeGalleryAccessAction(galleryId);
    await loadData();
    setActionLoading(null);
  };

  // Update expiry
  const updateExpiry = async (galleryId: string, days: number) => {
    setActionLoading(`${galleryId}-expiry`);
    const expiresAt = days === 0 ? null : new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await updateGalleryPermissionsAction(galleryId, { expiresAt });
    await loadData();
    setActionLoading(null);
  };

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-[var(--gold)]" />
            Security &amp; Access Control
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Audit logs, gallery permissions, access monitoring, and rate limiting
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white hover:border-white/20 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        {(["overview", "audit", "access", "galleries"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition border-b-2 -mb-px ${
              tab === t
                ? "border-[var(--gold)] text-[var(--gold)]"
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {t === "galleries" ? "Gallery Permissions" : t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-zinc-500">Loading security data…</div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === "overview" && stats && (
            <div className="space-y-6">
              {/* Stats row */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Total Gallery Views", value: stats.totalAccess, icon: Eye, colour: "text-blue-400" },
                  { label: "Preview Views", value: stats.previewAccess, icon: Lock, colour: "text-amber-400" },
                  { label: "Full-Access Views", value: stats.fullAccess, icon: Unlock, colour: "text-emerald-400" },
                  { label: "Downloads", value: stats.totalDownloads, icon: Download, colour: "text-violet-400" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
                    <s.icon className={`h-5 w-5 ${s.colour}`} />
                    <p className="mt-4 text-3xl font-bold text-white">{s.value}</p>
                    <p className="mt-1 text-sm text-zinc-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent activity */}
              <div className="rounded-lg border border-white/10 bg-[var(--surface)]">
                <div className="px-6 py-4 border-b border-white/10">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[var(--gold)]" />
                    Recent Activity (last 10 events)
                  </h3>
                </div>
                <div className="divide-y divide-white/5">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className={`text-xs font-mono font-semibold shrink-0 ${actionColour(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-sm text-zinc-300 truncate">
                          {log.actor ? `${log.actor.name}` : "System"}
                        </span>
                        {log.entity && (
                          <span className="text-xs text-zinc-500 hidden sm:block">
                            {log.entity} {log.entityId?.slice(0, 8)}…
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 shrink-0 ml-4">{fmt(log.createdAt)}</span>
                    </div>
                  ))}
                  {recentLogs.length === 0 && (
                    <p className="px-6 py-8 text-center text-zinc-500">No activity yet</p>
                  )}
                </div>
              </div>

              {/* Legal disclaimer */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200 space-y-1">
                  <p className="font-semibold">Screenshot &amp; External Camera Notice</p>
                  <p>
                    This platform applies CSS-based screenshot deterrence and dynamic watermarks on all preview images.
                    These measures significantly increase the cost of unauthorized copying but <strong>cannot fully prevent</strong> a
                    person photographing the screen with another device.
                    Dynamic watermarks embed the client's name and email into every preview —
                    any leaked image can be traced back to the recipient.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── AUDIT LOG ── */}
          {tab === "audit" && (
            <div className="rounded-lg border border-white/10 bg-[var(--surface)] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  Audit Log ({auditLogs.length} entries)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-zinc-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Action</th>
                      <th className="px-6 py-3">Actor</th>
                      <th className="px-6 py-3">Entity</th>
                      <th className="px-6 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition">
                        <td className="px-6 py-3">
                          <span className={`font-mono text-xs font-semibold ${actionColour(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-zinc-300">
                          {log.actor ? (
                            <div>
                              <p>{log.actor.name}</p>
                              <p className="text-xs text-zinc-500">{log.actor.email}</p>
                            </div>
                          ) : (
                            <span className="text-zinc-500">System</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-zinc-400">
                          {log.entity && (
                            <span className="text-xs">{log.entity}<br /><span className="text-zinc-600">{log.entityId?.slice(0, 12)}…</span></span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-zinc-500 text-xs">{fmt(log.createdAt)}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-zinc-500">No audit entries yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ACCESS LOG ── */}
          {tab === "access" && (
            <div className="rounded-lg border border-white/10 bg-[var(--surface)] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">
                  Gallery Access Log ({accessLogs.length} entries)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-zinc-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Gallery</th>
                      <th className="px-6 py-3">Action</th>
                      <th className="px-6 py-3">IP Address</th>
                      <th className="px-6 py-3">User Agent</th>
                      <th className="px-6 py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {accessLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition">
                        <td className="px-6 py-3 text-zinc-300">
                          <p className="font-medium">{log.gallery?.title ?? "—"}</p>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-semibold font-mono ${
                            log.action === "FULL_ACCESS" ? "text-emerald-400" : "text-amber-400"
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-zinc-400 text-xs font-mono">
                          {log.ipAddress ?? "—"}
                        </td>
                        <td className="px-6 py-3 text-zinc-500 text-xs max-w-[180px] truncate">
                          {log.userAgent ?? "—"}
                        </td>
                        <td className="px-6 py-3 text-zinc-500 text-xs">{fmt(log.createdAt)}</td>
                      </tr>
                    ))}
                    {accessLogs.length === 0 && (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No access events yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── GALLERY PERMISSIONS ── */}
          {tab === "galleries" && (
            <div className="space-y-3">
              {galleries.map((gallery) => {
                const isExp = expanded === gallery.id;
                const expired = gallery.expiresAt ? new Date(gallery.expiresAt) < new Date() : false;

                return (
                  <div key={gallery.id} className="rounded-lg border border-white/10 bg-[var(--surface)]">
                    {/* Summary row */}
                    <div
                      className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/5 transition"
                      onClick={() => setExpanded(isExp ? null : gallery.id)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="font-semibold text-white truncate">{gallery.title}</p>
                          {expired && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Expired</span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-400 mt-0.5">
                          {gallery.booking.client.name} · {gallery.booking.client.email}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        {/* Quick status pills */}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${gallery.isDownloadOpen ? "bg-emerald-500/15 text-emerald-400" : "bg-zinc-700/50 text-zinc-500"}`}>
                          <Download className="inline h-3 w-3 mr-1" />{gallery.isDownloadOpen ? "DL On" : "DL Off"}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${gallery.isShareOpen ? "bg-blue-500/15 text-blue-400" : "bg-zinc-700/50 text-zinc-500"}`}>
                          <Share2 className="inline h-3 w-3 mr-1" />{gallery.isShareOpen ? "Share On" : "Share Off"}
                        </span>
                        {isExp ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                      </div>
                    </div>

                    {/* Expanded controls */}
                    {isExp && (
                      <div className="px-5 pb-5 border-t border-white/10 space-y-4 pt-4">
                        {/* Toggle row */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          {/* Download toggle */}
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <div>
                              <p className="text-sm font-medium text-white">Allow Downloads</p>
                              <p className="text-xs text-zinc-400">Client can download full-quality files</p>
                            </div>
                            <button
                              onClick={() => togglePermission(gallery.id, "isDownloadOpen", gallery.isDownloadOpen)}
                              disabled={actionLoading === `${gallery.id}-isDownloadOpen`}
                              className={`relative w-11 h-6 rounded-full transition-colors ${gallery.isDownloadOpen ? "bg-emerald-500" : "bg-zinc-700"}`}
                            >
                              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${gallery.isDownloadOpen ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>

                          {/* Share toggle */}
                          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                            <div>
                              <p className="text-sm font-medium text-white">Allow Sharing</p>
                              <p className="text-xs text-zinc-400">Client can share gallery link</p>
                            </div>
                            <button
                              onClick={() => togglePermission(gallery.id, "isShareOpen", gallery.isShareOpen)}
                              disabled={actionLoading === `${gallery.id}-isShareOpen`}
                              className={`relative w-11 h-6 rounded-full transition-colors ${gallery.isShareOpen ? "bg-blue-500" : "bg-zinc-700"}`}
                            >
                              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${gallery.isShareOpen ? "translate-x-6" : "translate-x-1"}`} />
                            </button>
                          </div>
                        </div>

                        {/* Expiry controls */}
                        <div className="p-3 rounded-lg bg-white/5">
                          <p className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4 text-zinc-400" />
                            Gallery Expiry
                          </p>
                          <p className="text-xs text-zinc-400 mb-3">
                            Current:{" "}
                            {gallery.expiresAt
                              ? `${fmt(gallery.expiresAt)}${expired ? " (expired)" : ""}`
                              : "Never"}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {[7, 14, 30, 60, 90].map((days) => (
                              <button
                                key={days}
                                onClick={() => updateExpiry(gallery.id, days)}
                                disabled={actionLoading === `${gallery.id}-expiry`}
                                className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-50"
                              >
                                +{days}d
                              </button>
                            ))}
                            <button
                              onClick={() => updateExpiry(gallery.id, 0)}
                              disabled={actionLoading === `${gallery.id}-expiry`}
                              className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-zinc-300 transition disabled:opacity-50"
                            >
                              No expiry
                            </button>
                          </div>
                        </div>

                        {/* Revoke access */}
                        <div className="flex justify-end">
                          <button
                            onClick={() => revokeAccess(gallery.id)}
                            disabled={actionLoading === `${gallery.id}-revoke`}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm font-medium transition disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />
                            Revoke Access Immediately
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {galleries.length === 0 && (
                <div className="py-16 text-center text-zinc-500">No galleries yet</div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
