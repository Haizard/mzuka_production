import { requireAdminAccess } from "@/lib/admin-permissions";

export default async function ProductionDeliveryLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/admin/production/delivery");
  return children;
}
