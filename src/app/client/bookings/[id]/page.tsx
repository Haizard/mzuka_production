import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, DollarSign, FileText, AlertCircle } from "lucide-react";
import { getBookingById } from "@/app/client/actions";

export const dynamic = "force-dynamic";

interface BookingDetailPageProps {
  params: {
    id: string;
  };
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const result = await getBookingById(params.id);

  if (!result.success || !result.booking) {
    return (
      <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl">
          <Link href="/client/bookings" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition">
            <ArrowLeft className="h-4 w-4" />
            Back to bookings
          </Link>

          <div className="mt-8 rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
            <p className="mt-4 text-red-200">{result.error}</p>
          </div>
        </section>
      </main>
    );
  }

  const booking = result.booking;
  const scheduledDate = new Date(booking.scheduledAt);
  const totalAmount = booking.payments.reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl">
        <Link href="/client/bookings" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" />
          Back to bookings
        </Link>

        <header className="mt-6 mb-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">Booking Details</p>
          <h1 className="mt-2 text-3xl font-semibold">{booking.title}</h1>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Status Card */}
            <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6">
              <h2 className="font-semibold text-white mb-4">Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Booking Status</span>
                  <span className="inline-block rounded px-3 py-1 text-sm font-medium">
                    {booking.status === "REQUESTED" && (
                      <span className="text-blue-300 bg-blue-500/10 px-2 py-1 rounded">Pending Review</span>
                    )}
                    {booking.status === "CONFIRMED" && (
                      <span className="text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">Confirmed</span>
                    )}
                    {booking.status === "IN_PROGRESS" && (
                      <span className="text-yellow-300 bg-yellow-500/10 px-2 py-1 rounded">In Progress</span>
                    )}
                    {booking.status === "COMPLETED" && (
                      <span className="text-purple-300 bg-purple-500/10 px-2 py-1 rounded">Completed</span>
                    )}
                    {booking.status === "CANCELLED" && (
                      <span className="text-red-300 bg-red-500/10 px-2 py-1 rounded">Cancelled</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Payment Status</span>
                  <span className="inline-block rounded px-3 py-1 text-sm font-medium">
                    {booking.paymentStatus === "UNPAID" && (
                      <span className="text-zinc-300 bg-zinc-500/10 px-2 py-1 rounded">Unpaid</span>
                    )}
                    {booking.paymentStatus === "DEPOSIT_PAID" && (
                      <span className="text-blue-300 bg-blue-500/10 px-2 py-1 rounded">Deposit Paid</span>
                    )}
                    {booking.paymentStatus === "PAID" && (
                      <span className="text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">Fully Paid</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6">
              <h2 className="font-semibold text-white mb-4">Event Details</h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <FileText className="h-5 w-5 text-[var(--gold)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Service Type</p>
                    <p className="text-white capitalize">{booking.serviceType}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Calendar className="h-5 w-5 text-[var(--gold)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-500 uppercase">Event Date & Time</p>
                    <p className="text-white">
                      {scheduledDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}{" "}
                      at {scheduledDate.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {booking.location && (
                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 text-[var(--gold)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">Location</p>
                      <p className="text-white">{booking.location}</p>
                    </div>
                  </div>
                )}

                {booking.package && (
                  <div className="flex gap-3">
                    <DollarSign className="h-5 w-5 text-[var(--gold)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-zinc-500 uppercase">Package</p>
                      <p className="text-white">{booking.package.name}</p>
                      {booking.package.durationMin && (
                        <p className="text-sm text-zinc-400">{booking.package.durationMin} minutes</p>
                      )}
                    </div>
                  </div>
                )}

                {booking.notes && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase mb-2">Notes</p>
                    <p className="text-white text-sm whitespace-pre-wrap">{booking.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Gallery Preview */}
            {booking.gallery && (
              <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6">
                <h2 className="font-semibold text-white mb-4">Gallery</h2>
                <p className="text-sm text-zinc-400 mb-4">
                  Your event gallery will be available here once photos are uploaded.
                </p>
                <Link
                  href={`/client/galleries/${booking.gallery.id}`}
                  className="inline-block rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500 transition"
                >
                  View Gallery
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6 h-fit">
            <h3 className="font-semibold text-white mb-4">Payment Summary</h3>
            <div className="space-y-3 text-sm">
              {booking.package && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Package Price</span>
                  <span className="text-white">
                    ${(booking.package.priceCents / 100).toFixed(2)}
                  </span>
                </div>
              )}

              {booking.payments.length > 0 && (
                <div className="border-t border-white/10 pt-3 mt-3">
                  <p className="text-xs text-zinc-500 uppercase mb-2">Payments</p>
                  {booking.payments.map((payment) => (
                    <div key={payment.id} className="flex justify-between text-xs mb-2">
                      <span className="text-zinc-400 capitalize">{payment.status.toLowerCase()}</span>
                      <span className="text-white">${(payment.amountCents / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-white/10 pt-3 mt-3 flex justify-between font-semibold">
                <span>Total Paid</span>
                <span className="text-[var(--gold)]">${(totalAmount / 100).toFixed(2)}</span>
              </div>

              {booking.paymentStatus === "UNPAID" && (
                <button className="mt-4 w-full rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500 transition">
                  Complete Payment
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
