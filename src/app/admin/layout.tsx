import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, GalleryHorizontalEnd, UserCheck,
  Package, Shield, Clapperboard, CalendarRange, Truck,
  DollarSign, Receipt, TrendingDown, FileText,
  Bot, BarChart2, ImageIcon, ClipboardList,
  BookOpen, Users, Scale, Crown,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";

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

  const navItems = [
    ...baseNavItems,
    ...(user?.role === "FOUNDER" ? [{ href: "/admin/founder", label: "Founder HQ", icon: Crown }] : []),
  ];

  return (
    <div className="min-h-dvh bg-[var(--background)] text-white">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-60 lg:flex-col">
        <div className="flex flex-col gap-y-5 bg-[var(--surface)] border-r border-white/10 px-4 py-6 h-full">
          {/* Brand */}
          <div className="px-2 pb-4 border-b border-white/10">
            <p className="text-[var(--gold)] font-bold text-lg tracking-widest">[MG]</p>
            <p className="text-xs text-zinc-500 mt-0.5 tracking-wider uppercase">Command Center</p>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1">
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

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-[var(--surface)] border-b border-white/10 px-4 py-3">
        <p className="text-[var(--gold)] font-bold tracking-widest">[MG]</p>
        <div className="flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/10 transition whitespace-nowrap"
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main content */}
      <main className="lg:pl-60">
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
