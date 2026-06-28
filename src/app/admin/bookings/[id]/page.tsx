import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, DollarSign, FileText, AlertCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookingReminders } from "@/components/booking-reminders";

export const dynamic = "force-dynamic";

interface AdminBookingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBookingDetailPage({
  params,
}: AdminBookingDetailPageProps) {
  await requireAdmin();
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      client: true,
      package: true,
      gallery: {
        include: {
          mediaAssets: true,
        },
      },
      payments: true,
    },
  });

  if (!booking) {
    return (
      <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl">
          <Link
            href="/admin/bookings"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to bookings
          </Link>

          <div className="mt-8 rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
            <p className="mt-4 text-red-200">Booking not found</p>
          </div>
        </section>
      </main>
    );
  }

  const scheduledDate = new Date(booking.scheduledAt);
  const totalPaid = booking.payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amountCents, 0);

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl">
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to bookings
        </Link>

        <header className="mt-6 mb-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
            Admin Booking Details
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{booking.title}</h1>
          <p className="text-sm text-zinc-400 mt-2">
            Booking ID: <code className="text-xs">{booking.id}</code>
          </p>
        </header>

        <div className="grid gap-6">
          {/* Status and Client Info */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6">
              <h2 className="font-semibold text-white mb-4">Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Booking Status</span>
                  <span className="capitalize text-sm font-medium">
                    {booking.status === "REQUESTED" && (
                      <span className="text-blue-300 bg-blue-500/10 px-2 py-1 rounded">
                        Pending Review
                      </span>
                    )}
                    {booking.status === "CONFIRMED" && (
                      <span className="text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">
                        Confirmed
                      </span>
                    )}
                    {booking.status === "IN_PROGRESS" && (
                      <span className="text-yellow-300 bg-yellow-500/10 px-2 py-1 rounded">
                        In Progress
                      </span>
                    )}
                    {booking.status === "COMPLETED" && (
                      <span className="text-purple-300 bg-purple-500/10 px-2 py-1 rounded">
                        Completed
                      </span>
                    )}
                    {booking.status === "CANCELLED" && (
                      <span className="text-red-300 bg-red-500/10 px-2 py-1 rounded">
                        Cancelled
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Payment Status</span>
                  <span className="capitalize text-sm font-medium">
                    {booking.paymentStatus === "UNPAID" && (
                      <span className="text-zinc-300 bg-zinc-500/10 px-2 py-1 rounded">
                        Unpaid
                      </span>
                    )}
                    {booking.paymentStatus === "DEPOSIT_PAID" && (
                      <span className="text-blue-300 bg-blue-500/10 px-2 py-1 rounded">
                        Deposit Paid
                      </span>
                    )}
                    {booking.paymentStatus === "PAID" && (
                      <span className="text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">
                        Fully Paid
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6">
              <h2 className="font-semibold text-white mb-4">Client Info</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-zinc-400">Name</p>
                  <p className="text-white">{booking.client.name}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Email</p>
                  <p className="text-white break-all">{booking.client.email}</p>
                </div>
                {booking.client.phone && (
                  <div>
                    <p className="text-zinc-400">Phone</p>
                    <p className="text-white">{booking.client.phone}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Event Details */}
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
                    at{" "}
                    {scheduledDate.toLocaleTimeString("en-US", {
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
                      <p className="text-sm text-zinc-400">
                        {booking.package.durationMin} minutes
                      </p>
                    )}
                  </div>
                </div>
              )}

              {booking.notes && (
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-2">Notes</p>
                  <p className="text-white text-sm whitespace-pre-wrap">
                    {booking.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6">
            <h2 className="font-semibold text-white mb-4">Payment Summary</h2>
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
                  <p className="text-xs text-zinc-500 uppercase mb-2">
                    Payments
                  </p>
                  {booking.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex justify-between text-xs mb-2"
                    >
                      <span className="text-zinc-400 capitalize">
                        {payment.status.toLowerCase()}
                      </span>
                      <span className="text-white">
                        ${(payment.amountCents / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-white/10 pt-3 mt-3 flex justify-between font-semibold">
                <span>Total Paid</span>
                <span className="text-[var(--gold)]">
                  ${(totalPaid / 100).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between font-semibold text-white">
                <span>Outstanding</span>
                <span className="text-orange-400">
                  ${((booking.package?.priceCents || 0) - totalPaid) / 100 > 0
                    ? ((booking.package?.priceCents || 0) - totalPaid) / 100
                    : 0}
                </span>
              </div>
            </div>
          </div>

          {/* Gallery Section */}
          {booking.gallery && (
            <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6">
              <h2 className="font-semibold text-white mb-4">Gallery</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Gallery ID</span>
                  <code className="text-xs text-white">{booking.gallery.id}</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Media Assets</span>
                  <span className="text-white">
                    {booking.gallery.mediaAssets.length} files
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Expires</span>
                  <span className="text-white">
                    {booking.gallery.expiresAt
                      ? new Date(
                          booking.gallery.expiresAt
                        ).toLocaleDateString()
                      : "No expiration"}
                  </span>
                </div>
              </div>
              <Link
                href={`/admin/galleries?galleryId=${booking.gallery.id}`}
                className="mt-4 inline-block rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500 transition"
              >
                Manage Gallery
              </Link>
            </div>
          )}

          {/* Reminders */}
          <BookingReminders
            bookingId={booking.id}
            clientEmail={booking.client.email}
            clientPhone={booking.client.phone || undefined}
          />
        </div>
      </section>
    </main>
  );
}
