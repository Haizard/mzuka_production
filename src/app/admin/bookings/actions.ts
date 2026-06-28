"use server";

import type { BookingStatus, PaymentStatus, BookingStatusV2 } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendBookingConfirmedMessage } from "@/lib/messages";

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


const BOOKING_STATUS_V2_VALUES = [
  "INQUIRY","QUOTATION_SENT","AWAITING_DEPOSIT","CONFIRMED","CREW_ASSIGNED",
  "EQUIPMENT_PREPARED","EVENT_DAY","MEDIA_UPLOADING","EDITING","QUALITY_REVIEW",
  "READY_FOR_DELIVERY","CUSTOMER_NOTIFIED","DELIVERED","COMPLETED","ARCHIVED","CANCELLED",
] as const;

export async function updateBookingPipelineAction(bookingId: string, statusV2: string) {
  try {
    const admin = await requireAdmin();

    if (!BOOKING_STATUS_V2_VALUES.includes(statusV2 as BookingStatusV2)) {
      return { success: false, error: "Invalid pipeline status" };
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { statusV2: statusV2 as BookingStatusV2 },
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id, action: "BOOKING_UPDATED",
        entity: "Booking", entityId: bookingId,
        metadata: { statusV2 },
      },
    });

    return { success: true, booking: updated };
  } catch (error) {
    console.error("Failed to update pipeline:", error);
    return { success: false, error: "Failed to update pipeline status" };
  }
}

export async function updateBookingQuoteAction(bookingId: string, data: {
  quoteTotalCents?: number; depositPercent?: number; internalNotes?: string;
}) {
  try {
    await requireAdmin();
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        ...(data.quoteTotalCents  !== undefined ? { quoteTotalCents:  data.quoteTotalCents  } : {}),
        ...(data.depositPercent   !== undefined ? { depositPercent:   data.depositPercent   } : {}),
        ...(data.internalNotes    !== undefined ? { internalNotes:    data.internalNotes    } : {}),
      },
    });
    return { success: true, booking: updated };
  } catch (error) {
    console.error("Failed to update quote:", error);
    return { success: false, error: "Failed to update" };
  }
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
      data: { status: newStatus },
      include: { client: true, package: true },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "BOOKING_UPDATED",
        entity: "Booking",
        entityId: bookingId,
        metadata: { oldStatus: booking.status, newStatus },
      },
    });

    // Send confirmation message when status moves to CONFIRMED
    if (newStatus === "CONFIRMED") {
      sendBookingConfirmedMessage({
        userId: updatedBooking.client.id,
        userName: updatedBooking.client.name,
        userEmail: updatedBooking.client.email,
        userPhone: updatedBooking.client.phone,
        bookingTitle: updatedBooking.title,
        serviceType: updatedBooking.serviceType,
        scheduledAt: updatedBooking.scheduledAt,
        location: updatedBooking.location,
        packageName: updatedBooking.package?.name,
      }).catch((err) => console.error("[messages] booking-confirmed send failed:", err));
    }

    return { success: true, booking: updatedBooking };
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
