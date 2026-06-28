/**
 * Automatic transactional messages for Muzuka Gilbert.
 *
 * Triggers:
 *   - Registration welcome
 *   - Client approved / rejected
 *   - Booking confirmed
 *   - Payment received
 *   - Gallery ready (released)
 *
 * Channels: Email (Resend) + SMS (Twilio).
 * Every message is stored in the Message table for a full audit trail.
 */
import { Resend } from "resend";
import twilio from "twilio";
import { prisma } from "@/lib/db";

// ── Clients ───────────────────────────────────────────────────────────────────

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || key.startsWith("replace")) return null;
  return new Resend(key);
}

function getTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !sid.startsWith("AC")) return null;
  return twilio(sid, token);
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@muzuka.com";
const FROM_SMS =
  process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM_NUMBER ?? "";

// ── Core send helpers ─────────────────────────────────────────────────────────

async function sendEmail(
  userId: string,
  to: string,
  subject: string,
  html: string
) {
  const resend = getResend();
  if (!resend) {
    console.warn("[messages] Resend not configured — skipping email to", to);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });

  await prisma.message.create({
    data: {
      userId,
      subject,
      body: html,
      channel: "email",
      sentAt: error ? null : new Date(),
    },
  });

  if (error) console.error("[messages] email error:", error.message);
}

async function sendSms(userId: string, to: string, body: string) {
  const client = getTwilio();
  if (!client || !FROM_SMS) {
    console.warn("[messages] SMS not configured — skipping");
    return;
  }

  try {
    await client.messages.create({ from: FROM_SMS, to, body });
    await prisma.message.create({
      data: { userId, subject: "SMS", body, channel: "sms", sentAt: new Date() },
    });
  } catch (err) {
    console.error("[messages] sms error:", err);
    await prisma.message.create({
      data: { userId, subject: "SMS", body, channel: "sms", sentAt: null },
    });
  }
}

// ── Message triggers ──────────────────────────────────────────────────────────

/** Sent immediately after a new client registers. */
export async function sendWelcomeMessage(user: {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}) {
  const subject = "Welcome to Muzuka Gilbert — Your account is pending approval";
  const html = layout(`
    <h2>Welcome, ${esc(user.name)}!</h2>
    <p>Thank you for registering with <strong>[MG] Muzuka Gilbert</strong>.</p>
    <p>Your account is currently <strong>pending review</strong>.
       You will receive a confirmation email as soon as your account is approved.</p>
    <p>We look forward to creating your masterpiece.</p>
  `);

  await sendEmail(user.id, user.email, subject, html);

  if (user.phone) {
    await sendSms(
      user.id,
      user.phone,
      `Hi ${user.name}, welcome to [MG] Muzuka Gilbert! Your account is pending approval — we'll notify you shortly.`
    );
  }
}

/** Sent when the admin approves a client. */
export async function sendApprovalMessage(user: {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
}) {
  const subject = "Your Muzuka Gilbert account has been approved ✓";
  const html = layout(`
    <h2>You're approved, ${esc(user.name)}!</h2>
    <p>Your <strong>[MG] Muzuka Gilbert</strong> account has been approved.
       You can now log in, explore packages, and book your session.</p>
    <p style="margin-top:24px;">
      <a href="${baseUrl()}/login"
         style="background:#FFD700;color:#111;padding:12px 28px;border-radius:6px;font-weight:bold;text-decoration:none;">
        Log In Now
      </a>
    </p>
  `);

  await sendEmail(user.id, user.email, subject, html);

  if (user.phone) {
    await sendSms(
      user.id,
      user.phone,
      `Hi ${user.name}, your [MG] Muzuka Gilbert account is approved! Log in at ${baseUrl()}/login`
    );
  }
}

/** Sent when the admin rejects a client. */
export async function sendRejectionMessage(user: {
  id: string;
  name: string;
  email: string;
}) {
  const subject = "Update on your Muzuka Gilbert account";
  const html = layout(`
    <h2>Hello ${esc(user.name)},</h2>
    <p>After reviewing your registration, we are unable to approve your account at this time.</p>
    <p>If you believe this is an error or would like more information,
       please reply to this email.</p>
  `);

  await sendEmail(user.id, user.email, subject, html);
}

