import { redirect } from "next/navigation";
import { createCheckoutSessionAction } from "@/app/client/actions";

export const dynamic = "force-dynamic";

interface CheckoutPageProps {
  searchParams: {
    bookingId?: string;
  };
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  if (!searchParams.bookingId) {
    redirect("/client/bookings");
  }

  const result = await createCheckoutSessionAction(searchParams.bookingId);

  if (!result.success || !result.url) {
    return (
      <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-red-200">{result.error || "Failed to create checkout session"}</p>
            <button
              onClick={() => history.back()}
              className="mt-4 rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500 transition"
            >
              Go Back
            </button>
          </div>
        </section>
      </main>
    );
  }

  // Redirect to Stripe Checkout
  redirect(result.url);
}
