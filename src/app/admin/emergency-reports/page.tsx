"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle, Plus, Clock, CheckCircle2, AlertOctagon,
  Search, Filter, ChevronDown, ChevronRight, X,
  Calendar, MapPin, Users, MessageSquare, ArrowUpCircle,
  FileText, RefreshCw, Eye,
} from "lucide-react";
import {
  fileEmergencyReport,
  listEmergencyReports,
  updateReportStatus,
  addReportUpdate,
  updateFollowUp,
  getReportStats,
} from "./actions";

/* ── Types ──────────────────────────────────────────────────────────────── */

type Report = any;
type Stats = any;

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const CATEGORIES = [
  { value: "SICKNESS", label: "Sickness / Illness", icon: "🤒" },
  { value: "INJURY", label: "Injury", icon: "🩹" },
  { value: "ACCIDENT", label: "Accident", icon: "⚡" },
  { value: "EQUIPMENT_DAMAGE", label: "Equipment Damage", icon: "📷" },
  { value: "CLIENT_COMPLAINT", label: "Client Complaint", icon: "😤" },
  { value: "STAFF_CONFLICT", label: "Staff Conflict", icon: "👥" },
  { value: "SAFETY_INCIDENT", label: "Safety Incident", icon: "🦺" },
  { value: "PROPERTY_DAMAGE", label: "Property Damage", icon: "🏚️" },
  { value: "FINANCIAL_DISCREPANCY", label: "Financial Discrepancy", icon: "💰" },
  { value: "OTHER", label: "Other", icon: "📋" },
];

const SEVERITIES = [
  { value: "LOW", label: "Low", colour: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20" },
  { value: "MEDIUM", label: "Medium", colour: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  { value: "HIGH", label: "High", colour: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  { value: "CRITICAL", label: "Critical", colour: "text-red-400 bg-red-500/10 border-red-500/20" },
];

const STATUSES = [
  { value: "OPEN", label: "Open", icon: Clock, colour: "text-amber-400" },
  { value: "UNDER_REVIEW", label: "Under Review", icon: Eye, colour: "text-blue-400" },
  { value: "ESCALATED", label: "Escalated", icon: ArrowUpCircle, colour: "text-red-400" },
  { value: "RESOLVED", label: "Resolved", icon: CheckCircle2, colour: "text-emerald-400" },
];

function severityBadge(s: string) {
  const sev = SEVERITIES.find((x) => x.value === s);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sev?.colour ?? "text-zinc-400 bg-zinc-500/10 border-zinc-500/20"}`}>
      {s === "CRITICAL" && <AlertOctagon className="h-3 w-3" />}
      {sev?.label ?? s}
    </span>
  );
}

function statusBadge(s: string) {
  const st = STATUSES.find((x) => x.value === s);
  const Icon = st?.icon ?? Clock;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${st?.colour ?? "text-zinc-400"}`}>
      <Icon className="h-3.5 w-3.5" />
      {st?.label ?? s}
    </span>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */

export default function EmergencyReportsPage() {
  const [view, setView] = useState<"dashboard" | "file" | "detail">("dashboard");
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats>(null);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const [reportsRes, statsRes] = await Promise.all([
      listEmergencyReports({ status: filterStatus, severity: filterSeverity, category: filterCategory, search }),
      getReportStats(),
    ]);
    if (reportsRes.success) setReports(reportsRes.data);
    if (statsRes.success) setStats(statsRes.data);
    setLoading(false);
  }, [filterStatus, filterSeverity, filterCategory, search]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-red-400 font-semibold">Emergency Reports</p>
          <h1 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            Incident &amp; Emergency Tracking
          </h1>
          <p className="mt-1 text-sm text-zinc-400">File, track, and resolve workplace incidents. All reports are retained as permanent records.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === "dashboard" ? "bg-[var(--gold)] text-black" : "bg-white/5 text-zinc-400 hover:text-white border border-white/10"}`}>
            Dashboard
          </button>
          <button onClick={() => setView("file")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === "file" ? "bg-red-500 text-white" : "bg-white/5 text-zinc-400 hover:text-white border border-white/10"}`}>
            <Plus className="h-4 w-4 inline mr-1" />
            File Report
          </button>
        </div>
      </div>

      {view === "dashboard" && (
        <DashboardView
          stats={stats}
          reports={reports}
          loading={loading}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          filterSeverity={filterSeverity} setFilterSeverity={setFilterSeverity}
          filterCategory={filterCategory} setFilterCategory={setFilterCategory}
          search={search} setSearch={setSearch}
          onSelectReport={(r: Report) => { setSelectedReport(r); setView("detail"); }}
          onRefresh={loadData}
        />
      )}

      {view === "file" && (
        <FileReportView
          onFiled={() => { setView("dashboard"); loadData(); }}
          onCancel={() => setView("dashboard")}
        />
      )}

      {view === "detail" && selectedReport && (
        <ReportDetailView
          report={selectedReport}
          onBack={() => setView("dashboard")}
          onRefresh={async () => {
            const res = await listEmergencyReports({ status: filterStatus, severity: filterSeverity, category: filterCategory, search });
            if (res.success) {
              const updated = res.data.find((r: any) => r.id === selectedReport.id);
              if (updated) setSelectedReport(updated);
            }
          }}
        />
      )}
    </div>
  );
}

