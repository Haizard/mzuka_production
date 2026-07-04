import { requireAdminAccess } from "@/lib/admin-permissions";

export default async function BookingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/admin/bookings");
  return children;
}
