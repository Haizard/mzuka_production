/**
 * Gallery & Media Asset CRUD tests
 * Tests: create gallery, upload media asset, release assets,
 *        read gallery with assets, access logs, expiry flag, delete
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  db,
  createTestUser,
  createTestPackage,
  createTestBooking,
  createTestGallery,
  createTestMediaAsset,
  cleanupUser,
  cleanupBooking,
  cleanupGallery,
  cleanupPackage,
} from "./helpers";

let clientId = "";
let packageId = "";
let bookingId = "";
const galleryIds: string[] = [];

beforeAll(async () => {
  const client = await createTestUser({ role: "CLIENT", approvalStatus: "APPROVED" });
  clientId = client.id;
  const pkg = await createTestPackage();
  packageId = pkg.id;
  const booking = await createTestBooking(clientId, packageId);
  bookingId = booking.id;
});

afterAll(async () => {
  for (const id of galleryIds) await cleanupGallery(id);
  await cleanupBooking(bookingId);
  await cleanupPackage(packageId);
  await cleanupUser(clientId);
});

describe("Gallery — Create", () => {
  it("creates a gallery linked to a booking", async () => {
    const slug = `test-gallery-${Date.now()}`;
    const gallery = await db.gallery.create({
      data: {
        bookingId,
        title: "Wedding Gallery",
        slug,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    galleryIds.push(gallery.id);

    expect(gallery.id).toBeTruthy();
    expect(gallery.bookingId).toBe(bookingId);
    expect(gallery.slug).toBe(slug);
    expect(gallery.isDownloadOpen).toBe(false);
    expect(gallery.isShareOpen).toBe(false);
  });

  it("prevents two galleries for the same booking", async () => {
    // bookingId already has a gallery from above
    await expect(
      db.gallery.create({
        data: {
          bookingId,
          title: "Duplicate",
          slug: `dup-${Date.now()}`,
        },
      })
    ).rejects.toThrow(); // unique constraint on bookingId
  });
});

describe("Gallery — Read", () => {
  let galleryId = "";

  beforeAll(async () => {
    // Create a fresh booking for isolation
    const b2 = await createTestBooking(clientId, packageId);
    const g = await createTestGallery(b2.id);
    galleryId = g.id;
    galleryIds.push(galleryId);

    // We track b2 for cleanup via gallery cleanup (doesn't clean booking)
    // Clean up manually in afterAll by extending bookingIds — simplest here:
    // afterAll above only cleans bookingId; so delete b2 manually after gallery
    afterAll(async () => {
      await cleanupBooking(b2.id);
    });
  });

  it("reads gallery by id with media assets", async () => {
    const gallery = await db.gallery.findUnique({
      where: { id: galleryId },
      include: { mediaAssets: true, booking: true },
    });
    expect(gallery).not.toBeNull();
    expect(gallery!.booking).toBeDefined();
    expect(Array.isArray(gallery!.mediaAssets)).toBe(true);
  });

  it("reads gallery by slug", async () => {
    const g = await db.gallery.findFirst({ where: { id: galleryId } });
    const bySlug = await db.gallery.findUnique({ where: { slug: g!.slug } });
    expect(bySlug!.id).toBe(galleryId);
  });

  it("reads gallery by bookingId", async () => {
    const g = await db.gallery.findFirst({ where: { id: galleryId } });
    const byBooking = await db.gallery.findUnique({ where: { bookingId: g!.bookingId } });
    expect(byBooking!.id).toBe(galleryId);
  });

  it("lists all galleries for admin", async () => {
    const galleries = await db.gallery.findMany({
      include: { mediaAssets: true },
      orderBy: { createdAt: "desc" },
    });
    expect(galleries.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Media Assets — Create & Read", () => {
  let galleryId = "";

  beforeAll(async () => {
    const b = await createTestBooking(clientId, packageId);
    const g = await createTestGallery(b.id);
    galleryId = g.id;
    galleryIds.push(galleryId);
    afterAll(async () => { await cleanupBooking(b.id); });
  });

  it("uploads a PHOTO media asset", async () => {
    const asset = await db.mediaAsset.create({
      data: {
        galleryId,
        kind: "PHOTO",
        originalKey: `originals/photo/test-${Date.now()}/photo.jpg`,
        filename: "photo.jpg",
        mimeType: "image/jpeg",
        width: 6000,
        height: 4000,
        sizeBytes: BigInt(12_000_000),
        releaseStatus: "DRAFT",
      },
    });

    expect(asset.id).toBeTruthy();
    expect(asset.kind).toBe("PHOTO");
    expect(asset.releaseStatus).toBe("DRAFT");
    expect(asset.sizeBytes).toBe(BigInt(12_000_000));
  });

  it("uploads a VIDEO media asset", async () => {
    const asset = await db.mediaAsset.create({
      data: {
        galleryId,
        kind: "VIDEO",
        originalKey: `originals/video/test-${Date.now()}/video.mp4`,
        filename: "highlight.mp4",
        mimeType: "video/mp4",
        releaseStatus: "DRAFT",
      },
    });

    expect(asset.kind).toBe("VIDEO");
  });

  it("reads all assets in a gallery", async () => {
    const assets = await db.mediaAsset.findMany({ where: { galleryId } });
    expect(assets.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Media Assets — Release & Update", () => {
  let galleryId = "";

  beforeAll(async () => {
    const b = await createTestBooking(clientId, packageId);
    const g = await createTestGallery(b.id);
    galleryId = g.id;
    galleryIds.push(galleryId);
    // Add some draft assets
    await createTestMediaAsset(galleryId);
    await createTestMediaAsset(galleryId);
    afterAll(async () => { await cleanupBooking(b.id); });
  });

  it("releases all DRAFT assets in a gallery", async () => {
    const result = await db.mediaAsset.updateMany({
      where: { galleryId, releaseStatus: "DRAFT" },
      data: { releaseStatus: "RELEASED" },
    });
    expect(result.count).toBeGreaterThanOrEqual(2);

    const stillDraft = await db.mediaAsset.findMany({
      where: { galleryId, releaseStatus: "DRAFT" },
    });
    expect(stillDraft).toHaveLength(0);
  });

  it("hides a released asset", async () => {
    const asset = await db.mediaAsset.findFirst({ where: { galleryId } });
    const hidden = await db.mediaAsset.update({
      where: { id: asset!.id },
      data: { releaseStatus: "HIDDEN" },
    });
    expect(hidden.releaseStatus).toBe("HIDDEN");
  });

  it("opens download on a gallery", async () => {
    const updated = await db.gallery.update({
      where: { id: galleryId },
      data: { isDownloadOpen: true },
    });
    expect(updated.isDownloadOpen).toBe(true);
  });
});

describe("Gallery — Access Logs", () => {
  let galleryId = "";

  beforeAll(async () => {
    const b = await createTestBooking(clientId, packageId);
    const g = await createTestGallery(b.id);
    galleryId = g.id;
    galleryIds.push(galleryId);
    afterAll(async () => { await cleanupBooking(b.id); });
  });

  it("creates an access log for a gallery view", async () => {
    const log = await db.accessLog.create({
      data: {
        galleryId,
        userId: clientId,
        ipAddress: "127.0.0.1",
        action: "PREVIEW_ACCESS",
      },
    });
    expect(log.id).toBeTruthy();
    expect(log.action).toBe("PREVIEW_ACCESS");
  });

  it("creates a full-access log after payment", async () => {
    const log = await db.accessLog.create({
      data: {
        galleryId,
        userId: clientId,
        ipAddress: "127.0.0.1",
        action: "FULL_ACCESS",
      },
    });
    expect(log.action).toBe("FULL_ACCESS");
  });

  it("reads all access logs for a gallery", async () => {
    const logs = await db.accessLog.findMany({ where: { galleryId } });
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });
});
