/**
 * notify.ts — Central notification hub for Muzuka Gilbert
 *
 * Handles ALL outbound notifications:
 *   📧 Email  — via Resend  (RESEND_API_KEY)
 *   📱 SMS    — via Twilio  (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN)
 *   💬 WhatsApp — via Twilio WhatsApp (same creds, whatsapp: prefix)
 *
 * Every channel degrades gracefully when API keys are absent:
 *   - Missing key → logs a warning, stores a Message record with sentAt=null
 *   - Fully operational once keys are added — zero code changes needed
 *
 * Notification types:
 *   1.  welcome           — new client registered
 *   2.  approved          — client account approved
 *   3.  rejected          — client account rejected
 *   4.  bookingConfirmed  — booking confirmed by admin
 *   5.  paymentReceived   — Stripe payment succeeded
 *   6.  galleryReady      — gallery media released
 *   7.  eventReminder     — X days/hours before the event
 *   8.  paymentDue        — payment deadline approaching
 *   9.  depositDue        — deposit not yet paid
 *   10. galleryExpiring   — gallery expiry warning
 *   11. bookingCancelled  — booking cancelled
 *   12. reviewRequest     — ask client to leave a review
 */

import { Resend } from "resend";
import twilio from "twilio";
import { prisma } from "@/lib/db";

// ── Provider factories (safe — return null if not configured) ────────────────

function resendClient(): Resend | null {
  const k = process.env.RESEND_API_KEY;
  return k && !k.startsWith("replace") && k.length > 10 ? new Resend(k) : null;
}

function twilioClient(): ReturnType<typeof twilio> | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  return sid && tok && sid.startsWith("AC") && !tok.startsWith("replace")
    ? twilio(sid, tok)
    : null;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@muzukagilbert.com";
const FROM_SMS   = process.env.TWILIO_PHONE_NUMBER ?? process.env.TWILIO_FROM_NUMBER ?? "";
const BASE_URL   = process.env.NEXT_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://mzuka-gilbert.vercel.app";

// ── Low-level senders ────────────────────────────────────────────────────────

async function sendEmail(userId: string, to: string, subject: string, html: string): Promise<void> {
  const client = resendClient();
  if (!client) {
    console.warn(`[notify] Email not configured — queued for ${to}: "${subject}"`);
    await storeMessage(userId, subject, html, "email", null);
    return;
  }
  try {
    const { error } = await client.emails.send({ from: FROM_EMAIL, to, subject, html });
    await storeMessage(userId, subject, html, "email", error ? null : new Date());
    if (error) console.error(`[notify] Resend error for ${to}:`, error.message);
  } catch (e) {
    console.error(`[notify] Email send failed:`, e);
    await storeMessage(userId, subject, html, "email", null);
  }
}

async function sendSms(userId: string, to: string, body: string): Promise<void> {
  const client = twilioClient();
  if (!client || !FROM_SMS) {
    console.warn(`[notify] SMS not configured — queued for ${to}`);
    await storeMessage(userId, "SMS", body, "sms", null);
    return;
  }
  try {
    await client.messages.create({ from: FROM_SMS, to, body });
    await storeMessage(userId, "SMS", body, "sms", new Date());
  } catch (e) {
    console.error(`[notify] SMS failed for ${to}:`, e);
    await storeMessage(userId, "SMS", body, "sms", null);
  }
}

async function sendWhatsApp(userId: string, to: string, body: string): Promise<void> {
  const client = twilioClient();
  const fromWA = FROM_SMS ? `whatsapp:${FROM_SMS}` : "";
  if (!client || !fromWA) {
    console.warn(`[notify] WhatsApp not configured — queued for ${to}`);
    await storeMessage(userId, "WhatsApp", body, "whatsapp", null);
    return;
  }
  try {
    await client.messages.create({ from: fromWA, to: `whatsapp:${to}`, body });
    await storeMessage(userId, "WhatsApp", body, "whatsapp", new Date());
  } catch (e) {
    console.error(`[notify] WhatsApp failed for ${to}:`, e);
    await storeMessage(userId, "WhatsApp", body, "whatsapp", null);
  }
}

