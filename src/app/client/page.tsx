import Link from "next/link";
import {
  CalendarDays, GalleryHorizontalEnd, MessageCircle,
  Plus, ArrowRight, Clock, CheckCircle2, ShieldCheck,
  LockKeyhole, Star,
} from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ClientPage() {
  const user = await requireApprovedUser();

  // Load the client's real data
  const [bookings, messages, galleries] = await Promise.all([
    prisma.booking.findMany({
      where: { clientId: user.id },
      include: { package: true, gallery: true, payments: true },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.message.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.gallery.findMany({
      where: { booking: { clientId: user.id } },
      include: { booking: { select: { title: true } }, mediaAssets: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const totalBookings = await prisma.booking.count({ where: { clientId: user.id } });
  const totalGalleries = await prisma.gallery.count({ where: { booking: { clientId: user.id } } });
  const hasUnpaid = bookings.some((b) => b.paymentStatus === "UNPAID" && b.status !== "CANCELLED");

  return (
    <main className="min-h-dvh bg-[var(--background)] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">Client Portal</p>
            <h1 className="mt-2 text-3xl font-bold">Welcome, {user.name}</h1>
            <p className="mt-1 text-sm text-zinc-400">{user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/client/bookings/new"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--gold)] px-4 text-sm font-semibold text-black hover:bg-yellow-400 transition"
            >
              <Plus className="h-4 w-4" />
              Book Session
            </Link>
            <form action={logoutAction}>
              <button className="h-11 rounded-lg border border-white/10 px-4 text-sm text-zinc-300 hover:bg-white/5 transition">
                Sign out
              </button>
            </form>
          </div>
        </header>

        {/* ── Payment alert ── */}
        {hasUnpaid && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LockKeyhole className="h-5 w-5 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-200">
                You have an unpaid booking. Complete payment to unlock your gallery.
              </p>
            </div>
            <Link href="/client/bookings"
              className="shrink-0 text-xs font-semibold text-amber-300 hover:text-white transition">
              View →
            </Link>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
            <CalendarDays className="h-5 w-5 text-[var(--gold)]" />
            <p className="mt-3 text-3xl font-bold">{totalBookings}</p>
            <p className="mt-1 text-sm text-zinc-400">Total Bookings</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
            <GalleryHorizontalEnd className="h-5 w-5 text-[var(--gold)]" />
            <p className="mt-3 text-3xl font-bold">{totalGalleries}</p>
            <p className="mt-1 text-sm text-zinc-400">Your Galleries</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
            <MessageCircle className="h-5 w-5 text-[var(--gold)]" />
            <p className="mt-3 text-3xl font-bold">{messages.length}</p>
            <p className="mt-1 text-sm text-zinc-400">Messages</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 grid-cols-2 lg:grid-cols-3">

          {/* ── Bookings ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent Bookings</h2>
              <Link href="/client/bookings"
                className="flex items-center gap-1 text-sm text-[var(--gold)] hover:underline">
                All bookings <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {bookings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 bg-[var(--surface)] p-8 text-center">
                <CalendarDays className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">No bookings yet.</p>
                <Link href="/client/bookings/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400 transition">
                  <Plus className="h-4 w-4" /> Book your first session
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => {
                  const isPaid = booking.paymentStatus === "PAID";
                  const statusColour: Record<string, string> = {
                    REQUESTED:   "text-blue-300 bg-blue-500/10",
                    CONFIRMED:   "text-emerald-300 bg-emerald-500/10",
                    IN_PROGRESS: "text-amber-300 bg-amber-500/10",
                    COMPLETED:   "text-violet-300 bg-violet-500/10",
                    CANCELLED:   "text-red-300 bg-red-500/10",
                  };
                  const statusLabel: Record<string, string> = {
                    REQUESTED: "Pending Review", CONFIRMED: "Confirmed",
                    IN_PROGRESS: "In Progress", COMPLETED: "Completed", CANCELLED: "Cancelled",
                  };
                  return (
                    <Link key={booking.id} href={`/client/bookings/${booking.id}`}
                      className="block rounded-lg border border-white/10 bg-[var(--surface)] p-4 hover:border-white/20 hover:bg-white/5 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white truncate">{booking.title}</p>
                          <p className="text-sm text-zinc-400 mt-0.5">{booking.serviceType}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColour[booking.status] ?? "text-zinc-400"}`}>
                              {statusLabel[booking.status] ?? booking.status}
                            </span>
                            {booking.gallery && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--gold)]/10 text-[var(--gold)]">
                                Gallery ready
                              </span>
                            )}
                            {!isPaid && booking.status !== "CANCELLED" && booking.package && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-300">
                                Payment pending
                              </span>
                            )}
                            {isPaid && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300">
                                ✓ Paid
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-zinc-500 shrink-0">
                          <Clock className="inline h-3 w-3 mr-0.5" />
                          {new Date(booking.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    </Link>
                  );
                })}
                <Link href="/client/bookings/new"
                  className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 p-3 text-sm text-zinc-500 hover:text-white hover:border-white/20 transition">
                  <Plus className="h-4 w-4" /> New booking
                </Link>
              </div>
            )}

            {/* ── Galleries ── */}
            {galleries.length > 0 && (
              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-white">Your Galleries</h2>
                </div>
                <div className="grid gap-3 grid-cols-2">
                  {galleries.map((gallery) => {
                    const expired = gallery.expiresAt ? new Date(gallery.expiresAt) < new Date() : false;
                    return (
                      <Link key={gallery.id} href={`/client/galleries/${gallery.id}`}
                        className="rounded-lg border border-white/10 bg-[var(--surface)] p-4 hover:border-[var(--gold)]/30 transition group">
                        <div className="flex items-center gap-3 mb-2">
                          <GalleryHorizontalEnd className="h-4 w-4 text-[var(--gold)]" />
                          <p className="font-medium text-white truncate">{gallery.title}</p>
                        </div>
                        <p className="text-xs text-zinc-400 truncate mb-2">{gallery.booking?.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-zinc-500">{gallery.mediaAssets.length} photos</span>
                          {expired
                            ? <span className="text-xs text-red-400">Expired</span>
                            : <span className="text-xs text-emerald-400">Active</span>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">

            {/* Quick actions */}
            <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link href="/client/bookings/new"
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-white/5 transition">
                  <div className="h-8 w-8 rounded-lg bg-[var(--gold)]/10 flex items-center justify-center">
                    <CalendarDays className="h-4 w-4 text-[var(--gold)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Book a Session</p>
                    <p className="text-xs text-zinc-500">Photography, video, events</p>
                  </div>
                </Link>
                <Link href="/client/bookings"
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-white/5 transition">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">My Bookings</p>
                    <p className="text-xs text-zinc-500">Track status & payments</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Messages */}
            <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Recent Messages</h3>
              {messages.length === 0 ? (
                <p className="text-xs text-zinc-500">No messages yet. Messages about your bookings and gallery will appear here.</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="border-b border-white/5 pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-medium text-white truncate">{msg.subject}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${msg.channel === "email" ? "text-blue-300" : "text-emerald-300"}`}>
                          {msg.channel.toUpperCase()}
                        </span>
                        <span className="text-xs text-zinc-600">
                          {new Date(msg.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy notice */}
            <div className="rounded-lg border border-[var(--gold)]/20 bg-[var(--gold)]/5 p-4">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 text-[var(--gold)] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Protected by [MG]</p>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Only you can access your gallery. All views are logged. Downloads require payment confirmation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
