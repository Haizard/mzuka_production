"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarOff, Clock, CheckCircle2, XCircle, Loader2,
  Filter, Users, Stethoscope, ChevronDown, ChevronUp,
  Ban, Search,
} from "lucide-react";
import { getLeaveRequests, getLeaveSummary, reviewLeaveAction, cancelLeaveAction } from "./actions";

interface LeaveRequest {
  id: string;
  staffId: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  reviewedById: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  staff: { id: string; name: string; email: string; staffRole: string | null };
  reviewedBy: { id: string; name: string } | null;
}

interface StaffMember {
  id: string;
  name: string;
  staffRole: string | null;
}

interface Summary {
  pendingCount: number;
  approvedThisMonth: number;
  approvedThisYear: number;
  rejectedThisYear: number;
  totalStaff: number;
  sickDaysThisYear: number;
}

const LEAVE_TYPES: Record<string, { label: string; colour: string }> = {
  ANNUAL:    { label: "Annual",    colour: "bg-blue-500/15 text-blue-300" },
  SICK:      { label: "Sick",      colour: "bg-rose-500/15 text-rose-300" },
  PERSONAL:  { label: "Personal",  colour: "bg-violet-500/15 text-violet-300" },
  MATERNITY: { label: "Maternity", colour: "bg-pink-500/15 text-pink-300" },
  PATERNITY: { label: "Paternity", colour: "bg-cyan-500/15 text-cyan-300" },
  UNPAID:    { label: "Unpaid",    colour: "bg-zinc-500/15 text-zinc-400" },
  OTHER:     { label: "Other",     colour: "bg-amber-500/15 text-amber-300" },
};