async function storeMessage(
  userId: string,
  subject: string,
  body: string,
  channel: string,
  sentAt: Date | null,
): Promise<void> {
  try {
    await prisma.message.create({ data: { userId, subject, body, channel, sentAt } });
  } catch { /* non-critical */ }
}

// ── Shared recipient helper ──────────────────────────────────────────────────

interface Recipient {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  /** Raw phone number from booking form (alternatePhone field) */
  bookingPhone?: string | null;
}

/**
 * Pick the best phone number: booking form phone → profile phone
 */
function bestPhone(r: Recipient): string | null {
  return r.bookingPhone ?? r.phone ?? null;
}

/**
 * Send to all available channels for a recipient.
 * Email is always attempted. SMS + WhatsApp only if a phone is available.
 */
async function notifyAll(
  recipient: Recipient,
  subject: string,
  html: string,
  smsBody: string,
  opts: { whatsApp?: boolean } = {},
): Promise<void> {
  const phone = bestPhone(recipient);
  await sendEmail(recipient.id, recipient.email, subject, html);
  if (phone) {
    await sendSms(recipient.id, phone, smsBody);
    if (opts.whatsApp) {
      await sendWhatsApp(recipient.id, phone, smsBody);
    }
  }
}

// ── 1. Welcome ────────────────────────────────────────────────────────────────

export async function notifyWelcome(r: Recipient): Promise<void> {
  const subject = "Welcome to Muzuka Gilbert — Your account is pending approval";
  const html = emailLayout(`
    <h2>Welcome, ${esc(r.name)}! 👋</h2>
    <p>Thank you for registering with <strong>Muzuka Gilbert</strong> — your luxury photography & videography studio.</p>
    <p>Your account is currently <strong>pending review</strong>. We typically approve within <strong>24 hours</strong>.</p>
    <p>You will receive another notification the moment your account is approved.</p>
    <p style="margin-top:24px;font-style:italic;color:#888;">"We don't just take pictures. We create masterpieces."</p>
  `);
  const sms = `Hi ${r.name}, welcome to Muzuka Gilbert! Your account is pending approval — you'll be notified within 24 hours. 📸`;
  await notifyAll(r, subject, html, sms);
}

// ── 2. Account approved ──────────────────────────────────────────────────────

export async function notifyApproved(r: Recipient): Promise<void> {
  const subject = "✅ Your Muzuka Gilbert account has been approved";
  const html = emailLayout(`
    <h2>You're approved, ${esc(r.name)}! 🎉</h2>
    <p>Your <strong>Muzuka Gilbert</strong> account is now active.</p>
    <p>You can now log in, explore our packages, and book your session.</p>
    ${ctaBtn("Log In & Book Now", `${BASE_URL}/login`)}
  `);
  const sms = `Hi ${r.name}, your Muzuka Gilbert account is approved! Log in and book: ${BASE_URL}/login 🎉`;
  await notifyAll(r, subject, html, sms, { whatsApp: true });
}

// ── 3. Account rejected ──────────────────────────────────────────────────────

export async function notifyRejected(r: Recipient): Promise<void> {
  const subject = "Update on your Muzuka Gilbert account";
  const html = emailLayout(`
    <h2>Hello ${esc(r.name)},</h2>
    <p>After reviewing your registration, we are unable to approve your account at this time.</p>
    <p>If you believe this is an error or have questions, please reply to this email and our team will assist you.</p>
  `);
  await sendEmail(r.id, r.email, subject, html);
}

// ── 4. Booking confirmed ─────────────────────────────────────────────────────

export interface BookingDetails {
  title: string;
  serviceType: string;
  scheduledAt: Date;
  location?: string | null;
  packageName?: string | null;
  bookingId: string;
}

