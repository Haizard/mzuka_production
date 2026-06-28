"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, CalendarDays, DollarSign, ImageIcon, Menu, X,
  GalleryHorizontalEnd, Package, Clapperboard, Bot, BarChart2,
  ClipboardList, BookOpen, Users, Scale, Shield, Wrench, UserCheck,
  Receipt, TrendingDown, FileText, CalendarRange, Truck, RotateCcw, Crown,
} from "lucide-react";

const primaryTabs = [
  { href: "/admin",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings",  icon: CalendarDays },
  { href: "/admin/finance",  label: "Finance",   icon: DollarSign },
  { href: "/admin/media-library", label: "Media", icon: ImageIcon },
];

const allNavItems = [
  { href: "/admin/approvals",           label: "Approvals",     icon: UserCheck },
  { href: "/admin/packages",            label: "Packages",      icon: Package },
  { href: "/admin/galleries",           label: "Galleries",     icon: GalleryHorizontalEnd },
  { href: "/admin/production",          label: "Production",    icon: Clapperboard },
  { href: "/admin/production/calendar", label: "Calendar",      icon: CalendarRange },
  { href: "/admin/production/delivery", label: "Delivery",      icon: Truck },
  { href: "/admin/finance/invoices",    label: "Invoices",      icon: Receipt },
  { href: "/admin/finance/expenses",    label: "Expenses",      icon: TrendingDown },
  { href: "/admin/finance/contracts",   label: "Contracts",     icon: FileText },
  { href: "/admin/ai",                  label: "AI Assistant",  icon: Bot },
  { href: "/admin/analytics",           label: "Analytics",     icon: BarChart2 },
  { href: "/admin/reports",             label: "Reports",       icon: ClipboardList },
  { href: "/admin/academy",             label: "Academy",       icon: BookOpen },
  { href: "/admin/employees",           label: "Employees",     icon: Users },
  { href: "/admin/equipment",           label: "Equipment",     icon: Wrench },
  { href: "/admin/equipment/returns",   label: "Returns",       icon: RotateCcw },
  { href: "/admin/legal",               label: "Legal",         icon: Scale },
  { href: "/admin/security",            label: "Security",      icon: Shield },
];

export function AdminMobileBottomNav({ isFounder }: { isFounder?: boolean }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = isFounder
    ? [...allNavItems, { href: "/admin/founder", label: "Founder HQ", icon: Crown }]
    : allNavItems;

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="mobile-bottom-nav lg:hidden">
        <div className="flex items-center justify-around py-2">
          {primaryTabs.map(({ href, label, icon: Icon }) => {
            const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`mobile-tab-item ${active ? "mobile-tab-active" : "mobile-tab-inactive"}`}
              >
                <div className={`mobile-tab-icon-wrap ${active ? "bg-[var(--gold)]/15" : ""}`}>
                  <Icon className={`h-5 w-5 ${active ? "text-[var(--gold)]" : "text-zinc-500"}`} />
                </div>
                <span className={`text-[10px] mt-1 font-medium tracking-wide ${active ? "text-[var(--gold)]" : "text-zinc-500"}`}>
                  {label}
                </span>
                {active && (
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[var(--gold)]" />
                )}
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="mobile-tab-item mobile-tab-inactive"
          >
            <div className="mobile-tab-icon-wrap">
              <Menu className="h-5 w-5 text-zinc-500" />
            </div>
            <span className="text-[10px] mt-1 font-medium tracking-wide text-zinc-500">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-up drawer */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden rounded-t-3xl bg-[var(--surface)] border-t border-white/10 max-h-[80dvh] overflow-y-auto mobile-drawer-open">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <p className="text-sm font-semibold text-white tracking-wider">All Sections</p>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                <X className="h-4 w-4 text-zinc-300" />
              </button>
            </div>
            {/* Grid of nav items */}
            <div className="grid grid-cols-3 gap-2 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
              {items.map(({ href, label, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-all active:scale-95 ${
                      active
                        ? "bg-[var(--gold)]/15 border border-[var(--gold)]/30"
                        : "bg-white/5 border border-white/8 hover:bg-white/10"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-[var(--gold)]" : "text-zinc-400"}`} />
                    <span className={`text-[10px] text-center font-medium leading-tight ${active ? "text-[var(--gold)]" : "text-zinc-400"}`}>
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
