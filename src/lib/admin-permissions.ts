import { redirect } from "next/navigation";
import type { getCurrentUser } from "@/lib/auth";

// ── Centralized role configuration ───────────────────────────────────────────
// Single source of truth for all role-related constants.
// Every file that previously hardcoded role lists should import from here.

/** Roles that see the /admin panel (not /staff) */
export const ADMIN_SIDE_ROLES = ["ADMIN", "PRODUCTION_MANAGER", "COORDINATOR", "HUMAN_RESOURCE"] as const;

/** Roles that see the /staff task portal */
export const STAFF_SIDE_ROLES = ["PHOTOGRAPHER", "VIDEO_EDITOR", "EDITOR", "DRIVER", "ASSISTANT"] as const;

/** Roles that can manage the employee roster (create/edit staff accounts) */
export const EMPLOYEE_MANAGER_ROLES = ["FOUNDER", "ADMIN"] as const;

/** Staff role values that require full admin access (can promote to ADMIN UserRole) */
export const ADMIN_ELEVATED_ROLES = ["ADMIN"] as const;

/** Check whether a staffRole is one that only the FOUNDER can assign */
export function isFounderOnlyRole(staffRole: string | null): boolean {
  return staffRole === "ADMIN";
}

export const ADMIN_NAV_ITEMS = [
  { href: "/admin",                     label: "Dashboard",    roles: ["ADMIN"] },
  { href: "/admin/approvals",           label: "Approvals",    roles: ["ADMIN", "COORDINATOR"] },
  { href: "/admin/bookings",            label: "Bookings",     roles: ["ADMIN", "PRODUCTION_MANAGER", "PHOTOGRAPHER", "COORDINATOR", "ASSISTANT"] },
  { href: "/admin/packages",            label: "Packages",     roles: ["ADMIN"] },
  { href: "/admin/galleries",           label: "Galleries",    roles: ["ADMIN", "PRODUCTION_MANAGER", "PHOTOGRAPHER", "VIDEO_EDITOR", "EDITOR"] },
  { href: "/admin/production",          label: "Production",   roles: ["ADMIN", "PRODUCTION_MANAGER", "PHOTOGRAPHER", "VIDEO_EDITOR", "EDITOR", "COORDINATOR"] },
  { href: "/admin/production/calendar", label: "Calendar",     roles: ["ADMIN", "PRODUCTION_MANAGER", "PHOTOGRAPHER", "COORDINATOR"] },
  { href: "/admin/production/delivery", label: "Delivery",     roles: ["ADMIN", "PRODUCTION_MANAGER", "COORDINATOR", "DRIVER"] },
  { href: "/admin/finance",             label: "Finance",      roles: ["ADMIN", "HUMAN_RESOURCE"] },
  { href: "/admin/finance/invoices",    label: "Invoices",     roles: ["ADMIN", "HUMAN_RESOURCE"] },
  { href: "/admin/finance/expenses",    label: "Expenses",     roles: ["ADMIN", "HUMAN_RESOURCE"] },
  { href: "/admin/finance/contracts",   label: "Contracts",    roles: ["ADMIN"] },
  { href: "/admin/payroll",             label: "Payroll",      roles: ["ADMIN", "HUMAN_RESOURCE"] },
  { href: "/admin/ai",                  label: "AI Assistant", roles: ["ADMIN", "PRODUCTION_MANAGER", "VIDEO_EDITOR"] },
  { href: "/admin/analytics",           label: "Analytics",    roles: ["ADMIN", "HUMAN_RESOURCE"] },
  { href: "/admin/media-library",       label: "Media Library",roles: ["ADMIN", "PHOTOGRAPHER", "VIDEO_EDITOR", "EDITOR"] },
  { href: "/admin/reports",             label: "Reports",      roles: ["ADMIN", "HUMAN_RESOURCE"] },
  { href: "/admin/academy",             label: "Academy",      roles: ["ADMIN", "PRODUCTION_MANAGER", "PHOTOGRAPHER", "VIDEO_EDITOR", "EDITOR", "COORDINATOR", "DRIVER", "ASSISTANT"] },
  { href: "/admin/employees",           label: "Employees",    roles: ["ADMIN", "HUMAN_RESOURCE"] },
  { href: "/admin/equipment",           label: "Equipment",    roles: ["ADMIN", "PRODUCTION_MANAGER", "COORDINATOR", "DRIVER"] },
  { href: "/admin/equipment/returns",   label: "Returns",      roles: ["ADMIN", "PRODUCTION_MANAGER", "COORDINATOR", "DRIVER"] },
  { href: "/admin/legal",               label: "Legal",        roles: ["ADMIN"] },
  { href: "/admin/security",            label: "Security",     roles: ["ADMIN"] },
  { href: "/admin/messages",            label: "Messages",     roles: ["ADMIN", "PRODUCTION_MANAGER", "COORDINATOR"] },
  { href: "/admin/meetings",            label: "Meetings",     roles: ["ADMIN", "PRODUCTION_MANAGER", "COORDINATOR"] },
] as const;

type AdminUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type AdminPath = (typeof ADMIN_NAV_ITEMS)[number]["href"];

export function adminAccessRole(user: Pick<AdminUser, "role" | "staffRole">) {
  if (user.role === "FOUNDER" || user.role === "ADMIN") return "ADMIN";
  return user.staffRole;
}

function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function canAccessAdminPath(
  user: Pick<AdminUser, "role" | "staffRole">,
  pathname: string
) {
  if (user.role === "FOUNDER") return true;

  const accessRole = adminAccessRole(user);
  const item = [...ADMIN_NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((navItem) => pathMatches(pathname, navItem.href));

  if (!item) return false;
  if (item.roles === null) return true;
  if (accessRole === "ADMIN") return true;
  if (!accessRole) return false;

  return (item.roles as readonly string[]).includes(accessRole);
}

export async function requireAdminAccess(pathname: AdminPath | string) {
  const { requireAdmin } = await import("@/lib/auth");
  const user = await requireAdmin();

  if (!canAccessAdminPath(user, pathname)) {
    const dest = (user.role === "STAFF" && user.staffRole && (ADMIN_SIDE_ROLES as readonly string[]).includes(user.staffRole))
      ? "/admin"
      : user.role === "STAFF" ? "/staff" : "/admin";
    redirect(dest);
  }

  return user;
}

export async function requireAnyAdminAccess(pathnames: Array<AdminPath | string>) {
  const { requireAdmin } = await import("@/lib/auth");
  const user = await requireAdmin();

  if (!pathnames.some((pathname) => canAccessAdminPath(user, pathname))) {
    const dest = (user.role === "STAFF" && user.staffRole && (ADMIN_SIDE_ROLES as readonly string[]).includes(user.staffRole))
      ? "/admin"
      : user.role === "STAFF" ? "/staff" : "/admin";
    redirect(dest);
  }

  return user;
}

export function canManageEmployees(user: { role: string; staffRole: string | null }) {
  if (EMPLOYEE_MANAGER_ROLES.includes(user.role as any)) return true;
  // HR can view/manage the list but must NOT create ADMIN accounts (enforced server-side)
  if (user.staffRole === "HUMAN_RESOURCE") return true;
  return false;
}
