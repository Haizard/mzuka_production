import { getPendingReminders, cleanupOldReminders } from "@/lib/reminders";
import { sendReminderAction } from "@/app/admin/reminders/actions";

/**
 * Process pending reminders
 * This endpoint should be called by a cron job service (like Vercel Cron or external cron job)
 * 
 * Example: curl -X POST https://your-app.com/api/cron/process-reminders -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: Request) {
  // Verify the request has the correct authorization header
  const authHeader = request.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Get pending reminders
    const pendingReminders = await getPendingReminders();

    if (pendingReminders.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending reminders to process",
          processed: 0,
        }),
        { status: 200 }
      );
    }

    // Process each reminder
    const results = await Promise.allSettled(
      pendingReminders.map((reminder) => sendReminderAction(reminder.id))
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - successful;

    // Cleanup old reminders
    await cleanupOldReminders();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${successful} reminders, ${failed} failed`,
        processed: successful,
        failed,
        total: results.length,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Reminder processing error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}