/** Sent when the admin confirms a booking. */
export async function sendBookingConfirmedMessage(data: {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  bookingTitle: string;
  serviceType: string;
  scheduledAt: Date;
  location?: string | null;
  packageName?: string | null;
}) {
  const dateStr = data.scheduledAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = data.scheduledAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const subject = `Your booking is confirmed — ${data.bookingTitle}`;
  const html = layout(`
    <h2>Booking Confirmed!</h2>
    <p>Hi ${esc(data.userName)}, your booking has been confirmed by <strong>[MG] Muzuka Gilbert</strong>.</p>
    <table style="margin:20px 0;border-collapse:collapse;width:100%;">
      <tr><td style="padding:8px 0;color:#888;width:130px;">Event</td><td style="padding:8px 0;font-weight:bold;">${esc(data.bookingTitle)}</td></tr>
      <tr><td style="padding:8px 0;color:#888;">Service</td><td style="padding:8px 0;">${esc(data.serviceType)}</td></tr>
      <tr><td style="padding:8px 0;color:#888;">Date</td><td style="padding:8px 0;">${dateStr}</td></tr>
      <tr><td style="padding:8px 0;color:#888;">Time</td><td style="padding:8px 0;">${timeStr}</td></tr>
      ${data.location ? `<tr><td style="padding:8px 0;color:#888;">Location</td><td style="padding:8px 0;">${esc(data.location)}</td></tr>` : ""}
      ${data.packageName ? `<tr><td style="padding:8px 0;color:#888;">Package</td><td style="padding:8px 0;">${esc(data.packageName)}</td></tr>` : ""}
    </table>
    <p>We're excited to create your masterpiece!</p>
  `);

  await sendEmail(data.userId, data.userEmail, subject, html);

  if (data.userPhone) {
    await sendSms(
      data.userId,
      data.userPhone,
      `[MG] Booking confirmed: ${data.bookingTitle} on ${dateStr} at ${timeStr}${data.location ? ` @ ${data.location}` : ""}. See you there!`
    );
  }
}

/** Sent after a successful Stripe payment. */
export async function sendPaymentReceivedMessage(data: {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  bookingTitle: string;
  amountCents: number;
  currency: string;
}) {
  const amount = (data.amountCents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: data.currency.toUpperCase(),
  });

  const subject = `Payment received — ${data.bookingTitle}`;
  const html = layout(`
    <h2>Payment Received ✓</h2>
    <p>Hi ${esc(data.userName)}, we've received your payment of <strong>${amount}</strong>
       for <strong>${esc(data.bookingTitle)}</strong>.</p>
    <p>Your gallery will be unlocked for full-quality downloads once your session is complete
       and media is ready.</p>
    <p style="margin-top:24px;">
      <a href="${baseUrl()}/client/bookings"
         style="background:#FFD700;color:#111;padding:12px 28px;border-radius:6px;font-weight:bold;text-decoration:none;">
        View My Bookings
      </a>
    </p>
  `);

  await sendEmail(data.userId, data.userEmail, subject, html);

  if (data.userPhone) {
    await sendSms(
      data.userId,
      data.userPhone,
      `[MG] Payment of ${amount} received for ${data.bookingTitle}. Your gallery will be ready after your session. Thank you!`
    );
  }
}

/** Sent when the admin releases media assets in a gallery. */
export async function sendGalleryReadyMessage(data: {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  galleryTitle: string;
  galleryId: string;
  isPaid: boolean;
  mediaCount: number;
}) {
  const galleryUrl = `${baseUrl()}/client/galleries/${data.galleryId}`;

  const subject = data.isPaid
    ? `Your gallery is ready for download — ${data.galleryTitle}`
    : `Your gallery preview is ready — ${data.galleryTitle}`;

  const html = layout(`
    <h2>Your Gallery is Ready! 🎉</h2>
    <p>Hi ${esc(data.userName)}, your <strong>${esc(data.galleryTitle)}</strong> gallery
       is now available with <strong>${data.mediaCount} photo${data.mediaCount !== 1 ? "s" : ""}</strong>.</p>
    ${data.isPaid
      ? `<p>You have <strong>full access</strong> — download your full-quality images and videos below.</p>`
      : `<p>You can <strong>preview your photos</strong> now. Complete your payment to unlock full-quality downloads.</p>`
    }
    <p style="margin-top:24px;">
      <a href="${galleryUrl}"
         style="background:#FFD700;color:#111;padding:12px 28px;border-radius:6px;font-weight:bold;text-decoration:none;">
        View Gallery
      </a>
    </p>
  `);

  await sendEmail(data.userId, data.userEmail, subject, html);

  if (data.userPhone) {
    await sendSms(
      data.userId,
      data.userPhone,
      `[MG] Your gallery "${data.galleryTitle}" is ready! ${data.isPaid ? "Full download access unlocked." : "Preview available — pay to unlock full quality."} ${galleryUrl}`
    );
  }
}

// ── HTML layout wrapper ───────────────────────────────────────────────────────

function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a1a,#2a2a2a);padding:32px 40px;border-radius:12px 12px 0 0;text-align:center;border-bottom:2px solid #FFD700;">
            <p style="margin:0;font-size:22px;font-weight:bold;color:#FFD700;letter-spacing:4px;">[MG]</p>
            <p style="margin:6px 0 0;font-size:13px;color:#888;letter-spacing:2px;text-transform:uppercase;">Muzuka Gilbert</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="background:#1a1a1a;padding:32px 40px;border-radius:0 0 12px 12px;">
            ${content}
            <hr style="border:none;border-top:1px solid #2a2a2a;margin:32px 0 16px;">
            <p style="margin:0;font-size:12px;color:#555;text-align:center;">
              "We don't just take pictures. We create masterpieces that tell your story."<br>
              <span style="color:#333;">© Muzuka Gilbert. All rights reserved.</span>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000"
  );
}