export async function notifyBookingConfirmed(r: Recipient, b: BookingDetails): Promise<void> {
  const dateStr = fmtDate(b.scheduledAt);
  const timeStr = fmtTime(b.scheduledAt);
  const subject = `📅 Booking confirmed — ${b.title}`;
  const html = emailLayout(`
    <h2>Booking Confirmed! 🎉</h2>
    <p>Hi ${esc(r.name)}, your booking has been confirmed by <strong>Muzuka Gilbert</strong>.</p>
    ${detailTable([
      ["Event",    b.title],
      ["Service",  b.serviceType],
      ["Date",     dateStr],
      ["Time",     timeStr],
      ...(b.location   ? [["Location", b.location]]    : []),
      ...(b.packageName ? [["Package", b.packageName]] : []),
    ] as [string,string][])}
    <p>We're excited to create your masterpiece! 📸</p>
    ${ctaBtn("View My Booking", `${BASE_URL}/client/bookings/${b.bookingId}`)}
  `);
  const sms = `[MG] Booking confirmed: ${b.title} on ${dateStr} at ${timeStr}${b.location ? ` @ ${b.location}` : ""}. See you soon! 📸`;
  await notifyAll(r, subject, html, sms, { whatsApp: true });
}

// ── 5. Payment received ──────────────────────────────────────────────────────

export async function notifyPaymentReceived(
  r: Recipient,
  b: { title: string; bookingId: string },
  amountCents: number,
  currency: string,
): Promise<void> {
  const amount = fmtCurrency(amountCents, currency);
  const subject = `✅ Payment received — ${b.title}`;
  const html = emailLayout(`
    <h2>Payment Received ✓</h2>
    <p>Hi ${esc(r.name)}, we've received your payment of <strong>${amount}</strong> for <strong>${esc(b.title)}</strong>.</p>
    <p>Your gallery will be unlocked for full-quality downloads once your session is complete and media is processed.</p>
    ${ctaBtn("View My Bookings", `${BASE_URL}/client/bookings`)}
  `);
  const sms = `[MG] Payment of ${amount} confirmed for ${b.title}. Your gallery will be ready after your session. Thank you! 🙏`;
  await notifyAll(r, subject, html, sms);
}

// ── 6. Gallery ready ─────────────────────────────────────────────────────────

export async function notifyGalleryReady(
  r: Recipient,
  g: { title: string; galleryId: string; mediaCount: number; isPaid: boolean },
): Promise<void> {
  const galleryUrl = `${BASE_URL}/client/galleries/${g.galleryId}`;
  const subject = g.isPaid
    ? `🖼️ Your gallery is ready for download — ${g.title}`
    : `👀 Your gallery preview is ready — ${g.title}`;
  const html = emailLayout(`
    <h2>Your Gallery is Ready! 🎉</h2>
    <p>Hi ${esc(r.name)}, your <strong>${esc(g.title)}</strong> gallery is now available with <strong>${g.mediaCount} media file${g.mediaCount !== 1 ? "s" : ""}</strong>.</p>
    ${g.isPaid
      ? `<p>You have <strong>full download access</strong> — download your full-quality images and videos now.</p>`
      : `<p>Preview your photos now. <strong>Complete payment to unlock full-quality 6K/8K downloads.</strong></p>`
    }
    ${ctaBtn("View Gallery", galleryUrl)}
  `);
  const sms = `[MG] Your gallery "${g.title}" is ready! ${g.isPaid ? "Full download unlocked 🎬" : "Preview now — pay to unlock full quality"}: ${galleryUrl}`;
  await notifyAll(r, subject, html, sms, { whatsApp: true });
}

// ── 7. Event reminder ────────────────────────────────────────────────────────

export async function notifyEventReminder(
  r: Recipient,
  b: BookingDetails,
  daysAway: number,
): Promise<void> {
  const when = daysAway === 0 ? "TODAY" : daysAway === 1 ? "tomorrow" : `in ${daysAway} days`;
  const subject = `⏰ Reminder: ${b.title} is ${when}`;
  const html = emailLayout(`
    <h2>Your session is ${when}! 📸</h2>
    <p>Hi ${esc(r.name)}, just a friendly reminder about your upcoming session.</p>
    ${detailTable([
      ["Event",   b.title],
      ["Service", b.serviceType],
      ["Date",    fmtDate(b.scheduledAt)],
      ["Time",    fmtTime(b.scheduledAt)],
      ...(b.location ? [["Location", b.location]] as [string,string][] : []),
    ])}
    <p>If you have any last-minute questions, don't hesitate to reach out. We look forward to seeing you!</p>
    ${ctaBtn("View Booking", `${BASE_URL}/client/bookings/${b.bookingId}`)}
  `);
  const sms = `[MG] Reminder: "${b.title}" is ${when} — ${fmtDate(b.scheduledAt)} at ${fmtTime(b.scheduledAt)}${b.location ? ` @ ${b.location}` : ""}. See you soon! 📸`;
  await notifyAll(r, subject, html, sms, { whatsApp: true });
}

