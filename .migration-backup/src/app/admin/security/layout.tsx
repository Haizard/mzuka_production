import { requireAdminAccess } from "@/lib/admin-permissions";

export default async function SecurityLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/admin/security");
  return children;
}
