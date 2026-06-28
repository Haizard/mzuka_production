import Link from "next/link";
import { redirect } from "next/navigation";
import { createCheckoutSessionAction } from "@/app/client/actions";

export const dynamic = "force-dynamic";

interface CheckoutPageProps {
  searchParams: Promise<{ bookingId?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const { bookingId } = await searchParams;

  if (!bookingId) {
    redirect("/client/bookings");
  }

  const result = await createCheckoutSessionAction(bookingId);

  if (!result.success || !result.url) {
    return (
      <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
        <section className="mx-auto max-w-2xl text-center">
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-8">
            <p className="text-red-200 font-medium mb-2">Payment Setup Failed</p>
            <p className="text-sm text-zinc-400 mb-6">{result.error ?? "Failed to create checkout session"}</p>
            <Link
              href={`/client/bookings/${bookingId}`}
              className="inline-block rounded-lg bg-[var(--gold)] px-6 py-2.5 text-sm font-semibold text-black hover:bg-yellow-400 transition"
            >
              Back to Booking
            </Link>
          </div>
        </section>
      </main>
    );
  }

  redirect(result.url);
}
