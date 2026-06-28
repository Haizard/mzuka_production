"use server";

import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";
import { scheduleDefaultReminders } from "@/lib/reminders";
import { PRICING_RULES } from "@/lib/booking-constants";
import type { DeliveryDeadline } from "@prisma/client";

interface ServicesSelected {
  photography: string[];
  video: string[];
  additional: string[];
}

interface Deliverables {
  photos: string[];
  videos: string[];
}

interface PhotoSpec {
  quality: string;
  editingStyle: string;
  colorStyle: string;
}

interface VideoSpec {
  resolution: string;
  frameRate: string;
  orientation: string;
  style: string;
}

interface CreateBookingInput {
  // Basic
  title: string;
  eventType: string;
  serviceType: string;
  packageId?: string;
  // Event details
  location?: string;
  scheduledAt: string;
  endTime?: string;
  guestCount?: number;
  venueType?: string;
  // Client extras
  alternatePhone?: string;
  organization?: string;
  billingAddress?: string;
  // Services & deliverables
  services?: ServicesSelected;
  deliverables?: Deliverables;
  // Specs
  photoSpec?: PhotoSpec;
  videoSpec?: VideoSpec;
  // Crew
  crewPhotographers?: number;
  crewVideographers?: number;
  crewDroneOps?: number;
  crewAssistants?: number;
  // Coverage
  includedHours?: number;
  // Delivery
  deliveryDeadline?: "STANDARD" | "EXPRESS" | "URGENT";
  // Notes
  specialRequests?: string;
  notes?: string;
}

export async function createBookingAction(input: CreateBookingInput) {
  try {
    const user = await requireApprovedUser();

    const scheduledDate = new Date(input.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return { success: false, error: "Invalid date and time format" };
    }

    if (input.packageId) {
      const pkg = await prisma.servicePackage.findUnique({ where: { id: input.packageId } });
      if (!pkg) return { success: false, error: "Selected package not found" };
    }

    // Calculate delivery fee
    const deliveryFeeCents =
      input.deliveryDeadline === "EXPRESS" ? PRICING_RULES.EXPRESS_DELIVERY_CENTS :
      input.deliveryDeadline === "URGENT"  ? PRICING_RULES.URGENT_DELIVERY_CENTS  : 0;

    // Get package base price for quote
    let quoteTotalCents = 0;
    if (input.packageId) {
      const pkg = await prisma.servicePackage.findUnique({ where: { id: input.packageId }, select: { priceCents: true } });
      quoteTotalCents = pkg?.priceCents ?? 0;
    }
    // Add service add-ons
    const services = input.services ?? { photography: [], video: [], additional: [] };
    if (services.additional.includes("drone_photography") || services.video.includes("drone_video")) {
      quoteTotalCents += PRICING_RULES.DRONE_CENTS;
    }
    if (services.additional.includes("live_streaming")) quoteTotalCents += PRICING_RULES.LIVE_STREAM_CENTS;
    if (services.additional.includes("same_day_edit"))  quoteTotalCents += PRICING_RULES.SAME_DAY_EDIT_CENTS;
    if (services.additional.includes("photo_booth"))    quoteTotalCents += PRICING_RULES.PHOTO_BOOTH_CENTS;
    if ((input.crewPhotographers ?? 0) > 1) quoteTotalCents += PRICING_RULES.SECOND_PHOTOGRAPHER_CENTS * ((input.crewPhotographers ?? 1) - 1);
    quoteTotalCents += deliveryFeeCents;

    const booking = await prisma.booking.create({
      data: {
        clientId:      user.id,
        packageId:     input.packageId,
        serviceType:   input.serviceType,
        eventType:     input.eventType,
        title:         input.title,
        location:      input.location,
        scheduledAt:   scheduledDate,
        endTime:       input.endTime ? new Date(input.endTime) : null,
        guestCount:    input.guestCount ?? null,
        venueType:     input.venueType ?? null,
        alternatePhone: input.alternatePhone ?? null,
        organization:  input.organization ?? null,
        billingAddress: input.billingAddress ?? null,
        servicesJson:  services as object,
        deliverablesJson: (input.deliverables ?? { photos: [], videos: [] }) as object,
        photoSpecJson: (input.photoSpec ?? {}) as object,
        videoSpecJson: (input.videoSpec ?? {}) as object,
        crewPhotographers: input.crewPhotographers ?? 0,
        crewVideographers: input.crewVideographers ?? 0,
        crewDroneOps:      input.crewDroneOps ?? 0,
        crewAssistants:    input.crewAssistants ?? 0,
        includedHours:     input.includedHours ?? null,
        overtimeRatePerHour: PRICING_RULES.EXTRA_HOUR_CENTS,
        deliveryDeadline:  (input.deliveryDeadline ?? "STANDARD") as DeliveryDeadline,
        deliveryFeeCents,
        quoteTotalCents,
        depositPercent: 50,
        specialRequests: input.specialRequests ?? null,
        notes:          input.notes ?? null,
        status:         "REQUESTED",
        statusV2:       "INQUIRY",
        paymentStatus:  "UNPAID",
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId:  user.id,
        action:   "BOOKING_CREATED",
        entity:   "Booking",
        entityId: booking.id,
        metadata: { serviceType: input.serviceType, title: input.title, quoteTotalCents },
      },
    });

    await scheduleDefaultReminders(booking.id, user.id, scheduledDate, user.email, user.phone || undefined);

    return { success: true, bookingId: booking.id };
  } catch (error) {
    console.error("Booking creation error:", error);
    return { success: false, error: "Failed to create booking. Please try again." };
  }
}

