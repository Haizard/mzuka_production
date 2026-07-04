import { requireAdminAccess } from "@/lib/admin-permissions";

export default async function ContractsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/admin/finance/contracts");
  return children;
}
