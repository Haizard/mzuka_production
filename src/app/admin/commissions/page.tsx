"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DollarSign, Loader2, CheckCircle2, Clock, TrendingUp, Award,
  Filter, Search, ChevronDown, ChevronUp, Banknote,
} from "lucide-react";
import { getCommissionData, getCommissionSummary, approveCommission, markCommissionPaid, bulkApproveCommissions } from "./actions";

interface Commission {
  id: string;
  staffId: string;
  bookingId: string;
  role: string;
  amountCents: number;
  percent: number | null;
  notes: string | null;
  status: string;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  staff: { id: string; name: string; email: string; staffRole: string | null };
  booking: { id: string; title: string; scheduledAt: string };
  approvedBy: { id: string; name: string } | null;
}

interface StaffMember {
  id: string;
  name: string;
  staffRole: string | null;
}

interface Summary {
  pendingAmount: number;
  approvedNotPaid: number;
  paidAllTime: number;
  paidThisMonth: number;
  paidThisYear: number;
  totalCount: number;
  pendingCount: number;
}

function usd(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLOURS: Record<string, string> = {
  PENDING:  "bg-amber-500/15 text-amber-300",
  APPROVED: "bg-blue-500/15 text-blue-300",
  PAID:     "bg-emerald-500/15 text-emerald-300",
};

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [data, sumData] = await Promise.all([getCommissionData(), getCommissionSummary()]);
    if (data.success) {
      setCommissions(data.commissions as Commission[]);
      setStaff(data.staff as StaffMember[]);
    }
    if (sumData.success && sumData.stats) setSummary(sumData.stats as Summary);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id: string) => {
    setActionLoading(id + "approve");
    const res = await approveCommission(id);
    if (res.success) { flash("Commission approved"); await loadData(); }
    setActionLoading(null);
  };

  const handleMarkPaid = async (id: string) => {
    setActionLoading(id + "pay");
    const res = await markCommissionPaid(id);
    if (res.success) { flash("Commission marked as paid"); await loadData(); }
    setActionLoading(null);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading("bulk");
    const res = await bulkApproveCommissions(Array.from(selectedIds));
    if (res.success) { flash(`${res.count} commissions approved`); setSelectedIds(new Set()); await loadData(); }
    setActionLoading(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = commissions.filter((c) => {
    if (filterStatus !== "ALL" && c.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return c.staff.name.toLowerCase().includes(q) || c.booking.title.toLowerCase().includes(q);
    }
    return true;
  });

  // Group by staff for summary view
  const byStaff = commissions.reduce<Record<string, { name: string; total: number; paid: number; pending: number; count: number }>>((acc, c) => {
    const key = c.staffId;
    if (!acc[key]) acc[key] = { name: c.staff.name, total: 0, paid: 0, pending: 0, count: 0 };
    acc[key].total += c.amountCents;
    acc[key].count++;
    if (c.status === "PAID") acc[key].paid += c.amountCents;
    if (c.status === "PENDING") acc[key].pending += c.amountCents;
    return acc;
  }, {});

  return (
    <main className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Human Resources</p>
        <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-[var(--gold)]" />
          Commission Tracking
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Track and manage staff commissions per booking</p>
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
            { label: "Pending Amount", value: usd(summary.pendingAmount), icon: Clock, colour: "text-amber-400" },
            { label: "Approved (Unpaid)", value: usd(summary.approvedNotPaid), icon: Banknote, colour: "text-blue-400" },
            { label: "Paid This Month", value: usd(summary.paidThisMonth), icon: TrendingUp, colour: "text-violet-400" },
            { label: "Paid This Year", value: usd(summary.paidThisYear), icon: Award, colour: "text-emerald-400" },
            { label: "All-Time Paid", value: usd(summary.paidAllTime), icon: DollarSign, colour: "text-emerald-400" },
            { label: "Total Records", value: summary.totalCount, icon: Filter, colour: "text-zinc-300" },
          ].map(({ label, value, icon: Icon, colour }) => (
            <div key={label} className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
              <Icon className={`h-4 w-4 ${colour}`} />
              <p className={`text-lg font-bold mt-2 ${colour}`}>{value}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Staff breakdown */}
      {Object.keys(byStaff).length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[var(--surface)] overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10">
            <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Award className="h-3.5 w-3.5 text-[var(--gold)]" /> Commission by Staff Member
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            {Object.entries(byStaff).sort((a, b) => b[1].total - a[1].total).map(([id, data]) => (
              <div key={id} className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--gold)]/15 flex items-center justify-center text-xs font-bold text-[var(--gold)]">
                    {data.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{data.name}</p>
                    <p className="text-[10px] text-zinc-500">{data.count} commission{data.count !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <p className="text-emerald-400 font-semibold">{usd(data.paid)}</p>
                    <p className="text-zinc-600">paid</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-400 font-semibold">{usd(data.pending)}</p>
                    <p className="text-zinc-600">pending</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">{usd(data.total)}</p>
                    <p className="text-zinc-600">total</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters + bulk actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {["ALL", "PENDING", "APPROVED", "PAID"].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                filterStatus === s ? "bg-white/15 text-white border-white/20" : "border-white/10 text-zinc-400 hover:text-white"
              }`}>
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={actionLoading === "bulk"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {actionLoading === "bulk" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Approve {selectedIds.size}
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search…"
              className="w-48 pl-8 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-[var(--gold)]"
            />
          </div>
        </div>
      </div>

      {/* Commission list */}
      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-12 text-center text-zinc-500">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-12 text-center text-zinc-500">
          <DollarSign className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{searchQuery ? "No matching commissions" : "No commissions yet"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const isExpanded = expanded === c.id;
            return (
              <div key={c.id} className={`rounded-xl border bg-[var(--surface)] transition ${
                c.status === "PENDING" ? "border-amber-500/20" : "border-white/10"
              }`}>
                {/* Summary row */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {c.status === "PENDING" && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="w-4 h-4 rounded border-zinc-600 bg-white/5 accent-[var(--gold)]"
                      />
                    )}
                    <div className="w-9 h-9 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center text-xs font-bold text-[var(--gold)] shrink-0">
                      {c.staff.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.staff.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{c.booking.title} · {c.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <p className="text-sm font-bold text-white">{usd(c.amountCents)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLOURS[c.status]}`}>
                      {c.status}
                    </span>
                    <button onClick={() => setExpanded(isExpanded ? null : c.id)} className="text-zinc-500 hover:text-white">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Employee</p>
                        <p className="text-sm text-white">{c.staff.name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Booking</p>
                        <p className="text-sm text-white">{c.booking.title}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Event Date</p>
                        <p className="text-sm text-white">{fmtDate(c.booking.scheduledAt)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Commission</p>
                        <p className="text-sm text-white">{usd(c.amountCents)}{c.percent ? ` (${c.percent}%)` : ""}</p>
                      </div>
                    </div>
                    {c.notes && (
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Notes</p>
                        <p className="text-xs text-zinc-300">{c.notes}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span>Created: {fmtDate(c.createdAt)}</span>
                      {c.approvedAt && <span>Approved: {fmtDate(c.approvedAt)} by {c.approvedBy?.name}</span>}
                      {c.paidAt && <span>Paid: {fmtDate(c.paidAt)}</span>}
                    </div>
                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-white/10">
                      {c.status === "PENDING" && (
                        <button onClick={() => handleApprove(c.id)} disabled={actionLoading === c.id + "approve"}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50">
                          {actionLoading === c.id + "approve" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Approve
                        </button>
                      )}
                      {(c.status === "PENDING" || c.status === "APPROVED") && (
                        <button onClick={() => handleMarkPaid(c.id)} disabled={actionLoading === c.id + "pay"}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                          {actionLoading === c.id + "pay" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Banknote className="h-3 w-3" />}
                          Mark Paid
                        </button>
                      )}
                    </div>
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
