import { requireAdminAccess } from "@/lib/admin-permissions";

export default async function GalleriesLayout({ children }: { children: React.ReactNode }) {
  await requireAdminAccess("/admin/galleries");
  return children;
}
