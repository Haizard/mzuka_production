import { User, Mail, Phone, Shield, CheckCircle, Clock, LogOut, CalendarDays } from "lucide-react";
import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/app/(auth)/actions";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function ProfilePage() {
  const user = await requireApprovedUser();

  const [bookingCount, galleryCount] = await Promise.all([
    prisma.booking.count({ where: { clientId: user.id } }),
    prisma.gallery.count({ where: { booking: { clientId: user.id } } }),
  ]);

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <main className="min-h-dvh bg-[var(--background)] text-white pb-24 lg:pb-8">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)] mb-1">Account</p>
          <h1 className="text-2xl font-bold">Profile</h1>
        </header>

        {/* Avatar + name */}
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-6 mb-4 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--gold)]/40 to-[var(--gold)]/10 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-[var(--gold)]">{initials}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{user.name}</h2>
            <p className="text-sm text-zinc-400 truncate">{user.email}</p>
            <span className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
              <CheckCircle className="h-3 w-3" /> Approved Client
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--gold)]">{bookingCount}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {bookingCount === 1 ? "Booking" : "Bookings"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4 text-center">
            <p className="text-2xl font-bold text-[var(--gold)]">{galleryCount}</p>
            <p className="text-xs text-zinc-500 mt-1">
              {galleryCount === 1 ? "Gallery" : "Galleries"}
            </p>
          </div>
        </div>

        {/* Contact details */}
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5 mb-4 space-y-4">
          <h3 className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-semibold">Contact</h3>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">Email</p>
              <p className="text-sm text-white truncate">{user.email}</p>
            </div>
            {user.emailVerifiedAt && (
              <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 ml-auto" />
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">Phone</p>
              <p className="text-sm text-white">{user.phone ?? "Not provided"}</p>
            </div>
          </div>
        </div>

        {/* Account info */}
        <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-5 mb-4 space-y-4">
          <h3 className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-semibold">Account</h3>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Role</p>
              <p className="text-sm text-white capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <CalendarDays className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Member since</p>
              <p className="text-sm text-white">{formatDate(user.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Approval status</p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" /> Approved
              </span>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <form action={logoutAction} className="w-full">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3.5 text-sm font-semibold text-red-400 hover:bg-red-500/20 transition active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </form>

        {/* Privacy note */}
        <p className="mt-4 text-center text-xs text-zinc-600">
          All gallery previews carry a dynamic watermark linked to your account.
        </p>
      </div>
    </main>
  );
}
