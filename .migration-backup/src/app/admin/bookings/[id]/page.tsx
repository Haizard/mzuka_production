import Link from "next/link";
import { ArrowLeft, Calendar, MapPin, DollarSign, FileText, AlertCircle, Users, Camera, Video, Clock, Package, Star } from "lucide-react";
import { requireAdminAccess } from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";
import { BookingReminders } from "@/components/booking-reminders";
import { AdminBookingActions } from "./admin-booking-actions";
import { BOOKING_PIPELINE } from "@/lib/booking-constants";

export const dynamic = "force-dynamic";

function usd(cents: number) { return `$${(cents / 100).toFixed(2)}`; }
function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
function fmtTime(d: Date) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

interface AdminBookingDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminBookingDetailPage({ params }: AdminBookingDetailPageProps) {
  await requireAdminAccess("/admin/bookings");
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { client: true, package: true, gallery: { include: { mediaAssets: true } }, payments: true },
  });

  if (!booking) {
    return (
      <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
        <section className="mx-auto max-w-4xl">
          <Link href="/admin/bookings" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition">
            <ArrowLeft className="h-4 w-4" /> Back to bookings
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
  const totalPaid = booking.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amountCents, 0);
  const services   = booking.servicesJson as { photography?: string[]; video?: string[]; additional?: string[] };
  const deliverables = booking.deliverablesJson as { photos?: string[]; videos?: string[] };
  const photoSpec  = booking.photoSpecJson  as { quality?: string; editingStyle?: string; colorStyle?: string };
  const videoSpec  = booking.videoSpecJson  as { resolution?: string; frameRate?: string; orientation?: string; style?: string };
  const currentStage = BOOKING_PIPELINE.find((p) => p.value === booking.statusV2);
  const stageIdx   = BOOKING_PIPELINE.findIndex((p) => p.value === booking.statusV2);

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/admin/bookings" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition mb-3">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Booking Details</p>
            <h1 className="text-2xl font-bold text-white mt-1">{booking.title}</h1>
            <p className="text-sm text-zinc-400 mt-0.5">ID: <code className="text-xs">{booking.id}</code></p>
          </div>
          {currentStage && (
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full bg-white/10 ${currentStage.colour} shrink-0`}>
              {currentStage.label}
            </span>
          )}
        </div>

        {/* ── Pipeline strip ── */}
        <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-4">
          <p className="text-xs text-zinc-500 uppercase mb-3">Production Pipeline</p>
          <AdminBookingActions bookingId={booking.id} currentStatusV2={booking.statusV2} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* ── Main content (2 cols) ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Event & Client */}
            <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-5 space-y-4">
              <h2 className="font-semibold text-white">Event Details</h2>
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <Row icon={Star}     label="Event Type"  value={booking.eventType ?? booking.serviceType} />
                <Row icon={Calendar} label="Date"        value={fmt(scheduledDate)} />
                <Row icon={Clock}    label="Start Time"  value={fmtTime(scheduledDate)} />
                {booking.endTime && <Row icon={Clock} label="End Time" value={fmtTime(new Date(booking.endTime))} />}
                {booking.location  && <Row icon={MapPin}  label="Location"  value={booking.location} />}
                {booking.venueType && <Row icon={MapPin}  label="Venue Type" value={booking.venueType} />}
                {booking.guestCount && <Row icon={Users} label="Guests" value={String(booking.guestCount)} />}
              </div>
            </div>

            {/* Client info */}
            <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-5">
              <h2 className="font-semibold text-white mb-3">Client</h2>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <Row label="Name"  value={booking.client.name} />
                <Row label="Email" value={booking.client.email} />
                {booking.client.phone      && <Row label="Phone"     value={booking.client.phone} />}
                {booking.alternatePhone    && <Row label="Alt Phone"  value={booking.alternatePhone} />}
                {booking.organization      && <Row label="Organization" value={booking.organization} />}
                {booking.billingAddress    && <Row label="Billing"    value={booking.billingAddress} />}
              </div>
            </div>

            {/* Services & Deliverables */}
            {((services.photography?.length ?? 0) + (services.video?.length ?? 0) + (services.additional?.length ?? 0)) > 0 && (
              <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-5">
                <h2 className="font-semibold text-white mb-3">Services & Deliverables</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {services.photography && services.photography.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1"><Camera className="h-3 w-3" /> Photography</p>
                      <ul className="space-y-1">{services.photography.map((s) => <li key={s} className="text-sm text-zinc-300">• {s.replace(/_/g," ")}</li>)}</ul>
                    </div>
                  )}
                  {services.video && services.video.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1"><Video className="h-3 w-3" /> Video</p>
                      <ul className="space-y-1">{services.video.map((s) => <li key={s} className="text-sm text-zinc-300">• {s.replace(/_/g," ")}</li>)}</ul>
                    </div>
                  )}
                  {services.additional && services.additional.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1"><Star className="h-3 w-3" /> Additional</p>
                      <ul className="space-y-1">{services.additional.map((s) => <li key={s} className="text-sm text-zinc-300">• {s.replace(/_/g," ")}</li>)}</ul>
                    </div>
                  )}
                  {(deliverables.photos?.length ?? 0) + (deliverables.videos?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1"><Package className="h-3 w-3" /> Deliverables</p>
                      <ul className="space-y-1">
                        {[...(deliverables.photos ?? []), ...(deliverables.videos ?? [])].map((d) => <li key={d} className="text-sm text-zinc-300">• {d.replace(/_/g," ")}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Crew & Specs */}
            <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-5">
              <h2 className="font-semibold text-white mb-3">Crew & Specifications</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1"><Users className="h-3 w-3" /> Crew</p>
                  <div className="space-y-1 text-sm text-zinc-300">
                    <p>{booking.crewPhotographers} Photographer{booking.crewPhotographers !== 1 ? "s" : ""}</p>
                    <p>{booking.crewVideographers} Videographer{booking.crewVideographers !== 1 ? "s" : ""}</p>
                    {booking.crewDroneOps > 0 && <p>{booking.crewDroneOps} Drone Operator{booking.crewDroneOps !== 1 ? "s" : ""}</p>}
                    {booking.crewAssistants > 0 && <p>{booking.crewAssistants} Assistant{booking.crewAssistants !== 1 ? "s" : ""}</p>}
                    {booking.includedHours && <p className="text-zinc-400 text-xs mt-1">{booking.includedHours}h included coverage</p>}
                  </div>
                </div>
                {(photoSpec.quality || photoSpec.editingStyle) && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1"><Camera className="h-3 w-3" /> Photo Spec</p>
                    <div className="space-y-1 text-sm text-zinc-300">
                      {photoSpec.quality      && <p>Quality: {photoSpec.quality}</p>}
                      {photoSpec.editingStyle && <p>Style: {photoSpec.editingStyle}</p>}
                      {photoSpec.colorStyle   && <p>Color: {photoSpec.colorStyle}</p>}
                    </div>
                  </div>
                )}
                {(videoSpec.resolution || videoSpec.style) && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase mb-2 flex items-center gap-1"><Video className="h-3 w-3" /> Video Spec</p>
                    <div className="space-y-1 text-sm text-zinc-300">
                      {videoSpec.resolution   && <p>Resolution: {videoSpec.resolution}</p>}
                      {videoSpec.frameRate    && <p>Frame Rate: {videoSpec.frameRate}</p>}
                      {videoSpec.orientation  && <p>Orientation: {videoSpec.orientation}</p>}
                      {videoSpec.style        && <p>Style: {videoSpec.style}</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Special requests + notes */}
            {(booking.specialRequests || booking.notes) && (
              <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-5 space-y-3">
                {booking.specialRequests && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase mb-1">Special Requests</p>
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap">{booking.specialRequests}</p>
                  </div>
                )}
                {booking.notes && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase mb-1">Additional Notes</p>
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap">{booking.notes}</p>
                  </div>
                )}
              </div>
            )}

            {booking.internalNotes && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
                <p className="text-xs text-amber-400 uppercase mb-1">Internal Notes (Staff Only)</p>
                <p className="text-sm text-amber-200 whitespace-pre-wrap">{booking.internalNotes}</p>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-4">
            {/* Payment summary */}
            <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4 text-[var(--gold)]" /> Payment</h3>
              <div className="space-y-2 text-sm">
                {booking.package && <div className="flex justify-between"><span className="text-zinc-400">Package</span><span className="text-white">{usd(booking.package.priceCents)}</span></div>}
                {booking.quoteTotalCents > 0 && (
                  <div className="flex justify-between border-t border-white/10 pt-2 font-semibold">
                    <span className="text-zinc-300">Est. Quote</span>
                    <span className="text-[var(--gold)]">{usd(booking.quoteTotalCents)}</span>
                  </div>
                )}
                {booking.quoteTotalCents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Deposit ({booking.depositPercent}%)</span>
                    <span className="text-white">{usd(Math.round(booking.quoteTotalCents * booking.depositPercent / 100))}</span>
                  </div>
                )}
                {booking.deliveryFeeCents > 0 && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">{booking.deliveryDeadline} Delivery</span>
                    <span className="text-white">+{usd(booking.deliveryFeeCents)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/10 pt-2">
                  <span className="text-zinc-400">Total Paid</span>
                  <span className="text-emerald-400">{usd(totalPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Outstanding</span>
                  <span className="text-amber-400">{usd(Math.max(0, (booking.quoteTotalCents || booking.package?.priceCents || 0) - totalPaid))}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 flex gap-2 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full ${booking.paymentStatus === "PAID" ? "bg-emerald-500/15 text-emerald-300" : booking.paymentStatus === "DEPOSIT_PAID" ? "bg-blue-500/15 text-blue-300" : "bg-zinc-700/50 text-zinc-400"}`}>
                  {booking.paymentStatus.replace("_"," ")}
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-zinc-400">
                  {booking.deliveryDeadline} delivery
                </span>
              </div>
            </div>

            {/* Gallery link */}
            {booking.gallery && (
              <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-5">
                <h3 className="font-semibold text-white mb-2">Gallery</h3>
                <p className="text-sm text-zinc-400 mb-3">{booking.gallery.mediaAssets.length} assets</p>
                <Link href="/admin/galleries" className="inline-block rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-400 transition">
                  Manage Gallery
                </Link>
              </div>
            )}

            {/* Reminders */}
            <BookingReminders bookingId={booking.id} clientEmail={booking.client.email} clientPhone={booking.client.phone || undefined} />
          </div>
        </div>
      </section>
    </main>
  );
}

function Row({ icon: Icon, label, value }: { icon?: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-4 w-4 text-[var(--gold)] shrink-0 mt-0.5" />}
      <div>
        <p className="text-xs text-zinc-500 uppercase">{label}</p>
        <p className="text-white text-sm">{value}</p>
      </div>
    </div>
  );
}
