"use server";

import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Stripe from "stripe";
import { scheduleDefaultReminders } from "@/lib/reminders";

interface CreateBookingInput {
  serviceType: string;
  packageId?: string;
  title: string;
  location?: string;
  scheduledAt: string;
  notes?: string;
}

export async function createBookingAction(input: CreateBookingInput) {
  try {
    const user = await requireApprovedUser();

    // Validate date
    const scheduledDate = new Date(input.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return {
        success: false,
        error: "Invalid date and time format",
      };
    }

    // Validate the package exists if provided
    if (input.packageId) {
      const pkg = await prisma.servicePackage.findUnique({
        where: { id: input.packageId },
      });
      if (!pkg) {
        return {
          success: false,
          error: "Selected package not found",
        };
      }
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        clientId: user.id,
        packageId: input.packageId,
        serviceType: input.serviceType,
        title: input.title,
        location: input.location,
        scheduledAt: scheduledDate,
        notes: input.notes,
        status: "REQUESTED",
        paymentStatus: "UNPAID",
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: "BOOKING_CREATED",
        entity: "Booking",
        entityId: booking.id,
        metadata: {
          serviceType: input.serviceType,
          title: input.title,
        },
      },
    });

    // Schedule default reminders (7 days, 1 day, 30 minutes before)
    await scheduleDefaultReminders(
      booking.id,
      user.id,
      scheduledDate,
      user.email,
      user.phone || undefined
    );

    return {
      success: true,
      bookingId: booking.id,
    };
  } catch (error) {
    console.error("Booking creation error:", error);
    return {
      success: false,
      error: "Failed to create booking. Please try again.",
    };
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
    let existingPayment = booking.payments.find(
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
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/client/bookings/${bookingId}?payment_success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/client/bookings/${bookingId}`,
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