const STATUS_COLOURS: Record<string, string> = {
  PENDING:   "bg-amber-500/15 text-amber-300",
  APPROVED:  "bg-emerald-500/15 text-emerald-300",
  REJECTED:  "bg-red-500/15 text-red-300",
  CANCELLED: "bg-zinc-500/15 text-zinc-400",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysBetween(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function LeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [data, sum] = await Promise.all([getLeaveRequests(), getLeaveSummary()]);
    if (data.success) {
      setRequests(data.requests as LeaveRequest[]);
      setStaff(data.staff as StaffMember[]);
    }
    if (sum.success && sum.stats) setSummary(sum.stats as Summary);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleReview = async (id: string, decision: "APPROVED" | "REJECTED") => {
    setActionLoading(id + decision);
    const res = await reviewLeaveAction(id, decision, reviewNote || undefined);
    if (res.success) {
      flash(`Leave request ${decision.toLowerCase()}`);
      setExpanded(null);
      setReviewNote("");
      await loadData();
    }
    setActionLoading(null);
  };

  const handleCancel = async (id: string) => {
    setActionLoading(id + "CANCEL");
    const res = await cancelLeaveAction(id);
    if (res.success) {
      flash("Leave request cancelled");
      await loadData();
    }
    setActionLoading(null);
  };

  const filtered = requests.filter((r) => {
    if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return r.staff.name.toLowerCase().includes(q) || r.staff.email.toLowerCase().includes(q);
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  return (
    <main className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Human Resources</p>
        <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <CalendarOff className="h-6 w-6 text-[var(--gold)]" />
          Leave Management
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Manage staff leave requests, approvals, and balances</p>
      </div>

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex items-center gap-3 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
        </div>
      )}

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Pending", value: summary.pendingCount, icon: Clock, colour: "text-amber-400" },
            { label: "Approved (Month)", value: summary.approvedThisMonth, icon: CheckCircle2, colour: "text-emerald-400" },
            { label: "Approved (Year)", value: summary.approvedThisYear, icon: CheckCircle2, colour: "text-emerald-400" },
            { label: "Rejected (Year)", value: summary.rejectedThisYear, icon: XCircle, colour: "text-red-400" },
            { label: "Sick Days (Year)", value: summary.sickDaysThisYear, icon: Stethoscope, colour: "text-rose-400" },
            { label: "Total Staff", value: summary.totalStaff, icon: Users, colour: "text-blue-400" },
          ].map(({ label, value, icon: Icon, colour }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
              <Icon className={`h-4 w-4 ${colour}`} />
              <p className={`text-2xl font-bold mt-2 ${colour}`}>{value}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                filterStatus === s ? "bg-white/15 text-white border-white/20" : "border-white/10 text-zinc-400 hover:text-white"
              }`}>
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              {s === "PENDING" && pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--gold)]"
          />
        </div>
      </div>

      {/* Leave requests list */}
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-12 text-center text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading leave requests…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-12 text-center text-zinc-500">
          <CalendarOff className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{searchQuery ? "No matching leave requests" : "No leave requests yet"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const isExpanded = expanded === req.id;
            const typeInfo = LEAVE_TYPES[req.type] ?? LEAVE_TYPES.OTHER;
            const days = daysBetween(req.startDate, req.endDate);

            return (
              <div key={req.id} className={`rounded-xl border bg-[var(--surface)] transition ${
                req.status === "PENDING" ? "border-amber-500/20" : "border-white/10"
              }`}>
                {/* Summary row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : req.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition rounded-xl"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--gold)]/20 flex items-center justify-center text-sm font-bold text-[var(--gold)] shrink-0">
                      {req.staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white truncate">{req.staff.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeInfo.colour}`}>
                          {typeInfo.label}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOURS[req.status]}`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {fmtDate(req.startDate)} — {fmtDate(req.endDate)} ({days} day{days > 1 ? "s" : ""})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {req.status === "PENDING" && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    )}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Employee</p>
                        <p className="text-sm text-white">{req.staff.name}</p>
                        <p className="text-xs text-zinc-500">{req.staff.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Requested</p>
                        <p className="text-sm text-white">{fmtDate(req.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Start Date</p>
                        <p className="text-sm text-white">{fmtDate(req.startDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">End Date</p>
                        <p className="text-sm text-white">{fmtDate(req.endDate)}</p>
                      </div>
                    </div>
                    {req.reason && (
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Reason</p>
                        <p className="text-sm text-zinc-300">{req.reason}</p>
                      </div>
                    )}
                    {req.reviewNote && (
                      <div>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Review Note</p>
                        <p className="text-sm text-zinc-300">{req.reviewNote}</p>
                      </div>
                    )}

                    {/* Actions for pending requests */}
                    {req.status === "PENDING" && (
                      <div className="space-y-3 pt-2 border-t border-white/10">
                        <div>
                          <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1.5">Note (optional)</label>
                          <input
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder="Add a note for the employee…"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-[var(--gold)]/40"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReview(req.id, "APPROVED")}
                            disabled={actionLoading === req.id + "APPROVED"}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition disabled:opacity-50"
                          >
                            {actionLoading === req.id + "APPROVED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(req.id, "REJECTED")}
                            disabled={actionLoading === req.id + "REJECTED"}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/40 text-red-300 text-xs font-semibold transition disabled:opacity-50"
                          >
                            {actionLoading === req.id + "REJECTED" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                            Reject
                          </button>
                          <button
                            onClick={() => handleCancel(req.id)}
                            disabled={actionLoading === req.id + "CANCEL"}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 text-zinc-400 text-xs font-semibold hover:text-white hover:bg-white/5 transition disabled:opacity-50"
                          >
                            <Ban className="h-3.5 w-3.5" /> Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Reviewed info */}
                    {req.status !== "PENDING" && req.reviewedBy && (
                      <div className="pt-2 border-t border-white/10 flex items-center gap-2 text-xs text-zinc-500">
                        <span>Reviewed by {req.reviewedBy.name}</span>
                        {req.reviewedAt && <span>· {fmtDate(req.reviewedAt)}</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
