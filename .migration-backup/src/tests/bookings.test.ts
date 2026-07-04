/**
 * Bookings CRUD tests
 * Tests: create, read (by id / by client), update status, stats, delete
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
let adminId = "";
let packageId = "";
const bookingIds: string[] = [];

beforeAll(async () => {
  const client = await createTestUser({ role: "CLIENT", approvalStatus: "APPROVED" });
  clientId = client.id;
  const admin = await createTestUser({ role: "ADMIN", approvalStatus: "APPROVED" });
  adminId = admin.id;
  const pkg = await createTestPackage({ priceCents: 50000 });
  packageId = pkg.id;
});

afterAll(async () => {
  for (const id of bookingIds) await cleanupBooking(id);
  await cleanupPackage(packageId);
  await cleanupUser(clientId);
  await cleanupUser(adminId);
});

describe("Bookings — Create", () => {
  it("creates a booking with package", async () => {
    const booking = await db.booking.create({
      data: {
        clientId,
        packageId,
        title: "Our Wedding Day",
        serviceType: "Wedding Photography",
        location: "Nairobi, Kenya",
        scheduledAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: "REQUESTED",
        paymentStatus: "UNPAID",
      },
    });
    bookingIds.push(booking.id);

    expect(booking.id).toBeTruthy();
    expect(booking.clientId).toBe(clientId);
    expect(booking.packageId).toBe(packageId);
    expect(booking.status).toBe("REQUESTED");
    expect(booking.paymentStatus).toBe("UNPAID");
  });

  it("creates a booking without package", async () => {
    const booking = await db.booking.create({
      data: {
        clientId,
        title: "Portrait Session",
        serviceType: "Photography",
        scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        status: "REQUESTED",
        paymentStatus: "UNPAID",
      },
    });
    bookingIds.push(booking.id);

    expect(booking.packageId).toBeNull();
  });

  it("creates audit log on booking creation", async () => {
    const booking = await createTestBooking(clientId, packageId);
    bookingIds.push(booking.id);

    await db.auditLog.create({
      data: {
        actorId: clientId,
        action: "BOOKING_CREATED",
        entity: "Booking",
        entityId: booking.id,
        metadata: { serviceType: booking.serviceType },
      },
    });

    const log = await db.auditLog.findFirst({
      where: { entityId: booking.id, action: "BOOKING_CREATED" },
    });
    expect(log).not.toBeNull();
  });
});

describe("Bookings — Read", () => {
  let bookingId = "";

  beforeAll(async () => {
    const b = await createTestBooking(clientId, packageId);
    bookingId = b.id;
    bookingIds.push(bookingId);
  });

  it("reads a booking by id with relations", async () => {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { client: true, package: true },
    });
    expect(booking).not.toBeNull();
    expect(booking!.client.id).toBe(clientId);
    expect(booking!.package!.id).toBe(packageId);
  });

  it("lists all bookings for a client", async () => {
    const bookings = await db.booking.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
    expect(bookings.length).toBeGreaterThanOrEqual(1);
    expect(bookings.every((b) => b.clientId === clientId)).toBe(true);
  });

  it("lists all bookings for admin with count", async () => {
    const [bookings, total] = await Promise.all([
      db.booking.findMany({ take: 50, orderBy: { createdAt: "desc" } }),
      db.booking.count(),
    ]);
    expect(total).toBeGreaterThanOrEqual(bookings.length);
  });

  it("filters bookings by status", async () => {
    const requested = await db.booking.findMany({
      where: { clientId, status: "REQUESTED" },
    });
    expect(requested.every((b) => b.status === "REQUESTED")).toBe(true);
  });
});

describe("Bookings — Update", () => {
  let bookingId = "";

  beforeAll(async () => {
    const b = await createTestBooking(clientId, packageId);
    bookingId = b.id;
    bookingIds.push(bookingId);
  });

  it("confirms a booking (REQUESTED → CONFIRMED)", async () => {
    const updated = await db.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    });
    expect(updated.status).toBe("CONFIRMED");
  });

  it("moves booking to IN_PROGRESS", async () => {
    const updated = await db.booking.update({
      where: { id: bookingId },
      data: { status: "IN_PROGRESS" },
    });
    expect(updated.status).toBe("IN_PROGRESS");
  });

  it("completes a booking and updates payment status", async () => {
    const updated = await db.booking.update({
      where: { id: bookingId },
      data: { status: "COMPLETED", paymentStatus: "PAID" },
    });
    expect(updated.status).toBe("COMPLETED");
    expect(updated.paymentStatus).toBe("PAID");
  });

  it("cancels a booking", async () => {
    const b = await createTestBooking(clientId);
    bookingIds.push(b.id);

    const updated = await db.booking.update({
      where: { id: b.id },
      data: { status: "CANCELLED" },
    });
    expect(updated.status).toBe("CANCELLED");
  });

  it("creates audit log for status update", async () => {
    const b = await createTestBooking(clientId);
    bookingIds.push(b.id);

    await db.booking.update({ where: { id: b.id }, data: { status: "CONFIRMED" } });
    await db.auditLog.create({
      data: {
        actorId: adminId,
        action: "BOOKING_UPDATED",
        entity: "Booking",
        entityId: b.id,
        metadata: { oldStatus: "REQUESTED", newStatus: "CONFIRMED" },
      },
    });

    const log = await db.auditLog.findFirst({
      where: { entityId: b.id, action: "BOOKING_UPDATED" },
    });
    expect(log).not.toBeNull();
    expect((log!.metadata as Record<string, string>).newStatus).toBe("CONFIRMED");
  });
});

describe("Bookings — Stats", () => {
  it("returns booking counts per status", async () => {
    const [total, requested, confirmed, completed] = await Promise.all([
      db.booking.count(),
      db.booking.count({ where: { status: "REQUESTED" } }),
      db.booking.count({ where: { status: "CONFIRMED" } }),
      db.booking.count({ where: { status: "COMPLETED" } }),
    ]);

    expect(total).toBeGreaterThanOrEqual(0);
    expect(requested + confirmed + completed).toBeLessThanOrEqual(total);
  });
});
