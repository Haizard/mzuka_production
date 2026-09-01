import { requireApprovedUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import StaffDashboardClient from "./staff-client";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await requireApprovedUser();

  // Staff-side roles only — redirect admin roles to /admin
  const ADMIN_SIDE = ["ADMIN", "PRODUCTION_MANAGER", "COORDINATOR", "HUMAN_RESOURCE"];
  if (user.staffRole && ADMIN_SIDE.includes(user.staffRole)) redirect("/admin");
  if (!["FOUNDER", "ADMIN", "STAFF"].includes(user.role)) redirect("/client");

  return (
    <StaffDashboardClient
      userName={user.name}
      staffRole={user.staffRole ?? null}
    />
  );
}
