import { requireAdminAccess } from "@/lib/admin-permissions";

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/admin/finance");
  return children;
}
