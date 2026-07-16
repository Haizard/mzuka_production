import { redirect } from "next/navigation";
import type { getCurrentUser } from "@/lib/auth";

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
  { href: "/admin/academy",             label: "Academy",      roles: null },
  { href: "/admin/employees",           label: "Employees",    roles: ["ADMIN", "HUMAN_RESOURCE"] },
  { href: "/admin/equipment",           label: "Equipment",    roles: ["ADMIN", "PRODUCTION_MANAGER", "COORDINATOR", "DRIVER"] },
  { href: "/admin/equipment/returns",   label: "Returns",      roles: ["ADMIN", "PRODUCTION_MANAGER", "COORDINATOR", "DRIVER"] },
  { href: "/admin/legal",               label: "Legal",        roles: ["ADMIN"] },
  { href: "/admin/security",            label: "Security",     roles: ["ADMIN"] },
  { href: "/admin/messages",            label: "Messages",     roles: null },
  { href: "/admin/meetings",            label: "Meetings",     roles: null },
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
    // Admin-side staff roles belong in /admin, field staff in /staff
    const adminStaffRoles = ["ADMIN","PRODUCTION_MANAGER","COORDINATOR","HUMAN_RESOURCE"];
    const dest = (user.role === "STAFF" && user.staffRole && adminStaffRoles.includes(user.staffRole))
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
    const adminStaffRoles = ["ADMIN","PRODUCTION_MANAGER","COORDINATOR","HUMAN_RESOURCE"];
    const dest = (user.role === "STAFF" && user.staffRole && adminStaffRoles.includes(user.staffRole))
      ? "/admin"
      : user.role === "STAFF" ? "/staff" : "/admin";
    redirect(dest);
  }

  return user;
}

export function canManageEmployees(user: { role: string; staffRole: string | null }) {
  return user.role === "FOUNDER"
    || user.role === "ADMIN"
    || user.staffRole === "HUMAN_RESOURCE";
}
