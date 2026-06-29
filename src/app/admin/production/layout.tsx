import { requireAdminAccess } from "@/lib/admin-permissions";

export default async function ProductionLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/admin/production");
  return children;
}
