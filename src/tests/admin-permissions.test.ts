import { describe, it, expect } from "vitest";
import { canAccessAdminPath, canManageEmployees } from "@/lib/admin-permissions";

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

  it("allows ADMIN users to access every admin section", () => {
    expect(canAccessAdminPath({ role: "ADMIN", staffRole: "ADMIN" }, "/admin/security")).toBe(true);
    expect(canAccessAdminPath({ role: "ADMIN", staffRole: "ADMIN" }, "/admin/production/delivery")).toBe(true);
  });

  it("limits photographer staff to photographer sections", () => {
    const photographer = { role: "STAFF", staffRole: "PHOTOGRAPHER" };

    expect(canAccessAdminPath(photographer, "/admin/galleries")).toBe(true);
    expect(canAccessAdminPath(photographer, "/admin/production/calendar")).toBe(true);
    expect(canAccessAdminPath(photographer, "/admin/finance")).toBe(false);
    expect(canAccessAdminPath(photographer, "/admin/security")).toBe(false);
    expect(canAccessAdminPath(photographer, "/admin")).toBe(false);
  });

  it("allows HUMAN_RESOURCE staff to use people and finance sections", () => {
    const hr = { role: "STAFF", staffRole: "HUMAN_RESOURCE" };

    expect(canAccessAdminPath(hr, "/admin/employees")).toBe(true);
    expect(canAccessAdminPath(hr, "/admin/payroll")).toBe(true);
    expect(canAccessAdminPath(hr, "/admin/reports")).toBe(true);
    expect(canAccessAdminPath(hr, "/admin/galleries")).toBe(false);
  });
});
