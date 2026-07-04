/**
 * Shared test helpers — real DB via Prisma, no mocks.
 * Every helper cleans up after itself using the returned id.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "@/lib/password";

// Single client reused across the whole test run
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const db = createClient();

// ─── Factories ────────────────────────────────────────────────────────────────

export async function createTestUser(overrides: {
  name?: string;
  email?: string;
  role?: "FOUNDER" | "ADMIN" | "STAFF" | "CLIENT";
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
} = {}) {
  const email = overrides.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@mg-test.invalid`;
  return db.user.create({
    data: {
      name: overrides.name ?? "Test User",
      email,
      passwordHash: await hashPassword("TestPass123!"),
      role: overrides.role ?? "CLIENT",
      approvalStatus: overrides.approvalStatus ?? "APPROVED",
    },
  });
}

export async function createTestPackage(overrides: {
  name?: string;
  priceCents?: number;
} = {}) {
  return db.servicePackage.create({
    data: {
      name: overrides.name ?? `Package-${Date.now()}`,
      description: "Test package description",
      priceCents: overrides.priceCents ?? 50000,
      currency: "USD",
      isActive: true,
    },
  });
}

export async function createTestBooking(clientId: string, packageId?: string) {
  return db.booking.create({
    data: {
      clientId,
      packageId,
      title: `Test Booking ${Date.now()}`,
      serviceType: "Photography",
      location: "Nairobi, Kenya",
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      status: "REQUESTED",
      paymentStatus: "UNPAID",
    },
  });
}

export async function createTestGallery(bookingId: string) {
  const slug = `test-gallery-${Date.now()}`;
  return db.gallery.create({
    data: {
      bookingId,
      title: "Test Gallery",
      slug,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function createTestMediaAsset(galleryId: string) {
  return db.mediaAsset.create({
    data: {
      galleryId,
      kind: "PHOTO",
      originalKey: `originals/photo/test-${Date.now()}/test.jpg`,
      filename: "test.jpg",
      mimeType: "image/jpeg",
      releaseStatus: "DRAFT",
    },
  });
}

// ─── Cleanup helpers ──────────────────────────────────────────────────────────

export async function cleanupUser(id: string) {
  // cascade: audit logs, messages, approvals, bookings handled below
  await db.auditLog.deleteMany({ where: { actorId: id } });
  await db.message.deleteMany({ where: { userId: id } });
  await db.clientApproval.deleteMany({ where: { clientId: id } });
  await db.clientApproval.deleteMany({ where: { approverId: id } });

  // Clean related bookings
  const bookings = await db.booking.findMany({ where: { clientId: id } });
  for (const b of bookings) {
    await cleanupBooking(b.id);
  }

  await db.user.deleteMany({ where: { id } });
}

export async function cleanupBooking(id: string) {
  const gallery = await db.gallery.findUnique({ where: { bookingId: id } });
  if (gallery) await cleanupGallery(gallery.id);

  await db.bookingReminder.deleteMany({ where: { bookingId: id } });
  await db.payment.deleteMany({ where: { bookingId: id } });
  await db.auditLog.deleteMany({ where: { entityId: id } });
  await db.booking.deleteMany({ where: { id } });
}

export async function cleanupGallery(id: string) {
  const assets = await db.mediaAsset.findMany({ where: { galleryId: id } });
  for (const a of assets) await cleanupMediaAsset(a.id);
  await db.accessLog.deleteMany({ where: { galleryId: id } });
  await db.gallery.deleteMany({ where: { id } });
}

export async function cleanupMediaAsset(id: string) {
  await db.aiAnalysis.deleteMany({ where: { mediaAssetId: id } });
  await db.download.deleteMany({ where: { mediaAssetId: id } });
  await db.mediaAsset.deleteMany({ where: { id } });
}

export async function cleanupPackage(id: string) {
  await db.servicePackage.deleteMany({ where: { id } });
}
