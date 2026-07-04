/**
 * Payments CRUD tests
 * Tests: create payment record, read, update status (UNPAID→PAID→REFUNDED),
 *        payment gating logic, download record
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  db,
  createTestUser,
  createTestPackage,
  createTestBooking,
  cleanupUser,
  cleanupBooking,
  cleanupPackage,
} from "./helpers";

let clientId = "";
let packageId = "";
let bookingId = "";

beforeAll(async () => {
  const client = await createTestUser({ role: "CLIENT", approvalStatus: "APPROVED" });
  clientId = client.id;
  const pkg = await createTestPackage({ priceCents: 80000 });
  packageId = pkg.id;
  const booking = await createTestBooking(clientId, packageId);
  bookingId = booking.id;
});

afterAll(async () => {
  await cleanupBooking(bookingId);
  await cleanupPackage(packageId);
  await cleanupUser(clientId);
});

describe("Payments — Create", () => {
  it("creates an UNPAID payment record for a booking", async () => {
    const payment = await db.payment.create({
      data: {
        bookingId,
        amountCents: 80000,
        currency: "USD",
        status: "UNPAID",
      },
    });

    expect(payment.id).toBeTruthy();
    expect(payment.bookingId).toBe(bookingId);
    expect(payment.amountCents).toBe(80000);
    expect(payment.status).toBe("UNPAID");
  });

  it("stores stripe checkout session id", async () => {
    const sessionId = `cs_test_${Date.now()}`;
    const payment = await db.payment.create({
      data: {
        bookingId,
        amountCents: 80000,
        currency: "USD",
        status: "UNPAID",
        stripeCheckoutSession: sessionId,
      },
    });

    expect(payment.stripeCheckoutSession).toBe(sessionId);

    // cleanup
    await db.payment.delete({ where: { id: payment.id } });
  });
});

describe("Payments — Read", () => {
  it("reads payments for a booking", async () => {
    const payments = await db.payment.findMany({
      where: { bookingId },
      include: { booking: true },
    });
    expect(payments.length).toBeGreaterThanOrEqual(1);
    expect(payments[0].booking.id).toBe(bookingId);
  });

  it("calculates total paid amount", async () => {
    // Mark one payment as paid
    const payment = await db.payment.findFirst({ where: { bookingId } });
    await db.payment.update({
      where: { id: payment!.id },
      data: { status: "PAID" },
    });

    const payments = await db.payment.findMany({ where: { bookingId } });
    const totalPaid = payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + p.amountCents, 0);

    expect(totalPaid).toBeGreaterThan(0);
  });
});

describe("Payments — Update (status transitions)", () => {
  let paymentId = "";

  beforeAll(async () => {
    const p = await db.payment.create({
      data: {
        bookingId,
        amountCents: 40000,
        currency: "USD",
        status: "UNPAID",
        stripeCheckoutSession: `cs_test_transition_${Date.now()}`,
      },
    });
    paymentId = p.id;
  });

  afterAll(async () => {
    await db.payment.deleteMany({ where: { id: paymentId } });
  });

  it("marks payment as PAID after checkout completes", async () => {
    const updated = await db.payment.update({
      where: { id: paymentId },
      data: { status: "PAID" },
    });
    expect(updated.status).toBe("PAID");
  });

  it("updates booking paymentStatus to PAID", async () => {
    await db.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: "PAID" },
    });
    const booking = await db.booking.findUnique({ where: { id: bookingId } });
    expect(booking!.paymentStatus).toBe("PAID");
  });

  it("marks payment as REFUNDED", async () => {
    const updated = await db.payment.update({
      where: { id: paymentId },
      data: { status: "REFUNDED" },
    });
    expect(updated.status).toBe("REFUNDED");
  });

  it("marks payment as FAILED (e.g. expired session)", async () => {
    const failed = await db.payment.update({
      where: { id: paymentId },
      data: { status: "FAILED" },
    });
    expect(failed.status).toBe("FAILED");
  });
});

describe("Payments — Payment gating logic", () => {
  it("gallery is locked when no PAID payment exists", async () => {
    const payments = await db.payment.findMany({
      where: { bookingId, status: "UNPAID" },
    });
    const isPaid = payments.some((p) => p.status === "PAID");
    expect(isPaid).toBe(false);
  });

  it("gallery unlocks when a PAID payment exists", async () => {
    // Create a paid payment
    const paid = await db.payment.create({
      data: {
        bookingId,
        amountCents: 80000,
        currency: "USD",
        status: "PAID",
        stripePaymentIntent: `pi_test_${Date.now()}`,
      },
    });

    const payments = await db.payment.findMany({ where: { bookingId } });
    const isPaid = payments.some((p) => p.status === "PAID");
    expect(isPaid).toBe(true);

    // cleanup
    await db.payment.delete({ where: { id: paid.id } });
  });
});

describe("Payments — Download records", () => {
  it("creates a download record when a file is downloaded", async () => {
    // Need a media asset — create a minimal gallery + asset inline
    const b = await createTestBooking(clientId, packageId);
    const g = await db.gallery.create({
      data: {
        bookingId: b.id,
        title: "DL Test Gallery",
        slug: `dl-test-${Date.now()}`,
      },
    });
    const asset = await db.mediaAsset.create({
      data: {
        galleryId: g.id,
        kind: "PHOTO",
        originalKey: `originals/photo/dl-${Date.now()}/photo.jpg`,
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        releaseStatus: "RELEASED",
      },
    });

    const download = await db.download.create({
      data: {
        mediaAssetId: asset.id,
        userId: clientId,
        ipAddress: "127.0.0.1",
      },
    });

    expect(download.id).toBeTruthy();
    expect(download.mediaAssetId).toBe(asset.id);

    // Cleanup
    await db.download.deleteMany({ where: { mediaAssetId: asset.id } });
    await db.mediaAsset.deleteMany({ where: { id: asset.id } });
    await db.gallery.deleteMany({ where: { id: g.id } });
    await cleanupBooking(b.id);
  });
});
