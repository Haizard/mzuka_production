"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function NotificationBell({ href = "/admin/messages" }: { href?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetch("/api/dm/unread");
        if (res.ok) {
          const data = await res.json();
          setCount(data.count ?? 0);
        }
      } catch {}
    }
    fetchUnread();
    const id = setInterval(fetchUnread, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <Link
      href={href}
      className="relative p-2 text-zinc-400 hover:text-white transition rounded-lg hover:bg-white/5"
      title="Messages"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