// ── 8. Payment due reminder ──────────────────────────────────────────────────

export async function notifyPaymentDue(
  r: Recipient,
  b: { title: string; bookingId: string; dueDate: Date; amountCents: number; currency: string },
): Promise<void> {
  const amount  = fmtCurrency(b.amountCents, b.currency);
  const dueStr  = fmtDate(b.dueDate);
  const subject = `💳 Payment reminder — ${b.title} (due ${dueStr})`;
  const html = emailLayout(`
    <h2>Payment Due Soon 💳</h2>
    <p>Hi ${esc(r.name)}, your payment of <strong>${amount}</strong> for <strong>${esc(b.title)}</strong> is due on <strong>${dueStr}</strong>.</p>
    <p>Please complete your payment to keep your booking confirmed and unlock your full gallery when ready.</p>
    ${ctaBtn("Complete Payment", `${BASE_URL}/client/bookings/${b.bookingId}`)}
  `);
  const sms = `[MG] Payment reminder: ${amount} due ${dueStr} for "${b.title}". Pay now: ${BASE_URL}/client/bookings/${b.bookingId}`;
  await notifyAll(r, subject, html, sms, { whatsApp: true });
}

// ── 9. Deposit due ───────────────────────────────────────────────────────────

export async function notifyDepositDue(
  r: Recipient,
  b: { title: string; bookingId: string; depositCents: number; currency: string; scheduledAt: Date },
): Promise<void> {
  const amount  = fmtCurrency(b.depositCents, b.currency);
  const subject = `📌 Deposit required to confirm — ${b.title}`;
  const html = emailLayout(`
    <h2>Secure Your Booking 📌</h2>
    <p>Hi ${esc(r.name)}, a deposit of <strong>${amount}</strong> is required to fully confirm your booking <strong>${esc(b.title)}</strong> on <strong>${fmtDate(b.scheduledAt)}</strong>.</p>
    <p>Without the deposit, your slot may be released to another client.</p>
    ${ctaBtn("Pay Deposit Now", `${BASE_URL}/client/bookings/${b.bookingId}`)}
  `);
  const sms = `[MG] Deposit of ${amount} required to confirm "${b.title}" on ${fmtDate(b.scheduledAt)}. Pay: ${BASE_URL}/client/bookings/${b.bookingId}`;
  await notifyAll(r, subject, html, sms, { whatsApp: true });
}

// ── 10. Gallery expiring ─────────────────────────────────────────────────────

export async function notifyGalleryExpiring(
  r: Recipient,
  g: { title: string; galleryId: string; expiresAt: Date; daysLeft: number },
): Promise<void> {
  const galleryUrl = `${BASE_URL}/client/galleries/${g.galleryId}`;
  const subject    = `⚠️ Your gallery expires in ${g.daysLeft} day${g.daysLeft !== 1 ? "s" : ""} — ${g.title}`;
  const html = emailLayout(`
    <h2>Gallery Expiring Soon ⚠️</h2>
    <p>Hi ${esc(r.name)}, your gallery <strong>${esc(g.title)}</strong> will expire on <strong>${fmtDate(g.expiresAt)}</strong> (in ${g.daysLeft} day${g.daysLeft !== 1 ? "s" : ""}).</p>
    <p>Please download all your photos and videos before then. Contact us if you need an extension.</p>
    ${ctaBtn("Download Now", galleryUrl)}
  `);
  const sms = `[MG] Your gallery "${g.title}" expires in ${g.daysLeft} day${g.daysLeft !== 1 ? "s" : ""}! Download now: ${galleryUrl}`;
  await notifyAll(r, subject, html, sms, { whatsApp: true });
}

