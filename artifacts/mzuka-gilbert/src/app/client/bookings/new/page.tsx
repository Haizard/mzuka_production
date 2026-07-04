import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { BookingForm } from "@/components/booking-form";

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const packages = await prisma.servicePackage.findMany({
    where: { isActive: true },
    orderBy: { priceCents: "asc" },
  });

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-2xl">
        <Link
          href="/client"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <header className="mt-6 mb-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
            New booking
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Request a Session</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Tell us about your event or project. Our team will review your request and follow up
            with availability and pricing.
          </p>
        </header>

        <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6 sm:p-8">
          <BookingForm packages={packages} />
        </div>
      </section>
    </main>
  );
}
