import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, GalleryHorizontalEnd, UserCheck,
  Package, Shield, Clapperboard, CalendarRange, Truck,
  DollarSign, Receipt, TrendingDown, FileText,
  Bot, BarChart2, ImageIcon, ClipboardList,
  BookOpen, Users, Scale, Crown, Wrench, RotateCcw, Wallet, LogOut,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_NAV_ITEMS } from "@/lib/admin-permissions";
import { AdminMobileBottomNav } from "@/components/mobile-admin-nav";
import { logoutAction } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/theme-toggle";

const ALL_NAV: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: readonly string[] | null;
}> = [
  { ...ADMIN_NAV_ITEMS[0],  icon: LayoutDashboard },
  { ...ADMIN_NAV_ITEMS[1],  icon: UserCheck },
  { ...ADMIN_NAV_ITEMS[2],  icon: CalendarDays },
  { ...ADMIN_NAV_ITEMS[3],  icon: Package },
  { ...ADMIN_NAV_ITEMS[4],  icon: GalleryHorizontalEnd },
  { ...ADMIN_NAV_ITEMS[5],  icon: Clapperboard },
  { ...ADMIN_NAV_ITEMS[6],  icon: CalendarRange },
  { ...ADMIN_NAV_ITEMS[7],  icon: Truck },
  { ...ADMIN_NAV_ITEMS[8],  icon: DollarSign },
  { ...ADMIN_NAV_ITEMS[9],  icon: Receipt },
  { ...ADMIN_NAV_ITEMS[10], icon: TrendingDown },
  { ...ADMIN_NAV_ITEMS[11], icon: FileText },
  { ...ADMIN_NAV_ITEMS[12], icon: Wallet },
  { ...ADMIN_NAV_ITEMS[13], icon: Bot },
  { ...ADMIN_NAV_ITEMS[14], icon: BarChart2 },
  { ...ADMIN_NAV_ITEMS[15], icon: ImageIcon },
  { ...ADMIN_NAV_ITEMS[16], icon: ClipboardList },
  { ...ADMIN_NAV_ITEMS[17], icon: BookOpen },
  { ...ADMIN_NAV_ITEMS[18], icon: Users },
  { ...ADMIN_NAV_ITEMS[19], icon: Wrench },
  { ...ADMIN_NAV_ITEMS[20], icon: RotateCcw },
  { ...ADMIN_NAV_ITEMS[21], icon: Scale },
  { ...ADMIN_NAV_ITEMS[22], icon: Shield },
];

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; roles: readonly string[] | null };

type StaffRoleLike = string | null;

function filterNav(staffRole: StaffRoleLike, isFounder: boolean): NavItem[] {
  const items: NavItem[] = ALL_NAV.filter((item) => {
    if (isFounder) return true;
    if (staffRole === "ADMIN") return true;
    // null staffRole = unassigned STAFF — show only universal items
    if (staffRole === null) return item.roles === null;
    if (item.roles === null) return true; // Academy, Dashboard shown to all
    return item.roles.includes(staffRole);
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
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">

      {/* ── Desktop sidebar ───────────────────────────────────── */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col">
        <div className="flex flex-col gap-y-5 bg-[var(--surface)] border-r border-white/10 px-4 py-6 h-full">
          {/* Brand — company logo */}
          <div className="px-2 pb-4 border-b border-white/10 flex items-center justify-between">
            <img src="/brand/company-logo.jpg" alt="Muzuka Gilbert" className="h-10 w-auto object-contain" />
            <ThemeToggle />
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

          {/* User info + sign out — desktop sidebar bottom */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-zinc-500 capitalize mt-0.5">
                {(staffRole ?? user?.role)?.toLowerCase().replace(/_/g," ")}
              </p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition group"
              >
                <LogOut className="h-4 w-4 group-hover:text-red-400 transition" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Mobile top bar ────────────────────────────────────── */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-[var(--surface)]/95 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <img src="/brand/company-logo.jpg" alt="Muzuka Gilbert" className="h-8 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="text-right">
            <p className="text-xs text-zinc-400 font-medium">{user?.name?.split(" ")[0]}</p>
            <p className="text-[10px] text-zinc-600 capitalize">{(staffRole ?? user?.role)?.toLowerCase().replace("_", " ")}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] font-bold text-xs">
            {user?.name?.charAt(0) ?? "A"}
          </div>
          <form action={logoutAction}>
            <button type="submit" className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition" title="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </form>
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
