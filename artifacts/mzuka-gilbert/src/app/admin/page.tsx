import Link from "next/link";
import {
  CalendarDays, GalleryHorizontalEnd, ShieldCheck, UserCheck,
  Users, Clapperboard, Package, DollarSign, Wrench, RotateCcw,
  BarChart2, Camera, Video, BookOpen,
} from "lucide-react";
import { requireAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function usd(c: number) { return `$${(c / 100).toFixed(0)}`; }

export default async function AdminPage() {
  const user = await requireAdminAccess("/admin");
  const staffRole = user.staffRole ?? user.role;

  // ── FOUNDER / ADMIN dashboard ──────────────────────────────────────────────
  if (["FOUNDER","ADMIN"].includes(user.role) || staffRole === "ADMIN") {
    const [clients, pending, bookings, galleries, revenue, projects] = await Promise.all([
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.user.count({ where: { role: "CLIENT", approvalStatus: "PENDING" } }),
      prisma.booking.count(),
      prisma.gallery.count(),
      prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
      prisma.project.count({ where: { stage: { notIn: ["DELIVERED","ARCHIVED"] } } }),
    ]);

    return (
      <DashboardShell userName={user.name} roleName="Admin Dashboard" roleColour="text-[var(--gold)]">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 mb-6">
          {[
            { label: "Clients",    value: clients,    icon: Users,                colour: "text-blue-400" },
            { label: "Pending",    value: pending,    icon: UserCheck,            colour: "text-amber-400" },
            { label: "Bookings",   value: bookings,   icon: CalendarDays,         colour: "text-violet-400" },
            { label: "Galleries",  value: galleries,  icon: GalleryHorizontalEnd, colour: "text-pink-400" },
            { label: "Revenue",    value: usd(revenue._sum.amountCents ?? 0), icon: DollarSign, colour: "text-emerald-400" },
            { label: "Active Projects", value: projects, icon: Clapperboard,     colour: "text-cyan-400" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
              <s.icon className={`h-5 w-5 ${s.colour}`} />
              <p className={`mt-3 text-2xl font-bold ${s.colour}`}>{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
        <QuickLinks links={[
          { href: "/admin/approvals",    icon: UserCheck,            label: "Approvals",     desc: "Review pending client access requests" },
          { href: "/admin/bookings",     icon: CalendarDays,         label: "Bookings",      desc: "Manage all booking requests" },
          { href: "/admin/galleries",    icon: GalleryHorizontalEnd, label: "Galleries",     desc: "Upload media and release to clients" },
          { href: "/admin/production",   icon: Clapperboard,         label: "Production",    desc: "Project pipeline and crew assignment" },
          { href: "/admin/finance",      icon: DollarSign,           label: "Finance",       desc: "Invoices, expenses, and contracts" },
          { href: "/admin/employees",    icon: Users,                label: "Employees",     desc: "Manage staff roles and accounts" },
          { href: "/admin/analytics",    icon: BarChart2,            label: "Analytics",     desc: "Business intelligence and reports" },
          { href: "/admin/security",     icon: ShieldCheck,          label: "Security",      desc: "Audit logs and gallery access" },
        ]} />
      </DashboardShell>
    );
  }

  // ── PRODUCTION MANAGER ─────────────────────────────────────────────────────
  if (staffRole === "PRODUCTION_MANAGER") {
    const [activeProjects, overdue, available, pendingReturns] = await Promise.all([
      prisma.project.count({ where: { stage: { notIn: ["DELIVERED","ARCHIVED"] } } }),
      prisma.project.count({ where: { editDueDate: { lt: new Date() }, stage: { notIn: ["DELIVERED","ARCHIVED"] } } }),
      prisma.equipmentItem.count({ where: { status: "AVAILABLE" } }),
      prisma.equipmentReturn.count({ where: { status: "PENDING" } }),
    ]);

    return (
      <DashboardShell userName={user.name} roleName="Production Manager" roleColour="text-violet-300">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mb-6">
          {[
            { label: "Active Projects",  value: activeProjects,  colour: "text-blue-400" },
            { label: "Overdue",          value: overdue,         colour: "text-red-400" },
            { label: "Equipment Ready",  value: available,       colour: "text-emerald-400" },
            { label: "Pending Returns",  value: pendingReturns,  colour: "text-amber-400" },
          ].map((s) => (
            <Stat key={s.label} label={s.label} value={s.value} colour={s.colour} />
          ))}
        </div>
        <QuickLinks links={[
          { href: "/admin/production",         icon: Clapperboard, label: "Production",       desc: "View pipeline and manage projects" },
          { href: "/admin/production/new",     icon: Clapperboard, label: "New Project",      desc: "Create a new production project" },
          { href: "/admin/equipment",          icon: Wrench,       label: "Equipment",        desc: "Manage inventory and assign gear" },
          { href: "/admin/equipment/returns",  icon: RotateCcw,    label: "Returns",          desc: "Approve equipment return requests" },
          { href: "/admin/galleries",          icon: GalleryHorizontalEnd, label: "Galleries", desc: "Upload and release media" },
          { href: "/admin/bookings",           icon: CalendarDays, label: "Bookings",         desc: "View upcoming sessions" },
        ]} />
      </DashboardShell>
    );
  }

  // ── PHOTOGRAPHER ───────────────────────────────────────────────────────────
  if (staffRole === "PHOTOGRAPHER") {
    const tasks = await prisma.projectTask.count({ where: { assigneeId: user.id, status: { not: "DONE" } } });
    const done  = await prisma.projectTask.count({ where: { assigneeId: user.id, status: "DONE" } });
    return (
      <DashboardShell userName={user.name} roleName="Photographer" roleColour="text-blue-300">
        <div className="grid gap-4 grid-cols-2 mb-6">
          <Stat label="Active Tasks" value={tasks} colour="text-amber-400" />
          <Stat label="Completed"    value={done}  colour="text-emerald-400" />
        </div>
        <QuickLinks links={[
          { href: "/staff",               icon: Camera,               label: "My Tasks",      desc: "View and manage your assigned tasks" },
          { href: "/admin/galleries",     icon: GalleryHorizontalEnd, label: "Galleries",     desc: "Upload photos to client galleries" },
          { href: "/admin/media-library", icon: GalleryHorizontalEnd, label: "Media Library", desc: "Browse all uploaded media" },
          { href: "/admin/production",    icon: Clapperboard,         label: "Production",    desc: "View project pipeline" },
          { href: "/admin/academy",       icon: BookOpen,             label: "Academy",       desc: "Training and learning resources" },
        ]} />
      </DashboardShell>
    );
  }

  // ── VIDEO EDITOR ──────────────────────────────────────────────────────────
  if (staffRole === "VIDEO_EDITOR") {
    const tasks = await prisma.projectTask.count({ where: { assigneeId: user.id, status: { not: "DONE" } } });
    const done  = await prisma.projectTask.count({ where: { assigneeId: user.id, status: "DONE" } });
    return (
      <DashboardShell userName={user.name} roleName="Video Editor" roleColour="text-cyan-300">
        <div className="grid gap-4 grid-cols-2 mb-6">
          <Stat label="Active Tasks" value={tasks} colour="text-amber-400" />
          <Stat label="Completed"    value={done}  colour="text-emerald-400" />
        </div>
        <QuickLinks links={[
          { href: "/staff",               icon: Video,                label: "My Tasks",      desc: "View and manage your assigned tasks" },
          { href: "/admin/galleries",     icon: GalleryHorizontalEnd, label: "Galleries",     desc: "Upload videos to client galleries" },
          { href: "/admin/media-library", icon: GalleryHorizontalEnd, label: "Media Library", desc: "Browse all uploaded media" },
          { href: "/admin/production",    icon: Clapperboard,         label: "Production",    desc: "View project pipeline" },
          { href: "/admin/ai",            icon: BarChart2,            label: "AI Assistant",  desc: "Generate scripts and captions" },
        ]} />
      </DashboardShell>
    );
  }

  // ── EDITOR (PHOTO EDITOR) ─────────────────────────────────────────────────
  if (staffRole === "EDITOR") {
    const tasks = await prisma.projectTask.count({ where: { assigneeId: user.id, status: { not: "DONE" } } });
    return (
      <DashboardShell userName={user.name} roleName="Photo Editor" roleColour="text-indigo-300">
        <div className="grid gap-4 grid-cols-2 mb-6">
          <Stat label="Active Tasks" value={tasks}  colour="text-amber-400" />
        </div>
        <QuickLinks links={[
          { href: "/staff",               icon: Camera,               label: "My Tasks",      desc: "View and manage your assigned tasks" },
          { href: "/admin/galleries",     icon: GalleryHorizontalEnd, label: "Galleries",     desc: "Manage edited photos" },
          { href: "/admin/media-library", icon: GalleryHorizontalEnd, label: "Media Library", desc: "Browse all media" },
          { href: "/admin/production",    icon: Clapperboard,         label: "Production",    desc: "View project pipeline" },
        ]} />
      </DashboardShell>
    );
  }

  // ── COORDINATOR ───────────────────────────────────────────────────────────
  if (staffRole === "COORDINATOR") {
    const [bookings, pendingApprovals] = await Promise.all([
      prisma.booking.count({ where: { status: { in: ["REQUESTED","CONFIRMED"] } } }),
      prisma.user.count({ where: { role: "CLIENT", approvalStatus: "PENDING" } }),
    ]);
    return (
      <DashboardShell userName={user.name} roleName="Coordinator" roleColour="text-emerald-300">
        <div className="grid gap-4 grid-cols-2 mb-6">
          <Stat label="Active Bookings"    value={bookings}        colour="text-blue-400" />
          <Stat label="Pending Approvals"  value={pendingApprovals} colour="text-amber-400" />
        </div>
        <QuickLinks links={[
          { href: "/admin/bookings",           icon: CalendarDays, label: "Bookings",    desc: "Manage client bookings" },
          { href: "/admin/approvals",          icon: UserCheck,    label: "Approvals",   desc: "Review pending clients" },
          { href: "/admin/production",         icon: Clapperboard, label: "Production",  desc: "Project schedule" },
          { href: "/admin/production/calendar",icon: CalendarDays, label: "Calendar",    desc: "Schedule and events" },
          { href: "/admin/production/delivery",icon: Package,      label: "Delivery",    desc: "Track delivery status" },
          { href: "/admin/equipment",          icon: Wrench,       label: "Equipment",   desc: "Equipment availability" },
        ]} />
      </DashboardShell>
    );
  }

  // ── HUMAN RESOURCE ────────────────────────────────────────────────────────
  if (staffRole === "HUMAN_RESOURCE") {
    const [staffCount, revenue] = await Promise.all([
      prisma.user.count({ where: { role: "STAFF", approvalStatus: "APPROVED" } }),
      prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
    ]);
    return (
      <DashboardShell userName={user.name} roleName="Human Resource" roleColour="text-rose-300">
        <div className="grid gap-4 grid-cols-2 mb-6">
          <Stat label="Staff Members" value={staffCount}                              colour="text-blue-400" />
          <Stat label="Total Revenue" value={usd(revenue._sum.amountCents ?? 0)}      colour="text-emerald-400" />
        </div>
        <QuickLinks links={[
          { href: "/admin/employees",        icon: Users,      label: "Employees",  desc: "Manage staff and roles" },
          { href: "/admin/payroll",          icon: DollarSign, label: "Payroll",    desc: "Payroll and compensation" },
          { href: "/admin/finance",          icon: DollarSign, label: "Finance",    desc: "Invoices and expenses" },
          { href: "/admin/analytics",        icon: BarChart2,  label: "Analytics",  desc: "Business reports" },
        ]} />
      </DashboardShell>
    );
  }

  // ── DRIVER / ASSISTANT (minimal view) ─────────────────────────────────────
  const tasks = await prisma.projectTask.count({ where: { assigneeId: user.id, status: { not: "DONE" } } });
  const roleLabel = staffRole === "DRIVER" ? "Driver" : staffRole === "ASSISTANT" ? "Assistant" : "Staff";
  const roleColour = staffRole === "DRIVER" ? "text-amber-300" : "text-zinc-400";

  return (
    <DashboardShell userName={user.name} roleName={roleLabel} roleColour={roleColour}>
      <div className="grid gap-4 grid-cols-2 mb-6">
        <Stat label="Active Tasks" value={tasks} colour="text-amber-400" />
      </div>
      <QuickLinks links={[
        { href: "/staff",                    icon: Package,      label: "My Tasks",  desc: "View your assigned tasks" },
        { href: "/admin/production/delivery",icon: Clapperboard, label: "Delivery",  desc: "Delivery schedule" },
        { href: "/admin/equipment",          icon: Wrench,       label: "Equipment", desc: "Equipment assigned to you" },
        { href: "/admin/academy",            icon: BookOpen,     label: "Academy",   desc: "Training resources" },
      ]} />
    </DashboardShell>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function DashboardShell({ userName, roleName, roleColour, children }: {
  userName: string; roleName: string; roleColour: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {/* Role header */}
      <div className="pb-5 border-b border-white/10">
        <p className={`text-xs uppercase tracking-widest font-semibold ${roleColour}`}>{roleName}</p>
        <h1 className="text-2xl font-bold text-white mt-1">Welcome back, {userName.split(" ")[0]}</h1>
        <p className="text-sm text-zinc-400 mt-0.5">Here&apos;s your overview for today</p>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, colour }: { label: string; value: number | string; colour: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-5">
      <p className={`text-3xl font-bold ${colour}`}>{value}</p>
      <p className="text-sm text-zinc-400 mt-1">{label}</p>
    </div>
  );
}

function QuickLinks({ links }: {
  links: { href: string; icon: React.ElementType; label: string; desc: string }[];
}) {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((l) => (
        <Link key={l.href} href={l.href}
          className="flex items-start gap-4 rounded-xl border border-white/10 bg-[var(--surface)] p-4 hover:border-[var(--gold)]/40 hover:bg-[var(--gold)]/5 transition group">
          <div className="h-10 w-10 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--gold)]/20 transition">
            <l.icon className="h-5 w-5 text-[var(--gold)]" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{l.label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{l.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
