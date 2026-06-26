import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user?.approvalStatus === "APPROVED") {
    redirect(["FOUNDER", "ADMIN", "STAFF"].includes(user.role) ? "/admin" : "/client");
  }

  if (user) {
    redirect("/pending-approval");
  }

  return (
    <AuthCard
      footerHref="/register"
      footerLabel="Request access"
      footerText="No private account yet?"
      subtitle="Sign in to manage bookings, protected galleries, payments, and final delivery."
      title="Sign in"
    >
      <LoginForm />
    </AuthCard>
  );
}
