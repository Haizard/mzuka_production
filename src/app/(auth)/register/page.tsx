import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/register-form";
import { getCurrentUser } from "@/lib/auth";
import { SupportChat } from "@/components/support-chat";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user?.approvalStatus === "APPROVED") {
    redirect(["FOUNDER", "ADMIN"].includes(user.role) ? "/admin" : user.role === "STAFF" ? "/staff" : "/client");
  }

  if (user) {
    redirect("/pending-approval");
  }

  return (
    <>
      <AuthCard
        footerHref="/login"
        footerLabel="Sign in"
        footerText="Already have an account?"
        subtitle="Use Google for instant access, or register with email for admin-reviewed access."
        title="Get started"
      >
        <RegisterForm />
      </AuthCard>
      <SupportChat />
    </>
  );
}
