"use server";

import { requireUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Lazy load Twilio to avoid initialization errors during build
function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  const twilio = require("twilio");
  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

interface ScheduleReminderInput {
  bookingId: string;
  channel: "email" | "sms";
  scheduledAt: Date;
}

export async function scheduleReminderAction(input: ScheduleReminderInput) {
  try {
    const user = await requireUser();

    // Verify booking exists
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: {
        client: true,
        package: true,
      },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found",
      };
    }

    // Only allow client or admin to schedule reminders for this booking
    if (user.id !== booking.clientId && user.role !== "ADMIN") {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Validate channel
    if (!["email", "sms"].includes(input.channel)) {
      return {
        success: false,
        error: "Invalid channel",
      };
    }

    // Validate scheduled time is in the future
    if (input.scheduledAt <= new Date()) {
      return {
        success: false,
        error: "Scheduled time must be in the future",
      };
    }

    // Create reminder record
    const reminder = await prisma.bookingReminder.create({
      data: {
        bookingId: input.bookingId,
        channel: input.channel,
        scheduledAt: input.scheduledAt,
      },
    });

    return {
      success: true,
      reminderId: reminder.id,
    };
  } catch (error) {
    console.error("Schedule reminder error:", error);
    return {
      success: false,
      error: "Failed to schedule reminder",
    };
  }
}

export async function getBookingReminders(bookingId: string) {
  try {
    const user = await requireUser();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return {
        success: false,
        error: "Booking not found",
        reminders: [],
      };
    }

    // Only allow client or admin to view reminders
    if (user.id !== booking.clientId && user.role !== "ADMIN") {
      return {
        success: false,
        error: "Unauthorized",
        reminders: [],
      };
    }

    const reminders = await prisma.bookingReminder.findMany({
      where: { bookingId },
      orderBy: { scheduledAt: "asc" },
    });

    return {
      success: true,
      reminders,
    };
  } catch (error) {
    console.error("Get reminders error:", error);
    return {
      success: false,
      error: "Failed to fetch reminders",
      reminders: [],
    };
  }
}

export async function deleteReminderAction(reminderId: string) {
  try {
    const user = await requireUser();

    const reminder = await prisma.bookingReminder.findUnique({
      where: { id: reminderId },
      include: {
        booking: true,
      },
    });

    if (!reminder) {
      return {
        success: false,
        error: "Reminder not found",
      };
    }

    // Only allow client or admin
    if (
      user.id !== reminder.booking.clientId &&
      user.role !== "ADMIN"
    ) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    await prisma.bookingReminder.delete({
      where: { id: reminderId },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Delete reminder error:", error);
    return {
      success: false,
      error: "Failed to delete reminder",
    };
  }
}

export async function sendReminderAction(reminderId: string) {
  try {
    const reminder = await prisma.bookingReminder.findUnique({
      where: { id: reminderId },
      include: {
        booking: {
          include: {
            client: true,
            package: true,
            gallery: true,
          },
        },
      },
    });

    if (!reminder) {
      return {
        success: false,
        error: "Reminder not found",
      };
    }

    if (reminder.sentAt) {
      return {
        success: false,
        error: "Reminder already sent",
      };
    }

    const booking = reminder.booking;
    const scheduledDate = new Date(booking.scheduledAt);

    if (reminder.channel === "email") {
      if (!booking.client.email) {
        return {
          success: false,
          error: "Client email not found",
        };
      }

      const emailResult = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@muzuka.com",
        to: booking.client.email,
        subject: `Reminder: Your ${booking.serviceType} booking is coming up`,
        html: generateEmailTemplate(booking, scheduledDate),
      });

      if (emailResult.error) {
        return {
          success: false,
          error: `Failed to send email: ${emailResult.error.message}`,
        };
      }
    } else if (reminder.channel === "sms") {
      if (!booking.client.phone) {
        return {
          success: false,
          error: "Client phone number not found",
        };
      }

      const message = generateSmsTemplate(booking, scheduledDate);
      const twilioClient = getTwilioClient();

      if (!twilioClient) {
        return {
          success: false,
          error: "SMS service not configured",
        };
      }

      try {
        await twilioClient.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: booking.client.phone,
        });
      } catch (error) {
        return {
          success: false,
          error: `Failed to send SMS: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }

    // Mark as sent
    await prisma.bookingReminder.update({
      where: { id: reminderId },
      data: { sentAt: new Date() },
    });

    // Log action
    await prisma.auditLog.create({
      data: {
        action: "BOOKING_CREATED",
        entity: "BookingReminder",
        entityId: reminderId,
        metadata: {
          bookingId: booking.id,
          channel: reminder.channel,
          clientEmail: booking.client.email,
        },
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Send reminder error:", error);
    return {
      success: false,
      error: `Failed to send reminder: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

function generateEmailTemplate(
  booking: any,
  scheduledDate: Date
): string {
  const formattedDate = scheduledDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: #ffd700; padding: 30px; text-align: center; border-radius: 8px; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f5f5f5; padding: 30px; margin-top: 20px; border-radius: 8px; }
    .detail { margin: 15px 0; }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; }
    .button { display: inline-block; background: #ffd700; color: #1a1a1a; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
    .footer { text-align: center; color: #999; margin-top: 30px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>[MG] Muzuka Gilbert</h1>
      <p>Event Reminder</p>
    </div>
    
    <div class="content">
      <p>Hello ${booking.client.name},</p>
      
      <p>This is a friendly reminder about your upcoming ${booking.serviceType} booking with Muzuka Gilbert.</p>
      
      <div class="detail">
        <span class="label">Event:</span>
        <span class="value">${booking.title}</span>
      </div>
      
      <div class="detail">
        <span class="label">Date & Time:</span>
        <span class="value">${formattedDate} at ${formattedTime}</span>
      </div>
      
      ${booking.location ? `
      <div class="detail">
        <span class="label">Location:</span>
        <span class="value">${booking.location}</span>
      </div>
      ` : ""}
      
      ${booking.package ? `
      <div class="detail">
        <span class="label">Package:</span>
        <span class="value">${booking.package.name}</span>
      </div>
      ` : ""}
      
      ${booking.gallery ? `
      <p>You'll be able to view and download your photos and videos from your private gallery immediately after the session.</p>
      ` : ""}
      
      <p>If you need to reschedule or have any questions, please don't hesitate to reach out.</p>
      
      <p>We look forward to creating your masterpiece!</p>
      
      <p style="margin-top: 30px;">
        <strong>Muzuka Gilbert</strong><br>
        Luxury Photography & Videography
      </p>
    </div>
    
    <div class="footer">
      <p>This is an automated reminder from Muzuka Gilbert. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `;
}

function generateSmsTemplate(booking: any, scheduledDate: Date): string {
  const formattedDate = scheduledDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `Hi ${booking.client.name}, reminder: Your ${booking.serviceType} booking with Muzuka Gilbert is on ${formattedDate} at ${formattedTime}. See you soon! [MG]`;
}
