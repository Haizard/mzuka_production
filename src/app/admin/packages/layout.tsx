import { requireAdminAccess } from "@/lib/admin-permissions";

export default async function PackagesLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/admin/packages");
  return children;
}