// ── 11. Booking cancelled ────────────────────────────────────────────────────

export async function notifyBookingCancelled(
  r: Recipient,
  b: { title: string; scheduledAt: Date; reason?: string },
): Promise<void> {
  const subject = `Booking cancelled — ${b.title}`;
  const html = emailLayout(`
    <h2>Booking Cancelled</h2>
    <p>Hi ${esc(r.name)}, your booking <strong>${esc(b.title)}</strong> scheduled for <strong>${fmtDate(b.scheduledAt)}</strong> has been cancelled.</p>
    ${b.reason ? `<p><strong>Reason:</strong> ${esc(b.reason)}</p>` : ""}
    <p>If you have questions or would like to reschedule, please contact us or book a new session.</p>
    ${ctaBtn("Book a New Session", `${BASE_URL}/client/bookings/new`)}
  `);
  const sms = `[MG] Your booking "${b.title}" on ${fmtDate(b.scheduledAt)} has been cancelled. ${b.reason ? `Reason: ${b.reason}. ` : ""}Book again: ${BASE_URL}/client/bookings/new`;
  await notifyAll(r, subject, html, sms);
}

// ── 12. Review request ───────────────────────────────────────────────────────

export async function notifyReviewRequest(
  r: Recipient,
  b: { title: string },
): Promise<void> {
  const subject = `How was your experience? — ${b.title}`;
  const html = emailLayout(`
    <h2>We'd love your feedback! ⭐</h2>
    <p>Hi ${esc(r.name)}, we hope you loved the work we created for <strong>${esc(b.title)}</strong>!</p>
    <p>Your feedback means the world to us and helps future clients choose Muzuka Gilbert with confidence.</p>
    <p>Would you mind leaving a quick review? It only takes 30 seconds.</p>
    ${ctaBtn("Leave a Review", `${BASE_URL}/client`)}
    <p style="margin-top:20px;font-size:13px;color:#888;">"We don't just take pictures. We create masterpieces."</p>
  `);
  const sms = `[MG] Hi ${r.name}, how was your experience with "${b.title}"? We'd love your review: ${BASE_URL}/client ⭐`;
  await notifyAll(r, subject, html, sms);
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function emailLayout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body { margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e0e0e0; }
  a { color:#d4af37; }
</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1c1a14,#26220f);padding:28px 36px;border-radius:12px 12px 0 0;text-align:center;border-bottom:2px solid #d4af37;">
          <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#888;">MUZUKA GILBERT</p>
          <p style="margin:6px 0 0;font-size:20px;font-weight:700;color:#d4af37;letter-spacing:1px;">Luxury Photography &amp; Videography</p>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="background:#111;padding:32px 36px;border-radius:0 0 12px 12px;">
          ${content}
          <hr style="border:none;border-top:1px solid #222;margin:32px 0 20px;">
          <p style="margin:0;font-size:11px;color:#444;text-align:center;line-height:1.6;">
            "We don't just take pictures. We create masterpieces."<br>
            © ${new Date().getFullYear()} Muzuka Gilbert · All rights reserved
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function detailTable(rows: [string, string][]): string {
  const cells = rows.map(([label, value]) =>
    `<tr>
      <td style="padding:7px 0;color:#888;font-size:13px;width:130px;vertical-align:top;">${esc(label)}</td>
      <td style="padding:7px 0;font-size:13px;font-weight:600;color:#e0e0e0;">${esc(value)}</td>
    </tr>`
  ).join("");
  return `<table style="margin:20px 0;border-collapse:collapse;width:100%;">${cells}</table>`;
}

function ctaBtn(label: string, href: string): string {
  return `<p style="margin-top:24px;">
    <a href="${href}" style="display:inline-block;background:#d4af37;color:#0a0a0a;padding:13px 30px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;letter-spacing:0.5px;">
      ${label} →
    </a>
  </p>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function fmtCurrency(cents: number, currency: string): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: currency.toUpperCase() });
}
