import { describe, it, expect } from "vitest";
import { canManageEmployees } from "@/lib/admin-permissions";

describe("Admin permissions", () => {
  it("allows ADMIN users to manage employees", () => {
    expect(canManageEmployees({ role: "ADMIN", staffRole: null })).toBe(true);
  });

  it("allows HUMAN_RESOURCE staff to manage employees", () => {
    expect(canManageEmployees({ role: "STAFF", staffRole: "HUMAN_RESOURCE" })).toBe(true);
  });

  it("does not allow regular STAFF without HUMAN_RESOURCE role to manage employees", () => {
    expect(canManageEmployees({ role: "STAFF", staffRole: "PHOTOGRAPHER" })).toBe(false);
  });
});
