"use server";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  TrendingUp, Users, CalendarDays, DollarSign,
  Camera, GalleryHorizontalEnd, Download, Star,
} from "lucide-react";

async function getAnalyticsData() {
  await requireAdmin();

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1, label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }) };
  });

  const [
    totalClients, totalBookings, totalRevenue, totalGalleries,
    totalDownloads, totalMediaAssets,
    bookingsByStatus, paymentsByStatus,
    monthlyBookings, monthlyRevenue,
    topPackages, recentClients,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT", approvalStatus: "APPROVED" } }),
    prisma.booking.count(),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
    prisma.gallery.count(),
    prisma.download.count(),
    prisma.mediaAsset.count(),
    prisma.booking.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.payment.groupBy({ by: ["status"], _count: { id: true } }),
    Promise.all(months.map(({ year, month }) =>
      prisma.booking.count({
        where: { createdAt: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
      })
    )),
    Promise.all(months.map(({ year, month }) =>
      prisma.payment.aggregate({
        where: { status: "PAID", updatedAt: { gte: new Date(year, month - 1, 1), lt: new Date(year, month, 1) } },
        _sum: { amountCents: true },
      })
    )),
    prisma.servicePackage.findMany({
      include: { _count: { select: { bookings: true } } },
      orderBy: { bookings: { _count: "desc" } },
      take: 5,
    }),
    prisma.user.findMany({
      where: { role: "CLIENT", approvalStatus: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
  ]);

  return {
    totals: {
      clients: totalClients,
      bookings: totalBookings,
      revenue: totalRevenue._sum.amountCents ?? 0,
      galleries: totalGalleries,
      downloads: totalDownloads,
      mediaAssets: totalMediaAssets,
    },
    bookingsByStatus,
    paymentsByStatus,
    monthlyData: months.map((m, i) => ({
      label: m.label,
      bookings: monthlyBookings[i],
      revenue: monthlyRevenue[i]._sum.amountCents ?? 0,
    })),
    topPackages,
    recentClients,
  };
}

function usd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();
  const maxRevenue = Math.max(...data.monthlyData.map((m) => m.revenue), 1);
  const maxBookings = Math.max(...data.monthlyData.map((m) => m.bookings), 1);

  return (
    <main className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">MG AI Command Center</p>
        <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-[var(--gold)]" />
          Advanced Analytics
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Live business intelligence across all studio operations</p>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Approved Clients",  value: data.totals.clients,                  icon: Users,                colour: "text-blue-400",    border: "border-blue-500/20" },
          { label: "Total Bookings",    value: data.totals.bookings,                 icon: CalendarDays,         colour: "text-violet-400",  border: "border-violet-500/20" },
          { label: "Total Revenue",     value: usd(data.totals.revenue),             icon: DollarSign,           colour: "text-emerald-400", border: "border-emerald-500/20" },
          { label: "Galleries Created", value: data.totals.galleries,                icon: GalleryHorizontalEnd, colour: "text-amber-400",   border: "border-amber-500/20" },
          { label: "Media Assets",      value: data.totals.mediaAssets,              icon: Camera,               colour: "text-pink-400",    border: "border-pink-500/20" },
          { label: "Total Downloads",   value: data.totals.downloads,                icon: Download,             colour: "text-cyan-400",    border: "border-cyan-500/20" },
          { label: "Booking Statuses",  value: `${data.bookingsByStatus.length} types`, icon: Star,              colour: "text-[var(--gold)]", border: "border-[var(--gold)]/20" },
          { label: "Revenue (All Time)", value: usd(data.totals.revenue),             icon: TrendingUp,          colour: "text-emerald-400", border: "border-emerald-500/20" },
        ].slice(0,6).map((kpi) => (
          <div key={kpi.label} className={`rounded-lg border bg-[var(--surface)] p-5 ${kpi.border}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wider">{kpi.label}</p>
              <kpi.icon className={`h-5 w-5 ${kpi.colour}`} />
            </div>
            <p className={`text-2xl font-bold ${kpi.colour}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Monthly bookings bar chart */}
        <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[var(--gold)]" />
            Monthly Bookings (last 6 months)
          </h3>
          <div className="flex items-end gap-3 h-40">
            {data.monthlyData.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-zinc-400">{m.bookings}</span>
                <div
                  className="w-full rounded-t-sm bg-violet-500/60 hover:bg-violet-500 transition-colors"
                  style={{ height: `${Math.max((m.bookings / maxBookings) * 100, 4)}%` }}
                  title={`${m.bookings} bookings`}
                />
                <span className="text-[10px] text-zinc-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly revenue bar chart */}
        <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-[var(--gold)]" />
            Monthly Revenue (last 6 months)
          </h3>
          <div className="flex items-end gap-3 h-40">
            {data.monthlyData.map((m) => (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-zinc-400">{m.revenue > 0 ? `$${(m.revenue/100).toFixed(0)}` : "0"}</span>
                <div
                  className="w-full rounded-t-sm bg-[var(--gold)]/60 hover:bg-[var(--gold)] transition-colors"
                  style={{ height: `${Math.max((m.revenue / maxRevenue) * 100, 4)}%` }}
                  title={usd(m.revenue)}
                />
                <span className="text-[10px] text-zinc-500">{m.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking status breakdown + top packages */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Booking status */}
        <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Booking Status Breakdown</h3>
          <div className="space-y-2">
            {data.bookingsByStatus.map((b) => {
              const pct = Math.round((b._count.id / data.totals.bookings) * 100);
              const colours: Record<string, string> = {
                REQUESTED: "bg-blue-500", CONFIRMED: "bg-emerald-500",
                IN_PROGRESS: "bg-amber-500", COMPLETED: "bg-violet-500", CANCELLED: "bg-red-500",
              };
              return (
                <div key={b.status}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-300 capitalize">{b.status.replace("_"," ").toLowerCase()}</span>
                    <span className="text-zinc-500">{b._count.id} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full ${colours[b.status] ?? "bg-zinc-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top packages */}
        <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Top Service Packages</h3>
          <div className="space-y-3">
            {data.topPackages.length === 0 ? (
              <p className="text-sm text-zinc-500">No packages booked yet</p>
            ) : data.topPackages.map((pkg, i) => (
              <div key={pkg.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-[var(--gold)] w-5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{pkg.name}</p>
                  <p className="text-xs text-zinc-500">{usd(pkg.priceCents)}</p>
                </div>
                <span className="text-sm font-semibold text-zinc-300 shrink-0">{pkg._count.bookings} bookings</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent clients */}
      <div className="rounded-lg border border-white/10 bg-[var(--surface)]">
        <div className="px-6 py-4 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--gold)]" />
            Recently Approved Clients
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {data.recentClients.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-6 py-3">
              <div>
                <p className="text-sm font-medium text-white">{c.name}</p>
                <p className="text-xs text-zinc-500">{c.email}</p>
              </div>
              <span className="text-xs text-zinc-500">{fmt(c.createdAt)}</span>
            </div>
          ))}
          {data.recentClients.length === 0 && (
            <p className="px-6 py-8 text-center text-zinc-500 text-sm">No clients yet</p>
          )}
        </div>
      </div>
    </main>
  );
}
