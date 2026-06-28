import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, GalleryHorizontalEnd, UserCheck,
  Package, Shield, Clapperboard, CalendarRange, Truck,
  DollarSign, Receipt, TrendingDown, FileText,
  Bot, BarChart2, ImageIcon, ClipboardList,
  BookOpen, Users, Scale, Crown, Wrench, RotateCcw,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { AdminMobileBottomNav } from "@/components/mobile-admin-nav";

const baseNavItems = [
  { href: "/admin",                     label: "Dashboard",    icon: LayoutDashboard },
  { href: "/admin/approvals",           label: "Approvals",    icon: UserCheck },
  { href: "/admin/bookings",            label: "Bookings",     icon: CalendarDays },
  { href: "/admin/packages",            label: "Packages",     icon: Package },
  { href: "/admin/galleries",           label: "Galleries",    icon: GalleryHorizontalEnd },
  { href: "/admin/production",          label: "Production",   icon: Clapperboard },
  { href: "/admin/production/calendar", label: "Calendar",     icon: CalendarRange },
  { href: "/admin/production/delivery", label: "Delivery",     icon: Truck },
  { href: "/admin/finance",             label: "Finance",      icon: DollarSign },
  { href: "/admin/finance/invoices",    label: "Invoices",     icon: Receipt },
  { href: "/admin/finance/expenses",    label: "Expenses",     icon: TrendingDown },
  { href: "/admin/finance/contracts",   label: "Contracts",    icon: FileText },
  { href: "/admin/ai",                  label: "AI Assistant", icon: Bot },
  { href: "/admin/analytics",           label: "Analytics",    icon: BarChart2 },
  { href: "/admin/media-library",       label: "Media Library",icon: ImageIcon },
  { href: "/admin/reports",             label: "Reports",      icon: ClipboardList },
  { href: "/admin/academy",             label: "Academy",      icon: BookOpen },
  { href: "/admin/employees",           label: "Employees",    icon: Users },
  { href: "/admin/equipment",           label: "Equipment",    icon: Wrench },
  { href: "/admin/equipment/returns",   label: "Returns",      icon: RotateCcw },
  { href: "/admin/legal",               label: "Legal",        icon: Scale },
  { href: "/admin/security",            label: "Security",     icon: Shield },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  try {
    user = await requireAdmin();
  } catch {
    redirect("/login");
  }

  const isFounder = user?.role === "FOUNDER";
  const navItems = [
    ...baseNavItems,
    ...(isFounder ? [{ href: "/admin/founder", label: "Founder HQ", icon: Crown }] : []),
  ];

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

      {/* ── Mobile top bar (iOS/Android style) ────────────────── */}
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
            <p className="text-[10px] text-zinc-600 capitalize">{user?.role?.toLowerCase()}</p>
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
      <AdminMobileBottomNav isFounder={isFounder} />
    </div>
  );
}
