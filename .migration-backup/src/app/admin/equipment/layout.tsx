import { requireAdminAccess } from "@/lib/admin-permissions";

export default async function EquipmentLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/admin/equipment");
  return children;
}
