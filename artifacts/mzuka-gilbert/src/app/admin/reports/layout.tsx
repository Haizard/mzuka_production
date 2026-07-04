import { requireAdminAccess } from "@/lib/admin-permissions";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/admin/reports");
  return children;
}
