"use server";

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Crown, Shield, Users, DollarSign, Camera,
  Settings, AlertTriangle, TrendingUp, BookOpen,
  Scale, Clapperboard, GalleryHorizontalEnd,
} from "lucide-react";

async function getFounderData() {
  const admin = await requireAdmin();
  if (admin.role !== "FOUNDER") redirect("/admin");

  const [
    totalUsers, totalClients, pendingClients,
    totalRevenue, totalBookings, activeProjects,
    overdueProjects, expiredGalleries, recentAudit,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.user.count({ where: { role: "CLIENT", approvalStatus: "PENDING" } }),
    prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
    prisma.booking.count(),
    prisma.project.count({ where: { stage: { notIn: ["DELIVERED", "ARCHIVED"] } } }),
    prisma.project.count({
      where: { editDueDate: { lt: new Date() }, stage: { notIn: ["DELIVERED", "ARCHIVED"] } },
    }),
    prisma.gallery.count({ where: { expiresAt: { lt: new Date() } } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { actor: { select: { name: true, role: true } } },
    }),
  ]);

  return {
    admin,
    totalUsers, totalClients, pendingClients,
    totalRevenue: totalRevenue._sum.amountCents ?? 0,
    totalBookings, activeProjects, overdueProjects, expiredGalleries,
    recentAudit,
  };
}

function usd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmt(d: Date) {
  return new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function FounderPage() {
  const data = await getFounderData();

  const commandModules = [
    { href: "/admin",                    icon: TrendingUp,           label: "Dashboard",      desc: "Overview" },
    { href: "/admin/approvals",          icon: Users,                label: "Approvals",      desc: `${data.pendingClients} pending` },
    { href: "/admin/finance",            icon: DollarSign,           label: "Finance",        desc: usd(data.totalRevenue) },
    { href: "/admin/production",         icon: Clapperboard,         label: "Production",     desc: `${data.activeProjects} active` },
    { href: "/admin/analytics",          icon: TrendingUp,           label: "Analytics",      desc: "Live data" },
    { href: "/admin/media-library",      icon: GalleryHorizontalEnd, label: "Media Library",  desc: "All assets" },
    { href: "/admin/security",           icon: Shield,               label: "Security",       desc: "Audit & access" },
    { href: "/admin/ai",                 icon: Crown,                label: "AI Assistant",   desc: "MG AI tools" },
    { href: "/admin/reports",            icon: TrendingUp,           label: "Reports",        desc: "AI reports" },
    { href: "/admin/employees",          icon: Users,                label: "Employees",      desc: "Team" },
    { href: "/admin/legal",              icon: Scale,                label: "Legal",          desc: "Policies" },
    { href: "/admin/academy",            icon: BookOpen,             label: "Academy",        desc: "Training" },
  ];

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="h-5 w-5 text-[var(--gold)]" />
            <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Founder Command Center</p>
          </div>
          <h2 className="text-2xl font-bold text-white">Welcome back, {data.admin.name}</h2>
          <p className="mt-1 text-sm text-zinc-400">Full founder access — all systems visible</p>
        </div>
      </div>

      {/* Alert strip */}
      {(data.pendingClients > 0 || data.overdueProjects > 0) && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            {data.pendingClients > 0 && (
              <p className="text-sm text-amber-200">
                <strong>{data.pendingClients}</strong> client{data.pendingClients > 1 ? "s" : ""} awaiting approval.{" "}
                <Link href="/admin/approvals" className="underline hover:text-white">Review now</Link>
              </p>
            )}
            {data.overdueProjects > 0 && (
              <p className="text-sm text-amber-200">
                <strong>{data.overdueProjects}</strong> project{data.overdueProjects > 1 ? "s are" : " is"} overdue.{" "}
                <Link href="/admin/production" className="underline hover:text-white">View pipeline</Link>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Key metrics */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Revenue",    value: usd(data.totalRevenue),  colour: "text-emerald-400", border: "border-emerald-500/20" },
          { label: "Total Bookings",   value: data.totalBookings,       colour: "text-violet-400",  border: "border-violet-500/20" },
          { label: "Active Projects",  value: data.activeProjects,      colour: "text-blue-400",    border: "border-blue-500/20" },
          { label: "Total Users",      value: data.totalUsers,          colour: "text-[var(--gold)]", border: "border-[var(--gold)]/20" },
        ].map((m) => (
          <div key={m.label} className={`rounded-lg border bg-[var(--surface)] p-5 ${m.border}`}>
            <p className={`text-2xl font-bold ${m.colour}`}>{m.value}</p>
            <p className="text-sm text-zinc-500 mt-1">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Command grid */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">All Modules</h3>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {commandModules.map((mod) => (
            <Link key={mod.href} href={mod.href}
              className="rounded-lg border border-white/10 bg-[var(--surface)] p-4 hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/5 transition group">
              <mod.icon className="h-5 w-5 text-zinc-500 group-hover:text-[var(--gold)] transition mb-3" />
              <p className="text-sm font-semibold text-white">{mod.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{mod.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Audit trail */}
      <div className="rounded-lg border border-white/10 bg-[var(--surface)]">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-2">
          <Shield className="h-4 w-4 text-[var(--gold)]" />
          <h3 className="text-sm font-semibold text-white">Recent System Activity</h3>
        </div>
        <div className="divide-y divide-white/5">
          {data.recentAudit.map((log) => (
            <div key={log.id} className="flex items-center justify-between px-6 py-3 hover:bg-white/5 transition">
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-xs font-mono font-semibold text-[var(--gold)] shrink-0">{log.action}</span>
                <span className="text-sm text-zinc-300 truncate">{log.actor ? `${log.actor.name} (${log.actor.role})` : "System"}</span>
                {log.entity && <span className="text-xs text-zinc-500 hidden sm:block">{log.entity}</span>}
              </div>
              <span className="text-xs text-zinc-600 shrink-0 ml-4">{fmt(log.createdAt)}</span>
            </div>
          ))}
          {data.recentAudit.length === 0 && (
            <p className="px-6 py-8 text-center text-zinc-500 text-sm">No audit entries yet</p>
          )}
        </div>
      </div>
    </main>
  );
}
