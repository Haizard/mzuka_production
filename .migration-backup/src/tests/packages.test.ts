/**
 * Service Packages CRUD tests
 * Tests: create, read, update (name/price/active toggle), delete
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, cleanupPackage } from "./helpers";

const createdIds: string[] = [];

afterAll(async () => {
  for (const id of createdIds) await cleanupPackage(id);
});

describe("Service Packages — Create", () => {
  it("creates a new service package", async () => {
    const pkg = await db.servicePackage.create({
      data: {
        name: "Wedding Photography Basic",
        description: "4-hour wedding coverage",
        priceCents: 150000,
        currency: "USD",
        durationMin: 240,
        isActive: true,
      },
    });
    createdIds.push(pkg.id);

    expect(pkg.id).toBeTruthy();
    expect(pkg.name).toBe("Wedding Photography Basic");
    expect(pkg.priceCents).toBe(150000);
    expect(pkg.isActive).toBe(true);
  });

  it("creates package without optional durationMin", async () => {
    const pkg = await db.servicePackage.create({
      data: {
        name: "Portraits Session",
        description: "Studio portrait session",
        priceCents: 40000,
        currency: "USD",
        isActive: true,
      },
    });
    createdIds.push(pkg.id);

    expect(pkg.durationMin).toBeNull();
  });
});

describe("Service Packages — Read", () => {
  let pkgId = "";

  beforeAll(async () => {
    const pkg = await db.servicePackage.create({
      data: {
        name: `Read-Test-${Date.now()}`,
        description: "Read test",
        priceCents: 75000,
        isActive: true,
      },
    });
    createdIds.push(pkg.id);
    pkgId = pkg.id;
  });

  it("finds a package by id", async () => {
    const found = await db.servicePackage.findUnique({ where: { id: pkgId } });
    expect(found).not.toBeNull();
    expect(found!.id).toBe(pkgId);
  });

  it("lists all active packages ordered by price", async () => {
    const packages = await db.servicePackage.findMany({
      where: { isActive: true },
      orderBy: { priceCents: "asc" },
    });
    expect(Array.isArray(packages)).toBe(true);
    // Should include our test package
    expect(packages.some((p) => p.id === pkgId)).toBe(true);
    // Verify ascending order
    for (let i = 1; i < packages.length; i++) {
      expect(packages[i].priceCents).toBeGreaterThanOrEqual(packages[i - 1].priceCents);
    }
  });
});

describe("Service Packages — Update", () => {
  let pkgId = "";

  beforeAll(async () => {
    const pkg = await db.servicePackage.create({
      data: {
        name: `Update-Test-${Date.now()}`,
        description: "Before update",
        priceCents: 60000,
        isActive: true,
      },
    });
    createdIds.push(pkg.id);
    pkgId = pkg.id;
  });

  it("updates name and price", async () => {
    const updated = await db.servicePackage.update({
      where: { id: pkgId },
      data: { name: "Updated Name", priceCents: 80000 },
    });
    expect(updated.name).toBe("Updated Name");
    expect(updated.priceCents).toBe(80000);
  });

  it("deactivates a package", async () => {
    const updated = await db.servicePackage.update({
      where: { id: pkgId },
      data: { isActive: false },
    });
    expect(updated.isActive).toBe(false);

    // Confirm it doesn't appear in active list
    const active = await db.servicePackage.findMany({
      where: { id: pkgId, isActive: true },
    });
    expect(active).toHaveLength(0);
  });

  it("re-activates a package", async () => {
    const updated = await db.servicePackage.update({
      where: { id: pkgId },
      data: { isActive: true },
    });
    expect(updated.isActive).toBe(true);
  });
});

describe("Service Packages — Delete", () => {
  it("deletes a package that has no bookings", async () => {
    const pkg = await db.servicePackage.create({
      data: {
        name: `Delete-Test-${Date.now()}`,
        description: "Will be deleted",
        priceCents: 10000,
        isActive: true,
      },
    });

    await db.servicePackage.delete({ where: { id: pkg.id } });

    const found = await db.servicePackage.findUnique({ where: { id: pkg.id } });
    expect(found).toBeNull();
    // Not pushed to cleanup since already deleted
  });
});
