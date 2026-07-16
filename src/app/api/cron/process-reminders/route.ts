/**
 * /api/cron/process-reminders
 *
 * Central notification cron job — runs every hour via Vercel Cron.
 * Handles ALL scheduled notification types:
 *
 *   1. BookingReminder table entries (legacy event reminders)
 *   2. Event day reminders    — 7d, 3d, 1d, morning-of
 *   3. Payment due reminders  — 3d before due date
 *   4. Deposit due reminders  — booking unpaid, event > 7 days away
 *   5. Gallery expiry alerts  — 7d and 3d before expiry
 *   6. Post-event review      — 2 days after event completed
 *
 * Auth: Bearer token matching CRON_SECRET env var.
 * Configure in vercel.json:
 *   { "crons": [{ "path": "/api/cron/process-reminders", "schedule": "0 * * * *" }] }
 *
 * Manual test:
 *   curl -X POST https://mzuka-gilbert.vercel.app/api/cron/process-reminders \
 *     -H "Authorization: Bearer YOUR_CRON_SECRET"
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  notifyEventReminder,
  notifyPaymentDue,
  notifyDepositDue,
  notifyGalleryExpiring,
  notifyReviewRequest,
} from "@/lib/notify";
import { getPendingReminders, cleanupOldReminders } from "@/lib/reminders";
import { sendReminderAction } from "@/app/admin/reminders/actions";

// ── Auth helper ──────────────────────────────────────────────────────────────

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? req.headers.get("x-cron-secret");
  return auth === `Bearer ${secret}`;
}

// ── Window helpers ────────────────────────────────────────────────────────────

/** Returns a date N days from now (start of that day, midnight) */
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns a date N days from now (end of that day, 23:59:59) */
function endOfDayFromNow(n: number): Date {
  const d = daysFromNow(n);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ── Result tracker ────────────────────────────────────────────────────────────

const tally = { processed: 0, skipped: 0, errors: 0, details: [] as string[] };
function ok(msg: string)  { tally.processed++; tally.details.push(`✓ ${msg}`); }
function skip(msg: string){ tally.skipped++;   tally.details.push(`· ${msg}`); }
function err(msg: string) { tally.errors++;    tally.details.push(`✗ ${msg}`); }

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  try {

    // ── 1. Legacy BookingReminder table ──────────────────────────────────────
    const legacy = await getPendingReminders();
    const legacyResults = await Promise.allSettled(
      legacy.map((r) => sendReminderAction(r.id))
    );
    legacyResults.forEach((r, i) => {
      if (r.status === "fulfilled") ok(`legacy reminder ${legacy[i].id}`);
      else err(`legacy reminder ${legacy[i].id}: ${r.reason}`);
    });

    // ── 2. Event day reminders (7d / 3d / 1d / day-of) ──────────────────────
    // We check for bookings whose scheduledAt falls in each window
    // and haven't had a reminder sent recently for that window.
    const EVENT_WINDOWS = [7, 3, 1, 0]; // days before event

    for (const daysAway of EVENT_WINDOWS) {
      const windowStart = daysFromNow(daysAway);
      const windowEnd   = endOfDayFromNow(daysAway);

      const bookings = await prisma.booking.findMany({
        where: {
          scheduledAt: { gte: windowStart, lte: windowEnd },
          status: { notIn: ["CANCELLED"] },
        },
        include: {
          client: true,
          package: true,
          // Check if an event reminder was sent in last 20 hours for this window
          reminders: {
            where: {
              channel: { in: ["email", "sms"] },
              sentAt: { gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) },
            },
          },
        },
      });

      for (const booking of bookings) {
        if (booking.reminders.length > 0) {
          skip(`event-${daysAway}d reminder for booking ${booking.id} (already sent recently)`);
          continue;
        }
        try {
          const r = {
            id: booking.clientId,
            name: booking.client.name,
            email: booking.client.email,
            phone: booking.client.phone,
            bookingPhone: booking.alternatePhone,
          };
          await notifyEventReminder(r, {
            title: booking.title,
            serviceType: booking.serviceType,
            scheduledAt: booking.scheduledAt,
            location: booking.location,
            packageName: booking.package?.name,
            bookingId: booking.id,
          }, daysAway);
          // Mark a reminder as sent
          await prisma.bookingReminder.create({
            data: {
              bookingId: booking.id,
              channel: "email",
              scheduledAt: now,
              sentAt: now,
            },
          });
          ok(`event-${daysAway}d reminder → ${booking.client.email}`);
        } catch (e) {
          err(`event-${daysAway}d reminder for ${booking.id}: ${e}`);
        }
      }
    }

    // ── 3. Payment due reminders (unpaid bookings with event in 3 days) ──────
    const payDue3d = await prisma.booking.findMany({
      where: {
        scheduledAt: { gte: daysFromNow(2), lte: endOfDayFromNow(4) },
        paymentStatus: { in: ["UNPAID", "DEPOSIT_PAID"] },
        status: { notIn: ["CANCELLED"] },
        quoteTotalCents: { gt: 0 },
      },
      include: { client: true },
    });

    for (const booking of payDue3d) {
      try {
        await notifyPaymentDue(
          {
            id: booking.clientId,
            name: booking.client.name,
            email: booking.client.email,
            phone: booking.client.phone,
            bookingPhone: booking.alternatePhone,
          },
          {
            title: booking.title,
            bookingId: booking.id,
            dueDate: booking.scheduledAt,
            amountCents: booking.quoteTotalCents,
            currency: "USD",
          }
        );
        ok(`payment-due reminder → ${booking.client.email}`);
      } catch (e) {
        err(`payment-due for ${booking.id}: ${e}`);
      }
    }

    // ── 4. Deposit due reminders (UNPAID, event > 7 days, no deposit yet) ───
    const depositDue = await prisma.booking.findMany({
      where: {
        scheduledAt: { gte: endOfDayFromNow(7) },
        paymentStatus: "UNPAID",
        status: { notIn: ["CANCELLED"] },
        quoteTotalCents: { gt: 0 },
        // Only bookings created more than 24h ago (give client time to pay)
        createdAt: { lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
      include: { client: true },
      take: 20,
    });

    for (const booking of depositDue) {
      // Only send once — check no deposit reminder in last 48h
      const recentDepositReminder = await prisma.message.findFirst({
        where: {
          userId: booking.clientId,
          subject: { contains: "Deposit" },
          createdAt: { gte: new Date(now.getTime() - 48 * 60 * 60 * 1000) },
        },
      });
      if (recentDepositReminder) { skip(`deposit reminder for ${booking.id} (sent recently)`); continue; }

      try {
        const depositCents = Math.round(booking.quoteTotalCents * (booking.depositPercent / 100));
        await notifyDepositDue(
          {
            id: booking.clientId,
            name: booking.client.name,
            email: booking.client.email,
            phone: booking.client.phone,
            bookingPhone: booking.alternatePhone,
          },
          {
            title: booking.title,
            bookingId: booking.id,
            depositCents,
            currency: "USD",
            scheduledAt: booking.scheduledAt,
          }
        );
        ok(`deposit-due reminder → ${booking.client.email}`);
      } catch (e) {
        err(`deposit-due for ${booking.id}: ${e}`);
      }
    }

    // ── 5. Gallery expiry alerts (7d and 3d before) ──────────────────────────
    const EXPIRY_WINDOWS = [7, 3];
    for (const daysLeft of EXPIRY_WINDOWS) {
      const galleries = await prisma.gallery.findMany({
        where: {
          expiresAt: {
            gte: daysFromNow(daysLeft),
            lte: endOfDayFromNow(daysLeft),
          },
        },
        include: {
          booking: { include: { client: true } },
          mediaAssets: { select: { id: true } },
        },
      });

      for (const gallery of galleries) {
        // Check if we notified in last 20h
        const recent = await prisma.message.findFirst({
          where: {
            userId: gallery.booking.clientId,
            subject: { contains: "expires" },
            createdAt: { gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) },
          },
        });
        if (recent) { skip(`gallery expiry ${daysLeft}d for ${gallery.id}`); continue; }

        try {
          await notifyGalleryExpiring(
            {
              id: gallery.booking.clientId,
              name: gallery.booking.client.name,
              email: gallery.booking.client.email,
              phone: gallery.booking.client.phone,
            },
            {
              title: gallery.title,
              galleryId: gallery.id,
              expiresAt: gallery.expiresAt!,
              daysLeft,
            }
          );
          ok(`gallery-expiry-${daysLeft}d → ${gallery.booking.client.email}`);
        } catch (e) {
          err(`gallery-expiry for ${gallery.id}: ${e}`);
        }
      }
    }

    // ── 6. Post-event review requests (2 days after COMPLETED bookings) ──────
    const reviewWindow = {
      gte: daysFromNow(-3), // 3 days ago
      lte: endOfDayFromNow(-2), // 2 days ago
    };

    const completedBookings = await prisma.booking.findMany({
      where: {
        status: "COMPLETED",
        scheduledAt: reviewWindow,
      },
      include: { client: true },
    });

    for (const booking of completedBookings) {
      const alreadySent = await prisma.message.findFirst({
        where: {
          userId: booking.clientId,
          subject: { contains: "feedback" },
          createdAt: { gte: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000) },
        },
      });
      if (alreadySent) { skip(`review request for ${booking.id}`); continue; }

      try {
        await notifyReviewRequest(
          {
            id: booking.clientId,
            name: booking.client.name,
            email: booking.client.email,
            phone: booking.client.phone,
          },
          { title: booking.title }
        );
        ok(`review-request → ${booking.client.email}`);
      } catch (e) {
        err(`review-request for ${booking.id}: ${e}`);
      }
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────
    await cleanupOldReminders();

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      summary: {
        processed: tally.processed,
        skipped:   tally.skipped,
        errors:    tally.errors,
      },
      details: tally.details,
    });

  } catch (error) {
    console.error("[cron] Fatal error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// ── GET — health check ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const now = new Date();
  const [pendingCount, upcomingEvents, unpaidBookings, expiringGalleries] = await Promise.all([
    prisma.bookingReminder.count({ where: { sentAt: null, scheduledAt: { lte: now } } }),
    prisma.booking.count({ where: { scheduledAt: { gte: now, lte: endOfDayFromNow(7) }, status: { notIn: ["CANCELLED"] } } }),
    prisma.booking.count({ where: { paymentStatus: { in: ["UNPAID", "DEPOSIT_PAID"] }, status: { notIn: ["CANCELLED"] }, scheduledAt: { gte: now } } }),
    prisma.gallery.count({ where: { expiresAt: { gte: now, lte: endOfDayFromNow(7) } } }),
  ]);
  return NextResponse.json({
    status: "ok",
    timestamp: now.toISOString(),
    queue: { pendingReminders: pendingCount, upcomingEvents, unpaidBookings, expiringGalleries },
    channels: {
      email:    !!process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("replace"),
      sms:      !!process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith("AC"),
      whatsapp: !!process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith("AC"),
    },
  });
}
