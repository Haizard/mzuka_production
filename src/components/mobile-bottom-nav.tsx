"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, GalleryHorizontalEnd, MessageCircle, User } from "lucide-react";

const clientTabs = [
  { href: "/client",          label: "Home",     icon: Home },
  { href: "/client/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/client/galleries",label: "Gallery",  icon: GalleryHorizontalEnd },
  { href: "/client/messages", label: "Messages", icon: MessageCircle },
  { href: "/client/profile",  label: "Profile",  icon: User },
];

export function ClientMobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav lg:hidden">
      <div className="flex items-center justify-around py-2">
        {clientTabs.map(({ href, label, icon: Icon }) => {
          const active = href === "/client" ? pathname === "/client" : pathname.startsWith(href);
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
      </div>
    </nav>
  );
}
