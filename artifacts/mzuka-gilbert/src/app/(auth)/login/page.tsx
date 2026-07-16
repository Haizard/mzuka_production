import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { SupportChat } from "@/components/support-chat";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();

  if (user?.approvalStatus === "APPROVED") {
    redirect(["FOUNDER", "ADMIN"].includes(user.role) ? "/admin" : user.role === "STAFF" ? "/staff" : "/client");
  }

  if (user) {
    redirect("/pending-approval");
  }

  const params = await searchParams;
  const googleError = params.error;

  return (
    <>
      <AuthCard
        footerHref="/register"
        footerLabel="Request access"
        footerText="No private account yet?"
        subtitle="Sign in to manage bookings, protected galleries, payments, and final delivery."
        title="Sign in"
      >
        {googleError && (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {googleError === "google_cancelled"
              ? "Google sign-in was cancelled. Try again."
              : "Google sign-in failed. Please try again or use email."}
          </p>
        )}
        <LoginForm />
      </AuthCard>
      <SupportChat />
    </>
  );
}
