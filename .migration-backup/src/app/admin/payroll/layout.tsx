import { requireAdminAccess } from "@/lib/admin-permissions";

export default async function PayrollLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/admin/payroll");
  return children;
}
