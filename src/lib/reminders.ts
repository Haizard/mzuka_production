import { prisma } from "@/lib/db";

/**
 * Automatically schedule reminders for a booking
 * Creates reminders 7 days before and 1 day before the event
 */
export async function scheduleDefaultReminders(
  bookingId: string,
  clientId: string,
  scheduledAt: Date,
  clientEmail?: string,
  clientPhone?: string
): Promise<{ success: boolean; reminders?: string[] }> {
  try {
    const now = new Date();
    const reminders: string[] = [];

    // 7 days before (email)
    const sevenDaysBefore = new Date(scheduledAt);
    sevenDaysBefore.setDate(sevenDaysBefore.getDate() - 7);

    if (sevenDaysBefore > now) {
      const reminder7d = await prisma.bookingReminder.create({
        data: {
          bookingId,
          channel: "email",
          scheduledAt: sevenDaysBefore,
        },
      });
      reminders.push(reminder7d.id);
    }

    // 1 day before (SMS if phone exists, otherwise email)
    const oneDayBefore = new Date(scheduledAt);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    if (oneDayBefore > now) {
      const channel = clientPhone ? "sms" : "email";
      const reminder1d = await prisma.bookingReminder.create({
        data: {
          bookingId,
          channel,
          scheduledAt: oneDayBefore,
        },
      });
      reminders.push(reminder1d.id);
    }

    // 30 minutes before (email)
    const thirtyMinutesBefore = new Date(scheduledAt);
    thirtyMinutesBefore.setMinutes(thirtyMinutesBefore.getMinutes() - 30);

    if (thirtyMinutesBefore > now) {
      const reminder30m = await prisma.bookingReminder.create({
        data: {
          bookingId,
          channel: "email",
          scheduledAt: thirtyMinutesBefore,
        },
      });
      reminders.push(reminder30m.id);
    }

    return {
      success: true,
      reminders,
    };
  } catch (error) {
    console.error("Error scheduling default reminders:", error);
    return {
      success: false,
    };
  }
}

/**
 * Get all pending reminders that should be sent
 * Returns reminders that:
 * - Have scheduledAt in the past
 * - Have not been sent yet (sentAt is null)
 */
export async function getPendingReminders() {
  try {
    const now = new Date();
    const reminders = await prisma.bookingReminder.findMany({
      where: {
        scheduledAt: {
          lte: now,
        },
        sentAt: null,
      },
      include: {
        booking: {
          include: {
            client: true,
            package: true,
            gallery: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
      take: 50, // Process up to 50 at a time
    });

    return reminders;
  } catch (error) {
    console.error("Error getting pending reminders:", error);
    return [];
  }
}

/**
 * Cleanup old sent reminders (older than 30 days)
 */
export async function cleanupOldReminders() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.bookingReminder.deleteMany({
      where: {
        sentAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    console.log(`Cleaned up ${result.count} old reminders`);
    return { success: true, count: result.count };
  } catch (error) {
    console.error("Error cleaning up old reminders:", error);
    return { success: false };
  }
}
