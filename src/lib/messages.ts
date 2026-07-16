/**
 * messages.ts — Backwards-compatible adapters around notify.ts
 *
 * All existing callers continue to work unchanged.
 * New code should import from notify.ts directly.
 */
import {
  notifyWelcome,
  notifyApproved,
  notifyRejected,
  notifyBookingConfirmed,
  notifyPaymentReceived,
  notifyGalleryReady,
} from "@/lib/notify";

// ── Welcome ───────────────────────────────────────────────────────────────────
export async function sendWelcomeMessage(user: {
  id: string; name: string; email: string; phone?: string | null;
}) {
  return notifyWelcome(user);
}

// ── Approval ──────────────────────────────────────────────────────────────────
export async function sendApprovalMessage(user: {
  id: string; name: string; email: string; phone?: string | null;
}) {
  return notifyApproved(user);
}

// ── Rejection ─────────────────────────────────────────────────────────────────
export async function sendRejectionMessage(user: {
  id: string; name: string; email: string;
}) {
  return notifyRejected(user);
}

// ── Booking confirmed ─────────────────────────────────────────────────────────
export async function sendBookingConfirmedMessage(data: {
  userId: string; userName: string; userEmail: string; userPhone?: string | null;
  bookingTitle: string; serviceType: string; scheduledAt: Date;
  location?: string | null; packageName?: string | null;
}) {
  return notifyBookingConfirmed(
    { id: data.userId, name: data.userName, email: data.userEmail, phone: data.userPhone },
    {
      title: data.bookingTitle,
      serviceType: data.serviceType,
      scheduledAt: data.scheduledAt,
      location: data.location,
      packageName: data.packageName,
      bookingId: "", // legacy callers don't pass bookingId
    }
  );
}

// ── Payment received ──────────────────────────────────────────────────────────
export async function sendPaymentReceivedMessage(data: {
  userId: string; userName: string; userEmail: string; userPhone?: string | null;
  bookingTitle: string; amountCents: number; currency: string;
}) {
  return notifyPaymentReceived(
    { id: data.userId, name: data.userName, email: data.userEmail, phone: data.userPhone },
    { title: data.bookingTitle, bookingId: "" },
    data.amountCents,
    data.currency,
  );
}

// ── Gallery ready ─────────────────────────────────────────────────────────────
export async function sendGalleryReadyMessage(data: {
  userId: string; userName: string; userEmail: string; userPhone?: string | null;
  galleryTitle: string; galleryId: string; isPaid: boolean; mediaCount: number;
}) {
  return notifyGalleryReady(
    { id: data.userId, name: data.userName, email: data.userEmail, phone: data.userPhone },
    { title: data.galleryTitle, galleryId: data.galleryId, isPaid: data.isPaid, mediaCount: data.mediaCount },
  );
}
