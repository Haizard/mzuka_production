"use server";

import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

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
