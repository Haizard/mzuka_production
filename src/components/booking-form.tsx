"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createBookingAction } from "@/app/client/actions";

const bookingSchema = z.object({
  serviceType: z.string().min(1, "Service type is required"),
  packageId: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  location: z.string().optional(),
  scheduledAt: z.string().min(1, "Date and time are required"),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  durationMin?: number | null;
}

interface BookingFormProps {
  packages: ServicePackage[];
}

export function BookingForm({ packages }: BookingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  const onSubmit = async (data: BookingFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createBookingAction(data);

      if (result.success) {
        router.push(`/client/bookings/${result.bookingId}`);
      } else {
        setError(result.error || "Failed to create booking");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedPackageId = watch("packageId");
  const selectedPackage = packages.find((p) => p.id === selectedPackageId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-white">
          Service Type
        </label>
        <select
          {...register("serviceType")}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-zinc-500 transition hover:border-white/20 focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
        >
          <option value="">Select a service</option>
          <option value="wedding">Wedding Photography</option>
          <option value="portrait">Portrait Session</option>
          <option value="event">Event Coverage</option>
          <option value="corporate">Corporate Video</option>
          <option value="other">Other</option>
        </select>
        {errors.serviceType && (
          <p className="mt-1 text-sm text-red-400">{errors.serviceType.message}</p>
        )}
      </div>

      {packages.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-white">
            Service Package (Optional)
          </label>
          <select
            {...register("packageId")}
            className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-zinc-500 transition hover:border-white/20 focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
          >
            <option value="">Choose a package</option>
            {packages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name} - ${(pkg.priceCents / 100).toFixed(2)}
              </option>
            ))}
          </select>
          {selectedPackage && (
            <p className="mt-2 text-sm text-zinc-400">{selectedPackage.description}</p>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-white">
          Event Title
        </label>
        <input
          {...register("title")}
          type="text"
          placeholder="e.g., Sarah & John's Wedding"
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-zinc-500 transition hover:border-white/20 focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white">
          Event Location (Optional)
        </label>
        <input
          {...register("location")}
          type="text"
          placeholder="e.g., Hilton Hotel, Downtown"
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-zinc-500 transition hover:border-white/20 focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white">
          Event Date & Time
        </label>
        <input
          {...register("scheduledAt")}
          type="datetime-local"
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white transition hover:border-white/20 focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
        />
        {errors.scheduledAt && (
          <p className="mt-1 text-sm text-red-400">{errors.scheduledAt.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white">
          Additional Notes (Optional)
        </label>
        <textarea
          {...register("notes")}
          placeholder="Tell us about your vision, any special requests, or additional details..."
          rows={4}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-zinc-500 transition hover:border-white/20 focus:border-[var(--gold)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[var(--gold)] px-6 py-3 font-semibold text-black transition hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Creating Booking..." : "Request Booking"}
      </button>
    </form>
  );
}