export async function getClientBookings() {
  try {
    const user = await requireApprovedUser();

    const bookings = await prisma.booking.findMany({
      where: { clientId: user.id },
      include: {
        package: true,
        gallery: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      bookings,
    };
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return {
      success: false,
      error: "Failed to load bookings",
      bookings: [],
    };
  }
}

export async function getBookingById(bookingId: string) {
  try {
    const user = await requireApprovedUser();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        package: true,
        gallery: {
          include: {
            mediaAssets: true,
          },
        },
        payments: true,
      },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found",
        booking: null,
      };
    }

    // Verify ownership
    if (booking.clientId !== user.id) {
      return {
        success: false,
        error: "Unauthorized",
        booking: null,
      };
    }

    return {
      success: true,
      booking,
    };
  } catch (error) {
    console.error("Failed to fetch booking:", error);
    return {
      success: false,
      error: "Failed to load booking details",
      booking: null,
    };
  }
}

export async function createCheckoutSessionAction(bookingId: string) {
  try {
    const user = await requireApprovedUser();
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

    // Verify booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        package: true,
        payments: true,
      },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found",
        url: null,
      };
    }

    if (booking.clientId !== user.id) {
      return {
        success: false,
        error: "Unauthorized",
        url: null,
      };
    }

    // Calculate remaining amount due
    const packagePrice = booking.package?.priceCents || 0;
    const totalPaid = booking.payments.reduce(
      (sum, p) => (p.status === "PAID" ? sum + p.amountCents : sum),
      0
    );
    const amountDue = Math.max(0, packagePrice - totalPaid);

    if (amountDue <= 0) {
      return {
        success: false,
        error: "This booking is already fully paid",
        url: null,
      };
    }

    // Create or get existing checkout session
    const existingPayment = booking.payments.find(
      (p) => p.stripeCheckoutSession && p.status === "UNPAID"
    );

    if (existingPayment && existingPayment.stripeCheckoutSession) {
      try {
        const session = await stripe.checkout.sessions.retrieve(
          existingPayment.stripeCheckoutSession
        );
        if (session.payment_status !== "paid" && session.url) {
          return {
            success: true,
            url: session.url,
          };
        }
      } catch {
        // Session expired or doesn't exist, create a new one
      }
    }

    // Create new payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId,
        amountCents: amountDue,
        currency: "USD",
        status: "UNPAID",
      },
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: booking.title,
              description: `Photography booking for ${new Date(booking.scheduledAt).toLocaleDateString()}`,
            },
            unit_amount: amountDue,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/client/bookings/${bookingId}?payment_success=true`,
      cancel_url: `${baseUrl}/client/bookings/${bookingId}`,
      customer_email: user.email,
      metadata: {
        bookingId,
        paymentId: payment.id,
        userId: user.id,
      },
    });

    // Store the checkout session ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripeCheckoutSession: session.id,
      },
    });

    return {
      success: true,
      url: session.url,
    };
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return {
      success: false,
      error: "Failed to create checkout session. Please try again.",
      url: null,
    };
  }
}
