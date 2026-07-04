import Link from "next/link";
import type { ComponentType } from "react";
import {
  CalendarDays,
  GalleryHorizontalEnd,
  ShieldCheck,
  UserCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { requireAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";

export default async function AdminPage() {
  const admin = await requireAdminAccess("/admin");
  const [totalClients, pendingClients, totalBookings, totalGalleries] =
    await Promise.all([
      prisma.user.count({ where: { role: "CLIENT" } }),
      prisma.user.count({
        where: { role: "CLIENT", approvalStatus: "PENDING" },
      }),
      prisma.booking.count(),
      prisma.gallery.count(),
    ]);

  const stats = [
    { label: "Clients", value: totalClients, icon: Users },
    { label: "Pending approval", value: pendingClients, icon: UserCheck },
    { label: "Bookings", value: totalBookings, icon: CalendarDays },
    { label: "Galleries", value: totalGalleries, icon: GalleryHorizontalEnd },
  ];

  return (
    <main className="min-h-dvh bg-[var(--background)] text-white">
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
              Admin command center
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              Welcome, {admin.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Role: {admin.role}. Control client access, bookings, galleries,
              payments, and release permissions.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              className="inline-flex h-11 items-center rounded-lg bg-[var(--gold)] px-4 text-sm font-semibold text-black"
              href="/admin/approvals"
            >
              Review approvals
            </Link>
            <form action={logoutAction}>
              <button className="h-11 rounded-lg border border-white/10 px-4 text-sm text-zinc-200 hover:bg-white/5">
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="mt-6 grid gap-4 grid-cols-2 md:grid-cols-4">
          {stats.map((stat) => (
            <article
              className="rounded-lg border border-white/10 bg-[var(--surface)] p-5"
              key={stat.label}
            >
              <stat.icon className="h-5 w-5 text-[var(--gold)]" />
              <p className="mt-5 text-3xl font-semibold">{stat.value}</p>
              <p className="mt-1 text-sm text-zinc-400">{stat.label}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-3">
          <AdminModule
            icon={UserCheck}
            title="Client Approval"
            text="Approve or reject private account requests before gallery access."
            href="/admin/approvals"
          />
          <AdminModule
            icon={CalendarDays}
            title="Bookings"
            text="Next build step: booking requests, service packages, and reminders."
            href="/admin"
          />
          <AdminModule
            icon={WalletCards}
            title="Payment Unlock"
            text="Next build step: Stripe checkout and full-resolution delivery unlock."
            href="/admin"
          />
        </section>

        <section className="mt-6 rounded-lg border border-[var(--gold)]/25 bg-[var(--deep-red)]/20 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--gold)]" />
            <p className="text-sm leading-6 text-zinc-200">
              Founder/admin approval is now the first protection layer. Gallery
              upload, watermark previews, and Stripe unlock will build on this
              route guard.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

function AdminModule({
  href,
  icon: Icon,
  text,
  title,
}: Readonly<{
  href: string;
  icon: ComponentType<{ className?: string }>;
  text: string;
  title: string;
}>) {
  return (
    <Link
      className="rounded-lg border border-white/10 bg-[var(--surface)] p-5 transition hover:border-[var(--gold)]/40"
      href={href}
    >
      <div className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--gold)] text-black">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="mt-5 text-lg font-semibold">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{text}</p>
    </Link>
  );
}
