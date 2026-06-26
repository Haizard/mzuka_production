"use client";

import { useState } from "react";
import { Bell, Trash2, Plus, Clock } from "lucide-react";
import { scheduleReminderAction, getBookingReminders, deleteReminderAction } from "@/app/admin/reminders/actions";

interface BookingRemindersProps {
  bookingId: string;
  clientEmail: string;
  clientPhone?: string;
}

export function BookingReminders({
  bookingId,
  clientEmail,
  clientPhone,
}: BookingRemindersProps) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadReminders = async () => {
    setLoading(true);
    const result = await getBookingReminders(bookingId);
    if (result.success) {
      setReminders(result.reminders);
    }
    setLoading(false);
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!scheduledAt) {
      setError("Please select a date and time");
      return;
    }

    if (channel === "sms" && !clientPhone) {
      setError("Client phone number not available for SMS");
      return;
    }

    setLoading(true);
    const result = await scheduleReminderAction({
      bookingId,
      channel,
      scheduledAt: new Date(scheduledAt),
    });

    if (result.success) {
      setSuccess("Reminder scheduled successfully");
      setScheduledAt("");
      await loadReminders();
    } else {
      setError(result.error || "Failed to schedule reminder");
    }
    setLoading(false);
  };

  const handleDelete = async (reminderId: string) => {
    if (!confirm("Delete this reminder?")) return;

    setLoading(true);
    const result = await deleteReminderAction(reminderId);
    if (result.success) {
      setSuccess("Reminder deleted");
      await loadReminders();
    } else {
      setError(result.error || "Failed to delete reminder");
    }
    setLoading(false);
  };

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[var(--gold)]" />
          <h3 className="font-semibold text-white">Booking Reminders</h3>
        </div>
        <button
          onClick={loadReminders}
          disabled={loading}
          className="text-xs text-zinc-400 hover:text-white transition disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-200">
          {success}
        </div>
      )}

      {/* Schedule New Reminder */}
      <form onSubmit={handleSchedule} className="mb-6 p-4 bg-black/30 rounded-lg border border-white/5">
        <div className="grid gap-4">
          <div>
            <label className="block text-xs text-zinc-400 uppercase mb-2">
              Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as "email" | "sms")}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--gold)]"
            >
              <option value="email">Email</option>
              {clientPhone && <option value="sms">SMS</option>}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 uppercase mb-2">
              Scheduled Time
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--gold)]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-black hover:bg-yellow-500 transition disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Schedule Reminder
          </button>
        </div>
      </form>

      {/* Reminders List */}
      <div className="space-y-2">
        {reminders.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">
            No reminders scheduled. Create one above.
          </p>
        ) : (
          reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/5"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-[var(--gold)] flex-shrink-0" />
                <div>
                  <p className="text-sm text-white capitalize">
                    {reminder.channel} reminder
                  </p>
                  <p className="text-xs text-zinc-400">
                    {formatDateTime(reminder.scheduledAt)}
                  </p>
                  {reminder.sentAt && (
                    <p className="text-xs text-emerald-400">
                      ✓ Sent at {formatDateTime(reminder.sentAt)}
                    </p>
                  )}
                </div>
              </div>

              {!reminder.sentAt && (
                <button
                  onClick={() => handleDelete(reminder.id)}
                  disabled={loading}
                  className="p-1.5 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition disabled:opacity-50"
                  title="Delete reminder"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
