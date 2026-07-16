import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import StaffDashboardClient from "./staff-client";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <StaffDashboardClient
      userName={user.name}
      staffRole={user.staffRole ?? null}
    />
  );
}