/* ── Dashboard View ──────────────────────────────────────────────────────── */

function DashboardView({ stats, reports, loading, filterStatus, setFilterStatus, filterSeverity, setFilterSeverity, filterCategory, setFilterCategory, search, setSearch, onSelectReport, onRefresh }: any) {
  return (
    <>
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total Reports", value: stats.total, icon: FileText, colour: "text-zinc-300" },
            { label: "Open", value: stats.open, icon: Clock, colour: "text-amber-400" },
            { label: "Escalated", value: stats.escalated, icon: ArrowUpCircle, colour: "text-red-400" },
            { label: "Resolved", value: stats.resolved, icon: CheckCircle2, colour: "text-emerald-400" },
            { label: "Pending Follow-up", value: stats.pendingFollowUp, icon: Calendar, colour: "text-blue-400" },
            { label: "Critical Open", value: stats.criticalCount, icon: AlertOctagon, colour: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
              <s.icon className={`h-5 w-5 ${s.colour}`} />
              <p className={`mt-3 text-2xl font-bold ${s.colour}`}>{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Category Breakdown */}
      {stats?.byCategory?.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-5">
          <p className="text-sm font-semibold text-zinc-300 mb-3">Reports by Category</p>
          <div className="flex flex-wrap gap-3">
            {stats.byCategory.map((c: any) => {
              const cat = CATEGORIES.find((x) => x.value === c.category);
              return (
                <span key={c.category} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-zinc-300">
                  <span>{cat?.icon ?? "📋"}</span>
                  <span>{cat?.label ?? c.category}</span>
                  <span className="font-bold text-white">{c.count}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input type="text" placeholder="Search reports…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--gold)]/50" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none">
            <option value="ALL">All Status</option>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none">
            <option value="ALL">All Severity</option>
            {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none">
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
          <button onClick={onRefresh} className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading reports…
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No emergency reports found.</p>
          </div>
        ) : (
          reports.map((r: Report) => (
            <button key={r.id} onClick={() => onSelectReport(r)}
              className="w-full text-left rounded-xl border border-white/10 bg-[var(--surface)] p-5 hover:border-white/20 transition group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {severityBadge(r.severity)}
                    {statusBadge(r.status)}
                    <span className="text-xs text-zinc-500">
                      {CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-white mt-2 group-hover:text-[var(--gold)] transition truncate">{r.title}</h3>
                  <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{r.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(r.dateOfIncident).toLocaleDateString()}
                    </span>
                    <span>Filed by {r.reportedBy?.name}</span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                    {r.updates?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {r.updates.length} update{r.updates.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-600 group-hover:text-[var(--gold)] transition shrink-0 mt-1" />
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}

/* ── File Report View ────────────────────────────────────────────────────── */

function FileReportView({ onFiled, onCancel }: { onFiled: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    title: "",
    category: "SICKNESS",
    severity: "MEDIUM",
    description: "",
    staffInvolved: "",
    witnesses: "",
    location: "",
    dateOfIncident: new Date().toISOString().split("T")[0],
    followUpRequired: false,
    followUpDate: "",
    followUpNotes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.dateOfIncident) {
      setError("Title, description, and date are required.");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await fileEmergencyReport({
      ...form,
      followUpRequired: form.followUpRequired,
    });

    setSubmitting(false);
    if (res.success) {
      onFiled();
    } else {
      setError(res.error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
      <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-6 space-y-5">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          File Emergency / Incident Report
        </p>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Report Title *</label>
          <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Staff member fell ill during shoot"
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--gold)]/50" />
        </div>

        {/* Category + Severity row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Category *</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Severity *</label>
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none">
              {SEVERITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {/* Date of incident */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Date of Incident *</label>
          <input type="date" required value={form.dateOfIncident} onChange={(e) => setForm({ ...form, dateOfIncident: e.target.value })}
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[var(--gold)]/50" />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Detailed Description *</label>
          <p className="text-xs text-zinc-600 mb-1.5">Provide a factual, chronological account. This report may be used as a reference or evidence.</p>
          <textarea required rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What happened? Include timeline, people involved, actions taken, and current status…"
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--gold)]/50 resize-y" />
        </div>

        {/* Staff Involved + Witnesses */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Staff Involved</label>
            <input type="text" value={form.staffInvolved} onChange={(e) => setForm({ ...form, staffInvolved: e.target.value })}
              placeholder="Names of staff involved"
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--gold)]/50" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Witnesses</label>
            <input type="text" value={form.witnesses} onChange={(e) => setForm({ ...form, witnesses: e.target.value })}
              placeholder="Names of witnesses"
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--gold)]/50" />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Location</label>
          <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Where did this occur?"
            className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--gold)]/50" />
        </div>

        {/* Follow-up */}
        <div className="border-t border-white/10 pt-4 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.followUpRequired} onChange={(e) => setForm({ ...form, followUpRequired: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[var(--gold)] focus:ring-[var(--gold)]" />
            <span className="text-sm text-zinc-300">Follow-up required</span>
          </label>
          {form.followUpRequired && (
            <div className="grid gap-4 sm:grid-cols-2 pl-6">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Follow-up Date</label>
                <input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Follow-up Notes</label>
                <input type="text" value={form.followUpNotes} onChange={(e) => setForm({ ...form, followUpNotes: e.target.value })}
                  placeholder="What needs follow-up?"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none" />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel}
            className="px-4 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white bg-white/5 border border-white/10 transition">
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-500 text-white font-semibold text-sm hover:bg-red-600 disabled:opacity-50 transition">
            {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
            {submitting ? "Filing…" : "File Report"}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ── Detail View ─────────────────────────────────────────────────────────── */

function ReportDetailView({ report: initial, onBack, onRefresh }: { report: Report; onBack: () => void; onRefresh: () => Promise<void> }) {
  const [report, setReport] = useState(initial);
  const [newUpdate, setNewUpdate] = useState("");
  const [isEscalation, setIsEscalation] = useState(false);
  const [statusAction, setStatusAction] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddUpdate = async () => {
    if (!newUpdate.trim()) return;
    setSubmitting(true);
    const res = await addReportUpdate(report.id, newUpdate, isEscalation);
    setSubmitting(false);
    if (res.success) {
      setNewUpdate("");
      setIsEscalation(false);
      await onRefresh();
    }
  };

  const handleStatusChange = async (status: string) => {
    setSubmitting(true);
    const res = await updateReportStatus(report.id, status, status === "RESOLVED" ? resolutionNotes : undefined);
    setSubmitting(false);
    if (res.success) {
      setStatusAction("");
      setResolutionNotes("");
      await onRefresh();
    }
  };

  const cat = CATEGORIES.find((c) => c.value === report.category);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition">
        ← Back to Dashboard
      </button>

      {/* Report Header */}
      <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {severityBadge(report.severity)}
              {statusBadge(report.status)}
              <span className="text-xs text-zinc-500 bg-white/5 px-2 py-0.5 rounded-full">
                {cat?.icon} {cat?.label}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-3">{report.title}</h2>
          </div>

          {/* Quick status actions */}
          <div className="flex gap-2 shrink-0">
            {report.status !== "RESOLVED" && (
              <>
                {report.status !== "UNDER_REVIEW" && (
                  <button onClick={() => handleStatusChange("UNDER_REVIEW")} disabled={submitting}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition">
                    Review
                  </button>
                )}
                {report.status !== "ESCALATED" && (
                  <button onClick={() => handleStatusChange("ESCALATED")} disabled={submitting}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition">
                    Escalate
                  </button>
                )}
                <button onClick={() => setStatusAction(statusAction === "RESOLVED" ? "" : "RESOLVED")}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition">
                  Resolve
                </button>
              </>
            )}
          </div>
        </div>

        {/* Resolution form */}
        {statusAction === "RESOLVED" && (
          <div className="mt-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-3">
            <p className="text-sm text-emerald-300 font-medium">Mark as Resolved</p>
            <textarea rows={3} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Describe how this was resolved…"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none resize-y" />
            <div className="flex gap-2">
              <button onClick={() => handleStatusChange("RESOLVED")} disabled={submitting}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition">
                Confirm Resolution
              </button>
              <button onClick={() => setStatusAction("")}
                className="px-4 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white transition">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Report Details */}
        <div className="mt-5 space-y-4 border-t border-white/10 pt-4">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Description</p>
            <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{report.description}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DetailField icon={Calendar} label="Date of Incident" value={new Date(report.dateOfIncident).toLocaleDateString()} />
            <DetailField icon={MapPin} label="Location" value={report.location || "Not specified"} />
            <DetailField icon={Users} label="Staff Involved" value={report.staffInvolved || "None specified"} />
            <DetailField icon={Users} label="Witnesses" value={report.witnesses || "None specified"} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailField icon={FileText} label="Filed By" value={`${report.reportedBy?.name} — ${new Date(report.createdAt).toLocaleString()}`} />
            {report.resolvedBy && (
              <DetailField icon={CheckCircle2} label="Resolved By" value={`${report.resolvedBy.name} — ${report.resolvedAt ? new Date(report.resolvedAt).toLocaleString() : ""}`} />
            )}
          </div>

          {report.resolutionNotes && (
            <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-emerald-400 font-medium mb-1">Resolution Notes</p>
              <p className="text-sm text-zinc-300">{report.resolutionNotes}</p>
            </div>
          )}

          {/* Follow-up */}
          {report.followUpRequired && (
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <p className="text-xs text-blue-400 font-medium mb-1">📅 Follow-up Required</p>
              <p className="text-sm text-zinc-300">
                {report.followUpDate && `Scheduled: ${new Date(report.followUpDate).toLocaleDateString()}`}
                {report.followUpNotes && ` — ${report.followUpNotes}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Updates / Thread */}
      <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-6 space-y-4">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[var(--gold)]" />
          Updates &amp; Notes ({report.updates?.length ?? 0})
        </p>

        {report.updates?.length > 0 ? (
          <div className="space-y-3">
            {report.updates.map((u: any) => (
              <div key={u.id} className={`p-4 rounded-lg border ${u.isEscalation ? "bg-red-500/5 border-red-500/20" : "bg-white/5 border-white/10"}`}>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                  <span className="font-medium text-zinc-300">{u.author?.name}</span>
                  <span>·</span>
                  <span>{new Date(u.createdAt).toLocaleString()}</span>
                  {u.isEscalation && <span className="text-red-400 font-semibold">⬆ ESCALATED</span>}
                </div>
                <p className="text-sm text-zinc-200 whitespace-pre-wrap">{u.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No updates yet.</p>
        )}

        {/* Add update form */}
        {report.status !== "RESOLVED" && (
          <div className="border-t border-white/10 pt-4 space-y-3">
            <textarea rows={3} value={newUpdate} onChange={(e) => setNewUpdate(e.target.value)}
              placeholder="Add an update, note, or comment…"
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--gold)]/50 resize-y" />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isEscalation} onChange={(e) => setIsEscalation(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-red-500 focus:ring-red-500" />
                <span className="text-xs text-zinc-400">Mark as escalation</span>
              </label>
              <button onClick={handleAddUpdate} disabled={submitting || !newUpdate.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--gold)] text-black hover:bg-yellow-500 disabled:opacity-50 transition">
                {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                Add Update
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 flex items-center gap-1 mb-0.5">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="text-sm text-zinc-300">{value}</p>
    </div>
  );
}
