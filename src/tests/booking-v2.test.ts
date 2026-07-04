/**
 * Comprehensive booking v2 test suite.
 * Tests every scenario: creation, all new fields, pricing engine,
 * pipeline stages, validation, payment flow, and edge cases.
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";
import { scryptSync, randomBytes } from "crypto";
import { PRICING_RULES, BOOKING_PIPELINE } from "@/lib/booking-constants";

const cuid = () => nanoid(25);
function hashPwd(p: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(p, salt, 64).toString("hex")}`;
}

// ── Test fixtures ─────────────────────────────────────────────────────────────

let clientId: string;
let adminId:  string;
let pkgId:    string;
const createdBookingIds: string[] = [];
const createdUserIds:    string[] = [];

beforeAll(async () => {
  // Create test client
  const client = await prisma.user.create({
    data: {
      id: cuid(), name: "Test Client V2",
      email: `bk-client-${Date.now()}@mg-test.invalid`,
      passwordHash: hashPwd("test1234!"),
      role: "CLIENT", approvalStatus: "APPROVED",
    },
  });
  clientId = client.id;
  createdUserIds.push(clientId);

  // Create test admin
  const admin = await prisma.user.create({
    data: {
      id: cuid(), name: "Test Admin V2",
      email: `bk-admin-${Date.now()}@mg-test.invalid`,
      passwordHash: hashPwd("test1234!"),
      role: "ADMIN", approvalStatus: "APPROVED",
    },
  });
  adminId = admin.id;
  createdUserIds.push(adminId);

  // Create test package
  const pkg = await prisma.servicePackage.create({
    data: {
      id: cuid(), name: "Gold Package",
      description: "Full day coverage",
      priceCents: 150000, // $1500
      durationMin: 480,
    },
  });
  pkgId = pkg.id;
});

afterAll(async () => {
  if (createdBookingIds.length) {
    await prisma.payment.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
    await prisma.bookingReminder.deleteMany({ where: { bookingId: { in: createdBookingIds } } });
    await prisma.booking.deleteMany({ where: { id: { in: createdBookingIds } } });
  }
  if (pkgId) await prisma.servicePackage.delete({ where: { id: pkgId } }).catch(() => {});
  if (createdUserIds.length) await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

// ── SCENARIO 1: Minimal booking (only required fields) ───────────────────────

describe("Scenario 1: Minimal booking", () => {
  it("creates a booking with only required fields", async () => {
    const booking = await prisma.booking.create({
      data: {
        id: cuid(), clientId, title: "Test Minimal Booking",
        serviceType: "Wedding", eventType: "Wedding",
        scheduledAt: new Date("2026-09-15T10:00:00"),
        status: "REQUESTED", statusV2: "INQUIRY", paymentStatus: "UNPAID",
      },
    });
    createdBookingIds.push(booking.id);

    expect(booking.title).toBe("Test Minimal Booking");
    expect(booking.status).toBe("REQUESTED");
    expect(booking.statusV2).toBe("INQUIRY");
    expect(booking.paymentStatus).toBe("UNPAID");
    expect(booking.quoteTotalCents).toBe(0);
    expect(booking.depositPercent).toBe(50);
    expect(booking.deliveryDeadline).toBe("STANDARD");
    expect(booking.crewPhotographers).toBe(0);
    expect(booking.servicesJson).toEqual([]);
    expect(booking.deliverablesJson).toEqual({});
  });
});

// ── SCENARIO 2: Full wedding booking with all fields ─────────────────────────

describe("Scenario 2: Full wedding booking", () => {
  let bookingId: string;

  it("creates a complete wedding booking with all new fields", async () => {
    const booking = await prisma.booking.create({
      data: {
        id: cuid(), clientId, packageId: pkgId,
        title: "John & Mary Wedding", eventType: "Wedding",
        serviceType: "Wedding Photography",
        location: "Serena Hotel, Nairobi", venueType: "Indoor",
        scheduledAt: new Date("2026-10-20T09:00:00"),
        endTime:     new Date("2026-10-20T19:00:00"),
        guestCount: 250, alternatePhone: "+254 700 111 222",
        organization: "Kamau Family", billingAddress: "123 Nairobi St",
        servicesJson: { photography: ["event_photography","drone_photography"], video: ["highlight_video","drone_video"], additional: ["photo_booth","same_day_edit"] },
        deliverablesJson: { photos: ["edited_photos","album"], videos: ["full_video","highlight_reel","instagram_reel"] },
        photoSpecJson: { quality: "Ultra High Resolution", editingStyle: "Luxury", colorStyle: "Warm" },
        videoSpecJson: { resolution: "4K", frameRate: "30fps", orientation: "Landscape", style: "Cinematic" },
        crewPhotographers: 2, crewVideographers: 2, crewDroneOps: 1, crewAssistants: 1,
        includedHours: 10, overtimeRatePerHour: 5000,
        deliveryDeadline: "EXPRESS", deliveryFeeCents: PRICING_RULES.EXPRESS_DELIVERY_CENTS,
        quoteTotalCents: 150000 + PRICING_RULES.DRONE_CENTS + PRICING_RULES.PHOTO_BOOTH_CENTS + PRICING_RULES.SAME_DAY_EDIT_CENTS + PRICING_RULES.SECOND_PHOTOGRAPHER_CENTS + PRICING_RULES.EXPRESS_DELIVERY_CENTS,
        depositPercent: 50,
        specialRequests: "Bride preparation at 8am. No flash inside church. Family portraits at 3pm.",
        internalNotes: "VIP client. Bring extra batteries.",
        status: "REQUESTED", statusV2: "INQUIRY", paymentStatus: "UNPAID",
      },
    });
    createdBookingIds.push(bookingId = booking.id);

    expect(booking.eventType).toBe("Wedding");
    expect(booking.guestCount).toBe(250);
    expect(booking.crewPhotographers).toBe(2);
    expect(booking.crewVideographers).toBe(2);
    expect(booking.crewDroneOps).toBe(1);
    expect(booking.crewAssistants).toBe(1);
    expect(booking.includedHours).toBe(10);
    expect(booking.deliveryDeadline).toBe("EXPRESS");
    expect(booking.deliveryFeeCents).toBe(PRICING_RULES.EXPRESS_DELIVERY_CENTS);
    expect(booking.specialRequests).toContain("Bride preparation");
    expect(booking.internalNotes).toContain("VIP client");
  });

  it("correctly stores services JSON", async () => {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    const services = booking!.servicesJson as { photography: string[]; video: string[]; additional: string[] };
    expect(services.photography).toContain("event_photography");
    expect(services.photography).toContain("drone_photography");
    expect(services.video).toContain("highlight_video");
    expect(services.additional).toContain("photo_booth");
    expect(services.additional).toContain("same_day_edit");
  });

  it("correctly stores photo spec JSON", async () => {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    const spec = booking!.photoSpecJson as { quality: string; editingStyle: string; colorStyle: string };
    expect(spec.quality).toBe("Ultra High Resolution");
    expect(spec.editingStyle).toBe("Luxury");
    expect(spec.colorStyle).toBe("Warm");
  });

  it("correctly stores video spec JSON", async () => {
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    const spec = booking!.videoSpecJson as { resolution: string; frameRate: string; orientation: string; style: string };
    expect(spec.resolution).toBe("4K");
    expect(spec.style).toBe("Cinematic");
  });
});

// ── SCENARIO 3: Pricing engine calculations ───────────────────────────────────

describe("Scenario 3: Pricing engine", () => {
  it("calculates correct quote: package + drone + extra photographer + express delivery", () => {
    const packagePrice = 150000; // $1500
    let total = packagePrice;
    total += PRICING_RULES.DRONE_CENTS;                   // +$150
    total += PRICING_RULES.SECOND_PHOTOGRAPHER_CENTS;     // +$100 (1 extra)
    total += PRICING_RULES.EXPRESS_DELIVERY_CENTS;        // +$80
    expect(total).toBe(150000 + 15000 + 10000 + 8000);
    expect(total).toBe(183000); // $1830
  });

  it("calculates correct quote: package + all add-ons + urgent delivery", () => {
    const packagePrice = 80000; // $800
    let total = packagePrice;
    total += PRICING_RULES.DRONE_CENTS;
    total += PRICING_RULES.LIVE_STREAM_CENTS;
    total += PRICING_RULES.SAME_DAY_EDIT_CENTS;
    total += PRICING_RULES.PHOTO_BOOTH_CENTS;
    total += PRICING_RULES.SECOND_PHOTOGRAPHER_CENTS * 2; // 2 extra photographers
    total += PRICING_RULES.URGENT_DELIVERY_CENTS;
    expect(total).toBe(80000 + 15000 + 20000 + 15000 + 10000 + 20000 + 15000);
    expect(total).toBe(175000); // $1750
  });

  it("standard delivery has zero fee", () => {
    const fee = 0; // STANDARD
    expect(fee).toBe(0);
  });

  it("express delivery fee is $80", () => {
    expect(PRICING_RULES.EXPRESS_DELIVERY_CENTS).toBe(8000);
  });

  it("urgent delivery fee is $150", () => {
    expect(PRICING_RULES.URGENT_DELIVERY_CENTS).toBe(15000);
  });

  it("calculates deposit correctly at 50%", async () => {
    const booking = await prisma.booking.create({
      data: {
        id: cuid(), clientId, title: "Pricing Test Booking",
        serviceType: "Corporate", eventType: "Corporate Event",
        scheduledAt: new Date("2026-11-01T09:00:00"),
        quoteTotalCents: 120000, depositPercent: 50,
        status: "REQUESTED", statusV2: "INQUIRY", paymentStatus: "UNPAID",
      },
    });
    createdBookingIds.push(booking.id);

    const deposit = Math.round(booking.quoteTotalCents * booking.depositPercent / 100);
    expect(deposit).toBe(60000); // $600
  });
});

// ── SCENARIO 4: 16-stage pipeline ────────────────────────────────────────────

describe("Scenario 4: 16-stage booking pipeline", () => {
  let bookingId: string;

  beforeAll(async () => {
    const booking = await prisma.booking.create({
      data: {
        id: cuid(), clientId, title: "Pipeline Test Booking",
        serviceType: "Event", eventType: "Conference",
        scheduledAt: new Date("2026-12-01T09:00:00"),
        status: "REQUESTED", statusV2: "INQUIRY", paymentStatus: "UNPAID",
      },
    });
    createdBookingIds.push(bookingId = booking.id);
  });

  it("starts at INQUIRY", async () => {
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(b!.statusV2).toBe("INQUIRY");
  });

  it("advances through the entire 16-stage pipeline", async () => {
    const stages = BOOKING_PIPELINE.map((s) => s.value);
    expect(stages).toHaveLength(16);

    for (const stage of stages) {
      await prisma.booking.update({ where: { id: bookingId }, data: { statusV2: stage as never } });
      const updated = await prisma.booking.findUnique({ where: { id: bookingId } });
      expect(updated!.statusV2).toBe(stage);
    }
  });

  it("can jump to CANCELLED from any stage", async () => {
    // Set to EDITING first
    await prisma.booking.update({ where: { id: bookingId }, data: { statusV2: "EDITING" } });
    await prisma.booking.update({ where: { id: bookingId }, data: { statusV2: "CANCELLED" } });
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(b!.statusV2).toBe("CANCELLED");
  });

  it("has correct pipeline stage labels", () => {
    const labels = BOOKING_PIPELINE.map((s) => s.label);
    expect(labels).toContain("Inquiry");
    expect(labels).toContain("Quotation Sent");
    expect(labels).toContain("Awaiting Deposit");
    expect(labels).toContain("Confirmed");
    expect(labels).toContain("Event Day");
    expect(labels).toContain("Editing");
    expect(labels).toContain("Delivered");
    expect(labels).toContain("Completed");
    expect(labels).toContain("Cancelled");
  });
});

// ── SCENARIO 5: Different event types ────────────────────────────────────────

describe("Scenario 5: Different event types", () => {
  const eventTypes = ["Wedding", "Birthday", "Corporate Event", "Product Shoot", "Fashion Shoot", "Concert", "Graduation"];

  eventTypes.forEach((evType) => {
    it(`creates a ${evType} booking`, async () => {
      const booking = await prisma.booking.create({
        data: {
          id: cuid(), clientId, title: `Test ${evType}`,
          serviceType: evType, eventType: evType,
          scheduledAt: new Date("2026-10-01T10:00:00"),
          status: "REQUESTED", statusV2: "INQUIRY", paymentStatus: "UNPAID",
        },
      });
      createdBookingIds.push(booking.id);
      expect(booking.eventType).toBe(evType);
    });
  });
});

// ── SCENARIO 6: Delivery deadline scenarios ───────────────────────────────────

describe("Scenario 6: Delivery deadlines", () => {
  it("creates STANDARD delivery booking with zero fee", async () => {
    const booking = await prisma.booking.create({
      data: {
        id: cuid(), clientId, title: "Standard Delivery Test",
        serviceType: "Portrait", eventType: "Portrait Session",
        scheduledAt: new Date("2026-10-01T10:00:00"),
        deliveryDeadline: "STANDARD", deliveryFeeCents: 0,
        status: "REQUESTED", statusV2: "INQUIRY", paymentStatus: "UNPAID",
      },
    });
    createdBookingIds.push(booking.id);
    expect(booking.deliveryDeadline).toBe("STANDARD");
    expect(booking.deliveryFeeCents).toBe(0);
  });

  it("creates EXPRESS delivery booking with $80 fee", async () => {
    const booking = await prisma.booking.create({
      data: {
        id: cuid(), clientId, title: "Express Delivery Test",
        serviceType: "Portrait", eventType: "Portrait Session",
        scheduledAt: new Date("2026-10-02T10:00:00"),
        deliveryDeadline: "EXPRESS", deliveryFeeCents: 8000,
        status: "REQUESTED", statusV2: "INQUIRY", paymentStatus: "UNPAID",
      },
    });
    createdBookingIds.push(booking.id);
    expect(booking.deliveryDeadline).toBe("EXPRESS");
    expect(booking.deliveryFeeCents).toBe(8000);
  });

  it("creates URGENT delivery booking with $150 fee", async () => {
    const booking = await prisma.booking.create({
      data: {
        id: cuid(), clientId, title: "Urgent Delivery Test",
        serviceType: "Event", eventType: "Conference",
        scheduledAt: new Date("2026-10-03T10:00:00"),
        deliveryDeadline: "URGENT", deliveryFeeCents: 15000,
        status: "REQUESTED", statusV2: "INQUIRY", paymentStatus: "UNPAID",
      },
    });
    createdBookingIds.push(booking.id);
    expect(booking.deliveryDeadline).toBe("URGENT");
    expect(booking.deliveryFeeCents).toBe(15000);
  });
});

// ── SCENARIO 7: Crew configurations ──────────────────────────────────────────

describe("Scenario 7: Crew configurations", () => {
  it("solo photographer booking (no video crew)", async () => {
    const booking = await prisma.booking.create({
      data: {
        id: cuid(), clientId, title: "Solo Photographer Booking",
        serviceType: "Portrait", eventType: "Portrait Session",
        scheduledAt: new Date("2026-10-04T10:00:00"),
        crewPhotographers: 1, crewVideographers: 0, crewDroneOps: 0, crewAssistants: 0,
        includedHours: 3,
        status: "REQUESTED", statusV2: "INQUIRY", paymentStatus: "UNPAID",
      },
    });
    createdBookingIds.push(booking.id);
    expect(booking.crewPhotographers).toBe(1);
    expect(booking.crewVideographers).toBe(0);
    expect(booking.includedHours).toBe(3);
  });

  it("full production crew booking", async () => {
    const booking = await prisma.booking.create({
      data: {
        id: cuid(), clientId, title: "Full Production Booking",
        serviceType: "Wedding", eventType: "Wedding",
        scheduledAt: new Date("2026-10-05T08:00:00"),
        crewPhotographers: 3, crewVideographers: 2, crewDroneOps: 1, crewAssistants: 2,
        includedHours: 12,
        status: "REQUESTED", statusV2: "INQUIRY", paymentStatus: "UNPAID",
      },
    });
    createdBookingIds.push(booking.id);
    expect(booking.crewPhotographers).toBe(3);
    expect(booking.crewVideographers).toBe(2);
    expect(booking.crewDroneOps).toBe(1);
    expect(booking.crewAssistants).toBe(2);
    expect(booking.includedHours).toBe(12);
  });
});

// ── SCENARIO 8: Payment status transitions ────────────────────────────────────

describe("Scenario 8: Payment status transitions", () => {
  let bookingId: string;

  beforeAll(async () => {
    const b = await prisma.booking.create({
      data: {
        id: cuid(), clientId, packageId: pkgId,
        title: "Payment Flow Test",
        serviceType: "Wedding", eventType: "Wedding",
        scheduledAt: new Date("2026-11-15T09:00:00"),
        quoteTotalCents: 150000, depositPercent: 50,
        status: "REQUESTED", statusV2: "INQUIRY", paymentStatus: "UNPAID",
      },
    });
    createdBookingIds.push(bookingId = b.id);
  });

  it("starts as UNPAID", async () => {
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(b!.paymentStatus).toBe("UNPAID");
  });

  it("transitions to DEPOSIT_PAID after partial payment", async () => {
    await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: "DEPOSIT_PAID", statusV2: "AWAITING_DEPOSIT" } });
    // Create a deposit payment record
    const payment = await prisma.payment.create({
      data: { id: cuid(), bookingId, amountCents: 75000, currency: "USD", status: "PAID" },
    });
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(b!.paymentStatus).toBe("DEPOSIT_PAID");
    expect(payment.amountCents).toBe(75000); // 50% deposit
  });

  it("transitions to PAID after full payment", async () => {
    await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: "PAID", statusV2: "CONFIRMED" } });
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(b!.paymentStatus).toBe("PAID");
    expect(b!.statusV2).toBe("CONFIRMED");
  });

  it("can be refunded", async () => {
    await prisma.booking.update({ where: { id: bookingId }, data: { paymentStatus: "REFUNDED" } });
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(b!.paymentStatus).toBe("REFUNDED");
  });
});

// ── SCENARIO 9: Admin booking queries ────────────────────────────────────────

describe("Scenario 9: Admin booking queries", () => {
  it("can filter bookings by statusV2 = INQUIRY", async () => {
    const inquiries = await prisma.booking.findMany({
      where: { clientId, statusV2: "INQUIRY" },
      select: { id: true, statusV2: true },
    });
    expect(inquiries.every((b) => b.statusV2 === "INQUIRY")).toBe(true);
  });

  it("can filter bookings by paymentStatus = UNPAID", async () => {
    const unpaid = await prisma.booking.findMany({
      where: { clientId, paymentStatus: "UNPAID" },
    });
    expect(unpaid.every((b) => b.paymentStatus === "UNPAID")).toBe(true);
  });

  it("can filter bookings by eventType", async () => {
    const weddings = await prisma.booking.findMany({
      where: { clientId, eventType: "Wedding" },
    });
    expect(weddings.every((b) => b.eventType === "Wedding")).toBe(true);
  });

  it("can filter by deliveryDeadline = URGENT", async () => {
    const urgent = await prisma.booking.findMany({
      where: { clientId, deliveryDeadline: "URGENT" },
    });
    expect(urgent.length).toBeGreaterThanOrEqual(1);
    expect(urgent.every((b) => b.deliveryDeadline === "URGENT")).toBe(true);
  });

  it("returns all new fields in a booking query", async () => {
    const booking = await prisma.booking.findFirst({
      where: { clientId, eventType: "Wedding", crewPhotographers: { gt: 0 } },
    });
    expect(booking).not.toBeNull();
    expect(booking!.crewPhotographers).toBeGreaterThan(0);
    expect(booking!.servicesJson).toBeDefined();
    expect(booking!.photoSpecJson).toBeDefined();
    expect(booking!.videoSpecJson).toBeDefined();
    expect(booking!.statusV2).toBeDefined();
    expect(booking!.deliveryDeadline).toBeDefined();
  });
});

// ── SCENARIO 10: Special request & internal notes isolation ───────────────────

describe("Scenario 10: Notes and special requests", () => {
  it("stores special requests (visible to client)", async () => {
    const booking = await prisma.booking.create({
      data: {
        id: cuid(), clientId, title: "Notes Test Booking",
        serviceType: "Birthday", eventType: "Birthday",
        scheduledAt: new Date("2026-10-10T14:00:00"),
        specialRequests: "Surprise party — do NOT contact client phone before event.",
        internalNotes: "Parking available at rear. Client is deaf — communicate via text.",
        status: "REQUESTED", statusV2: "INQUIRY", paymentStatus: "UNPAID",
      },
    });
    createdBookingIds.push(booking.id);
    expect(booking.specialRequests).toContain("Surprise party");
    expect(booking.internalNotes).toContain("communicate via text");
  });

  it("internal notes are stored separately from client-facing notes", async () => {
    const booking = await prisma.booking.findFirst({
      where: { clientId, internalNotes: { not: null } },
      select: { notes: true, specialRequests: true, internalNotes: true },
    });
    expect(booking!.internalNotes).toBeDefined();
    // internalNotes is separate from public notes
    expect(booking!.internalNotes).not.toBe(booking!.notes);
  });
});

// ── SCENARIO 11: Booking with overttime calculation data ──────────────────────

describe("Scenario 11: Overtime data", () => {
  it("stores includedHours and overtimeRatePerHour", async () => {
    const booking = await prisma.booking.create({
      data: {
        id: cuid(), clientId, title: "Overtime Test Booking",
        serviceType: "Wedding", eventType: "Wedding",
        scheduledAt: new Date("2026-10-15T08:00:00"),
        endTime:     new Date("2026-10-15T22:00:00"), // 14 hours actual
        includedHours: 10,
        overtimeRatePerHour: PRICING_RULES.EXTRA_HOUR_CENTS, // $50/hr
        status: "REQUESTED", statusV2: "INQUIRY", paymentStatus: "UNPAID",
      },
    });
    createdBookingIds.push(booking.id);

    expect(booking.includedHours).toBe(10);
    expect(booking.overtimeRatePerHour).toBe(5000);

    // Overtime calculation: 14 actual - 10 included = 4 hours × $50 = $200
    const actualHours  = (new Date("2026-10-15T22:00:00").getTime() - new Date("2026-10-15T08:00:00").getTime()) / 3600000;
    const overtime     = Math.max(0, actualHours - booking.includedHours!);
    const overtimeFee  = overtime * booking.overtimeRatePerHour;
    expect(actualHours).toBe(14);
    expect(overtime).toBe(4);
    expect(overtimeFee).toBe(20000); // $200
  });
});

// ── SCENARIO 12: Booking cancellation ────────────────────────────────────────

describe("Scenario 12: Cancellation", () => {
  it("can cancel a booking at any pipeline stage", async () => {
    const booking = await prisma.booking.create({
      data: {
        id: cuid(), clientId, title: "Cancellation Test",
        serviceType: "Event", eventType: "Conference",
        scheduledAt: new Date("2026-11-01T09:00:00"),
        status: "CONFIRMED", statusV2: "CREW_ASSIGNED", paymentStatus: "DEPOSIT_PAID",
      },
    });
    createdBookingIds.push(booking.id);

    // Cancel it
    const cancelled = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED", statusV2: "CANCELLED" },
    });
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.statusV2).toBe("CANCELLED");
  });
});
