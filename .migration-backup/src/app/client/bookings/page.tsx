import Link from "next/link";
import { Calendar, FileText, Plus } from "lucide-react";
import { getClientBookings } from "@/app/client/actions";

export const dynamic = "force-dynamic";

export default async function ClientBookingsPage() {
  const result = await getClientBookings();

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
              Your bookings
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Session History</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Track your bookings, payments, and gallery access here.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--gold)] px-4 text-sm font-semibold text-black hover:bg-yellow-500 transition"
            href="/client/bookings/new"
          >
            <Plus className="h-4 w-4" />
            New Booking
          </Link>
        </header>

        <section className="mt-6">
          {!result.success || result.bookings.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-zinc-600" />
              <h2 className="mt-4 text-lg font-semibold">No bookings yet</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Start by requesting a new session below.
              </p>
              <Link
                href="/client/bookings/new"
                className="mt-4 inline-block rounded-lg bg-[var(--gold)] px-6 py-2 text-sm font-semibold text-black hover:bg-yellow-500 transition"
              >
                Request a Session
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {result.bookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/client/bookings/${booking.id}`}
                  className="block rounded-lg border border-white/10 bg-[var(--surface)] p-6 transition hover:border-white/20 hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{booking.title}</h3>
                      <p className="mt-1 text-sm text-zinc-400">{booking.serviceType}</p>

                      <div className="mt-4 flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Calendar className="h-4 w-4" />
                          {new Date(booking.scheduledAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>

                        <div className="inline-block rounded px-2 py-1 text-xs font-medium">
                          {booking.status === "REQUESTED" && (
                            <span className="text-blue-300 bg-blue-500/10">Pending Review</span>
                          )}
                          {booking.status === "CONFIRMED" && (
                            <span className="text-emerald-300 bg-emerald-500/10">Confirmed</span>
                          )}
                          {booking.status === "IN_PROGRESS" && (
                            <span className="text-yellow-300 bg-yellow-500/10">In Progress</span>
                          )}
                          {booking.status === "COMPLETED" && (
                            <span className="text-purple-300 bg-purple-500/10">Completed</span>
                          )}
                          {booking.status === "CANCELLED" && (
                            <span className="text-red-300 bg-red-500/10">Cancelled</span>
                          )}
                        </div>

                        {booking.paymentStatus !== "UNPAID" && (
                          <div className="inline-block rounded px-2 py-1 text-xs font-medium">
                            {booking.paymentStatus === "PAID" && (
                              <span className="text-emerald-300 bg-emerald-500/10">Paid</span>
                            )}
                            {booking.paymentStatus === "DEPOSIT_PAID" && (
                              <span className="text-blue-300 bg-blue-500/10">Deposit Paid</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-xs text-zinc-500">
                      {new Date(booking.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
