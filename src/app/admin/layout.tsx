import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, GalleryHorizontalEnd, UserCheck,
  Package, Shield, Clapperboard, CalendarRange, Truck,
  DollarSign, Receipt, TrendingDown, FileText,
  Bot, BarChart2, ImageIcon, ClipboardList,
  BookOpen, Users, Scale, Crown, Wrench, RotateCcw, Wallet,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminMobileBottomNav } from "@/components/mobile-admin-nav";

const ALL_NAV: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[] | null;
}> = [
  { href: "/admin",                     label: "Dashboard",    icon: LayoutDashboard,       roles: null },
  { href: "/admin/approvals",           label: "Approvals",    icon: UserCheck,              roles: ["ADMIN","COORDINATOR"] },
  { href: "/admin/bookings",            label: "Bookings",     icon: CalendarDays,           roles: ["ADMIN","PRODUCTION_MANAGER","PHOTOGRAPHER","COORDINATOR","ASSISTANT"] },
  { href: "/admin/packages",            label: "Packages",     icon: Package,                roles: ["ADMIN"] },
  { href: "/admin/galleries",           label: "Galleries",    icon: GalleryHorizontalEnd,   roles: ["ADMIN","PRODUCTION_MANAGER","PHOTOGRAPHER","VIDEO_EDITOR","EDITOR"] },
  { href: "/admin/production",          label: "Production",   icon: Clapperboard,           roles: ["ADMIN","PRODUCTION_MANAGER","PHOTOGRAPHER","VIDEO_EDITOR","EDITOR","COORDINATOR"] },
  { href: "/admin/production/calendar", label: "Calendar",     icon: CalendarRange,          roles: ["ADMIN","PRODUCTION_MANAGER","PHOTOGRAPHER","COORDINATOR"] },
  { href: "/admin/production/delivery", label: "Delivery",     icon: Truck,                  roles: ["ADMIN","PRODUCTION_MANAGER","COORDINATOR","DRIVER"] },
  { href: "/admin/finance",             label: "Finance",      icon: DollarSign,             roles: ["ADMIN","HUMAN_RESOURCE"] },
  { href: "/admin/finance/invoices",    label: "Invoices",     icon: Receipt,                roles: ["ADMIN","HUMAN_RESOURCE"] },
  { href: "/admin/finance/expenses",    label: "Expenses",     icon: TrendingDown,           roles: ["ADMIN","HUMAN_RESOURCE"] },
  { href: "/admin/finance/contracts",   label: "Contracts",    icon: FileText,               roles: ["ADMIN"] },
  { href: "/admin/payroll",             label: "Payroll",      icon: Wallet,                 roles: ["ADMIN","HUMAN_RESOURCE"] },
  { href: "/admin/ai",                  label: "AI Assistant", icon: Bot,                    roles: ["ADMIN","PRODUCTION_MANAGER","VIDEO_EDITOR"] },
  { href: "/admin/analytics",           label: "Analytics",    icon: BarChart2,              roles: ["ADMIN","HUMAN_RESOURCE"] },
  { href: "/admin/media-library",       label: "Media Library",icon: ImageIcon,              roles: ["ADMIN","PHOTOGRAPHER","VIDEO_EDITOR","EDITOR"] },
  { href: "/admin/reports",             label: "Reports",      icon: ClipboardList,          roles: ["ADMIN","HUMAN_RESOURCE"] },
  { href: "/admin/academy",             label: "Academy",      icon: BookOpen,               roles: null },
  { href: "/admin/employees",           label: "Employees",    icon: Users,                  roles: ["ADMIN","HUMAN_RESOURCE"] },
  { href: "/admin/equipment",           label: "Equipment",    icon: Wrench,                 roles: ["ADMIN","PRODUCTION_MANAGER","COORDINATOR","DRIVER"] },
  { href: "/admin/equipment/returns",   label: "Returns",      icon: RotateCcw,              roles: ["ADMIN","PRODUCTION_MANAGER","COORDINATOR","DRIVER"] },
  { href: "/admin/legal",               label: "Legal",        icon: Scale,                  roles: ["ADMIN"] },
  { href: "/admin/security",            label: "Security",     icon: Shield,                 roles: ["ADMIN"] },
];

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; roles: string[] | null };

type StaffRoleLike = string | null;

function filterNav(staffRole: StaffRoleLike, isFounder: boolean): NavItem[] {
  const items: NavItem[] = ALL_NAV.filter((item) => {
    if (isFounder || staffRole === "ADMIN" || staffRole === null) return true;
    if (item.roles === null) return true; // available to everyone
    return staffRole ? item.roles.includes(staffRole) : false;
  }) as NavItem[];

  if (isFounder) {
    items.push({ href: "/admin/founder", label: "Founder HQ", icon: Crown, roles: null });
  }

  return items;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user = null;
  try {
    user = await requireAdmin();
  } catch {
    redirect("/login");
  }

  const isFounder = user?.role === "FOUNDER";
  const staffRole = user?.staffRole ?? null;

  const navItems = filterNav(staffRole, isFounder);

  return (
    <div className="min-h-dvh bg-[var(--background)] text-white">

      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col">
        <div className="flex flex-col gap-y-5 bg-[var(--surface)] border-r border-white/10 px-4 py-6 h-full">
          <div className="px-2 pb-4 border-b border-white/10">
            <p className="text-[var(--gold)] font-bold text-lg tracking-widest">[MG]</p>
            <p className="text-xs text-zinc-500 mt-0.5 tracking-wider uppercase">Command Center</p>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-300 hover:text-white hover:bg-white/10 transition group"
              >
                <item.icon className="h-4 w-4 text-zinc-500 group-hover:text-[var(--gold)] transition" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Mobile top bar ────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-[var(--surface)]/95 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/30 flex items-center justify-center">
            <Crown className="h-4 w-4 text-[var(--gold)]" />
          </div>
          <div>
            <p className="text-[var(--gold)] font-bold text-sm tracking-widest leading-none">[MG]</p>
            <p className="text-[10px] text-zinc-500 tracking-wider uppercase leading-none mt-0.5">Command Center</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-zinc-400 font-medium">{user?.name?.split(" ")[0]}</p>
            <p className="text-[10px] text-zinc-600 capitalize">{(staffRole ?? user?.role)?.toLowerCase().replace("_", " ")}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] font-bold text-xs">
            {user?.name?.charAt(0) ?? "A"}
          </div>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────── */}
      <main className="lg:pl-60">
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto mobile-content-pad lg:pb-8">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom navigation ──────────────────────────── */}
      <AdminMobileBottomNav
        isFounder={isFounder}
        filteredNavItems={navItems.map((n) => ({ href: n.href, label: n.label }))}
      />
    </div>
  );
}
