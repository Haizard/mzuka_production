import { requireAdminAccess } from "@/lib/admin-permissions";

export default async function AiLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/admin/ai");
  return children;
}
