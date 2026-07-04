/**
 * Booking Reminders CRUD tests
 * Tests: schedule reminder, read reminders, delete reminder,
 *        pending reminders query, cleanup of old sent reminders
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
import { scheduleDefaultReminders, getPendingReminders, cleanupOldReminders } from "@/lib/reminders";

let clientId = "";
let packageId = "";
let bookingId = "";

beforeAll(async () => {
  const client = await createTestUser({ role: "CLIENT", approvalStatus: "APPROVED" });
  clientId = client.id;
  const pkg = await createTestPackage();
  packageId = pkg.id;
  const booking = await createTestBooking(clientId, packageId);
  bookingId = booking.id;
});

afterAll(async () => {
  await cleanupBooking(bookingId);
  await cleanupPackage(packageId);
  await cleanupUser(clientId);
});

describe("Reminders — Create", () => {
  it("creates an email reminder manually", async () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const reminder = await db.bookingReminder.create({
      data: {
        bookingId,
        channel: "email",
        scheduledAt: futureDate,
      },
    });

    expect(reminder.id).toBeTruthy();
    expect(reminder.bookingId).toBe(bookingId);
    expect(reminder.channel).toBe("email");
    expect(reminder.sentAt).toBeNull();
  });

  it("creates an SMS reminder manually", async () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const reminder = await db.bookingReminder.create({
      data: {
        bookingId,
        channel: "sms",
        scheduledAt: futureDate,
      },
    });

    expect(reminder.channel).toBe("sms");
  });

  it("scheduleDefaultReminders creates up to 3 reminders for a future booking", async () => {
    const b = await createTestBooking(clientId, packageId);
    const result = await scheduleDefaultReminders(
      b.id,
      clientId,
      b.scheduledAt,
      "test@mg-test.invalid",
      "+254700000000"
    );

    expect(result.success).toBe(true);
    expect(result.reminders!.length).toBeGreaterThanOrEqual(1);

    // cleanup
    await cleanupBooking(b.id);
  });
});

describe("Reminders — Read", () => {
  it("reads all reminders for a booking ordered by scheduledAt", async () => {
    const reminders = await db.bookingReminder.findMany({
      where: { bookingId },
      orderBy: { scheduledAt: "asc" },
    });

    expect(Array.isArray(reminders)).toBe(true);
    expect(reminders.length).toBeGreaterThanOrEqual(2);

    // Verify ordering
    for (let i = 1; i < reminders.length; i++) {
      expect(reminders[i].scheduledAt.getTime()).toBeGreaterThanOrEqual(
        reminders[i - 1].scheduledAt.getTime()
      );
    }
  });

  it("only returns unsent reminders for pending query", async () => {
    const reminders = await db.bookingReminder.findMany({
      where: { bookingId, sentAt: null },
    });
    expect(reminders.every((r) => r.sentAt === null)).toBe(true);
  });
});

describe("Reminders — Update (mark sent)", () => {
  it("marks a reminder as sent", async () => {
    const reminder = await db.bookingReminder.findFirst({
      where: { bookingId, sentAt: null },
    });
    expect(reminder).not.toBeNull();

    const updated = await db.bookingReminder.update({
      where: { id: reminder!.id },
      data: { sentAt: new Date() },
    });
    expect(updated.sentAt).not.toBeNull();
  });
});

describe("Reminders — Delete", () => {
  it("deletes a single reminder", async () => {
    const reminder = await db.bookingReminder.findFirst({
      where: { bookingId },
    });
    expect(reminder).not.toBeNull();

    await db.bookingReminder.delete({ where: { id: reminder!.id } });

    const found = await db.bookingReminder.findUnique({ where: { id: reminder!.id } });
    expect(found).toBeNull();
  });

  it("deletes all reminders for a booking", async () => {
    await db.bookingReminder.deleteMany({ where: { bookingId } });
    const remaining = await db.bookingReminder.findMany({ where: { bookingId } });
    expect(remaining).toHaveLength(0);
  });
});

describe("Reminders — getPendingReminders", () => {
  it("returns reminders past scheduledAt that have not been sent", async () => {
    // Create a past-due reminder
    const past = new Date(Date.now() - 60 * 1000); // 1 minute ago
    const b = await createTestBooking(clientId, packageId);
    const reminder = await db.bookingReminder.create({
      data: {
        bookingId: b.id,
        channel: "email",
        scheduledAt: past,
        sentAt: null,
      },
    });

    const pending = await getPendingReminders();
    const found = pending.find((r) => r.id === reminder.id);
    expect(found).toBeDefined();

    // cleanup
    await db.bookingReminder.deleteMany({ where: { bookingId: b.id } });
    await cleanupBooking(b.id);
  });
});

describe("Reminders — cleanupOldReminders", () => {
  it("deletes sent reminders older than 30 days", async () => {
    const b = await createTestBooking(clientId, packageId);
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);

    // Create an old sent reminder directly via DB
    const old = await db.bookingReminder.create({
      data: {
        bookingId: b.id,
        channel: "email",
        scheduledAt: oldDate,
        sentAt: oldDate,
        createdAt: oldDate,
      },
    });

    const result = await cleanupOldReminders();
    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(1);

    const check = await db.bookingReminder.findUnique({ where: { id: old.id } });
    expect(check).toBeNull();

    await cleanupBooking(b.id);
  });
});
