import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ArrowLeft, Calendar, MapPin, Users, Package } from "lucide-react";
import { NewProjectForm } from "./new-project-form";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  await requireAdmin();

  // Load ALL confirmed bookings that don't have a project yet
  const bookings = await prisma.booking.findMany({
    where: {
      status: { in: ["CONFIRMED", "IN_PROGRESS"] },
      project: null,
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      package: { select: { name: true, priceCents: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  // Also load staff for assignment
  const staff = await prisma.user.findMany({
    where: { role: "STAFF", approvalStatus: "APPROVED" },
    select: { id: true, name: true, email: true, staffRole: true },
    orderBy: { name: "asc" },
  });

  function fmt(d: Date) {
    return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  function fmtTime(d: Date) {
    return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <main className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/admin/production"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Production
        </Link>
        <h2 className="text-2xl font-bold text-white">Create Production Project</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Select a confirmed booking and set up the production schedule, crew, and shoot dates.
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-12 text-center">
          <Calendar className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
          <p className="text-white font-semibold">No bookings ready for production</p>
          <p className="text-sm text-zinc-400 mt-2 mb-4">
            Confirm a booking first before creating a production project.
          </p>
          <Link href="/admin/bookings"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400 transition">
            View Bookings
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: booking list (3 cols) */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              {bookings.length} Booking{bookings.length !== 1 ? "s" : ""} Ready
            </h3>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {bookings.map((b) => (
                <div key={b.id}
                  className="rounded-xl border border-white/10 bg-[var(--surface)] p-4 hover:border-[var(--gold)]/30 transition cursor-pointer"
                  data-booking-id={b.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{b.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{b.eventType ?? b.serviceType}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      b.status === "CONFIRMED" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
                    }`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-1.5 text-xs text-zinc-400">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span>{b.client.name} · {b.client.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span>{fmt(b.scheduledAt)} at {fmtTime(b.scheduledAt)}</span>
                    </div>
                    {b.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span>{b.location}</span>
                      </div>
                    )}
                    {b.package && (
                      <div className="flex items-center gap-2">
                        <Package className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                        <span>{b.package.name} — ${(b.package.priceCents / 100).toFixed(0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form (2 cols) */}
          <div className="lg:col-span-2">
            <NewProjectForm
              bookings={bookings.map((b) => ({
                id: b.id, title: b.title,
                clientName: b.client.name,
                eventType: b.eventType ?? b.serviceType,
                scheduledAt: b.scheduledAt.toISOString(),
              }))}
              staff={staff}
            />
          </div>
        </div>
      )}
    </main>
  );
}
