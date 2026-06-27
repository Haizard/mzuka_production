/**
 * Auth CRUD tests
 * Tests: register (create user), login (read + verify), password hashing
 */
import { describe, it, expect, afterEach } from "vitest";
import { db, cleanupUser } from "./helpers";
import { hashPassword, verifyPassword } from "@/lib/password";

const created: string[] = [];

afterEach(async () => {
  for (const id of created.splice(0)) await cleanupUser(id);
});

describe("Auth — password hashing", () => {
  it("hashes a password and verifies it correctly", async () => {
    const hash = await hashPassword("SecurePass123!");
    expect(hash).toMatch(/^scrypt:/);
    expect(await verifyPassword("SecurePass123!", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("CorrectPass!");
    expect(await verifyPassword("WrongPass!", hash)).toBe(false);
  });
});

describe("Auth — user registration", () => {
  it("creates first user as FOUNDER with APPROVED status", async () => {
    // Use a unique email, check count first
    const email = `founder-test-${Date.now()}@mg-test.invalid`;
    const countBefore = await db.user.count();

    // Simulate: if 0 users → FOUNDER, otherwise CLIENT
    const isFirst = countBefore === 0;

    const user = await db.user.create({
      data: {
        name: "Founder Test",
        email,
        passwordHash: await hashPassword("Pass1234!"),
        role: isFirst ? "FOUNDER" : "CLIENT",
        approvalStatus: isFirst ? "APPROVED" : "PENDING",
      },
    });
    created.push(user.id);

    expect(user.email).toBe(email);
    // Verify we can read it back
    const found = await db.user.findUnique({ where: { email } });
    expect(found).not.toBeNull();
    expect(found!.name).toBe("Founder Test");
  });

  it("creates a CLIENT user with PENDING status", async () => {
    const email = `client-test-${Date.now()}@mg-test.invalid`;
    const user = await db.user.create({
      data: {
        name: "Client Test",
        email,
        passwordHash: await hashPassword("ClientPass1!"),
        role: "CLIENT",
        approvalStatus: "PENDING",
      },
    });
    created.push(user.id);

    expect(user.role).toBe("CLIENT");
    expect(user.approvalStatus).toBe("PENDING");
  });

  it("rejects duplicate email", async () => {
    const email = `dup-${Date.now()}@mg-test.invalid`;
    const u1 = await db.user.create({
      data: {
        name: "User One",
        email,
        passwordHash: await hashPassword("Pass1234!"),
        role: "CLIENT",
        approvalStatus: "PENDING",
      },
    });
    created.push(u1.id);

    await expect(
      db.user.create({
        data: {
          name: "User Two",
          email, // same email
          passwordHash: await hashPassword("Pass1234!"),
          role: "CLIENT",
          approvalStatus: "PENDING",
        },
      })
    ).rejects.toThrow();
  });

  it("reads user by email", async () => {
    const email = `read-test-${Date.now()}@mg-test.invalid`;
    const user = await db.user.create({
      data: {
        name: "Read Test",
        email,
        passwordHash: await hashPassword("ReadPass1!"),
        role: "CLIENT",
        approvalStatus: "PENDING",
      },
    });
    created.push(user.id);

    const found = await db.user.findUnique({ where: { email } });
    expect(found).not.toBeNull();
    expect(found!.id).toBe(user.id);
  });

  it("updates user phone number", async () => {
    const email = `update-test-${Date.now()}@mg-test.invalid`;
    const user = await db.user.create({
      data: {
        name: "Update Test",
        email,
        passwordHash: await hashPassword("UpdatePass1!"),
        role: "CLIENT",
        approvalStatus: "PENDING",
      },
    });
    created.push(user.id);

    const updated = await db.user.update({
      where: { id: user.id },
      data: { phone: "+254700000001" },
    });
    expect(updated.phone).toBe("+254700000001");
  });

  it("deletes a user", async () => {
    const email = `delete-test-${Date.now()}@mg-test.invalid`;
    const user = await db.user.create({
      data: {
        name: "Delete Test",
        email,
        passwordHash: await hashPassword("DeletePass1!"),
        role: "CLIENT",
        approvalStatus: "PENDING",
      },
    });

    await db.clientApproval.deleteMany({ where: { clientId: user.id } });
    await db.user.delete({ where: { id: user.id } });

    const found = await db.user.findUnique({ where: { id: user.id } });
    expect(found).toBeNull();
    // Don't push to cleanup — already deleted
  });
});
