"use server";

import type { BookingStatus, PaymentStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export interface GetAllBookingsInput {
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  limit?: number;
  offset?: number;
}

export async function getAllBookings(input: GetAllBookingsInput = {}) {
  try {
    await requireAdmin();

    const where: {
      status?: BookingStatus;
      paymentStatus?: PaymentStatus;
    } = {};
    if (input.status) where.status = input.status;
    if (input.paymentStatus) where.paymentStatus = input.paymentStatus;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          package: true,
          gallery: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit || 50,
        skip: input.offset || 0,
      }),
      prisma.booking.count({ where }),
    ]);

    return {
      success: true,
      bookings,
      total,
    };
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return {
      success: false,
      error: "Failed to load bookings",
      bookings: [],
      total: 0,
    };
  }
}

const validBookingStatuses: BookingStatus[] = [
  "REQUESTED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

function isBookingStatus(value: string): value is BookingStatus {
  return validBookingStatuses.includes(value as BookingStatus);
}

export async function updateBookingStatusAction(bookingId: string, newStatus: string) {
  try {
    const admin = await requireAdmin();

    if (!isBookingStatus(newStatus)) {
      return {
        success: false,
        error: "Invalid booking status",
      };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found",
      };
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: newStatus,
      },
      include: {
        client: true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "BOOKING_UPDATED",
        entity: "Booking",
        entityId: bookingId,
        metadata: {
          oldStatus: booking.status,
          newStatus,
        },
      },
    });

    return {
      success: true,
      booking: updatedBooking,
    };
  } catch (error) {
    console.error("Failed to update booking:", error);
    return {
      success: false,
      error: "Failed to update booking",
    };
  }
}

export async function getBookingStats() {
  try {
    await requireAdmin();

    const [total, requested, confirmed, completed, paid, unpaid] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "REQUESTED" } }),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.booking.count({ where: { paymentStatus: "PAID" } }),
      prisma.booking.count({ where: { paymentStatus: "UNPAID" } }),
    ]);

    return {
      success: true,
      stats: {
        total,
        requested,
        confirmed,
        completed,
        paid,
        unpaid,
      },
    };
  } catch (error) {
    console.error("Failed to fetch stats:", error);
    return {
      success: false,
      error: "Failed to load stats",
      stats: {
        total: 0,
        requested: 0,
        confirmed: 0,
        completed: 0,
        paid: 0,
        unpaid: 0,
      },
    };
  }
}
