import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/register-form";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user?.approvalStatus === "APPROVED") {
    redirect(["FOUNDER", "ADMIN", "STAFF"].includes(user.role) ? "/admin" : "/client");
  }

  if (user) {
    redirect("/pending-approval");
  }

  return (
    <AuthCard
      footerHref="/login"
      footerLabel="Sign in"
      footerText="Already approved?"
      subtitle="Every client needs an account and Muzuka Gilbert approval before viewing private work."
      title="Request access"
    >
      <RegisterForm />
    </AuthCard>
  );
}
