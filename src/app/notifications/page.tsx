"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell, BellOff, Check, CheckCheck, Trash2, Filter,
  CalendarDays, DollarSign, GalleryHorizontalEnd, Clock,
  MessageCircle, Settings, Loader2, ArrowLeft,
} from "lucide-react";
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
  deleteNotification, getNotificationPreferences, updateNotificationPreferences,
} from "./actions";

interface InAppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

interface NotifPrefs {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;
  typeOverrides: Record<string, boolean> | null;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; colour: string }> = {
  booking_confirmed: { icon: CalendarDays, colour: "text-emerald-400" },
  payment_received:  { icon: DollarSign,  colour: "text-emerald-400" },
  gallery_ready:     { icon: GalleryHorizontalEnd, colour: "text-[var(--gold)]" },
  gallery_expiring:  { icon: Clock,       colour: "text-amber-400" },
  event_reminder:    { icon: Bell,        colour: "text-blue-400" },
  payment_due:       { icon: DollarSign,  colour: "text-amber-400" },
  deposit_due:       { icon: DollarSign,  colour: "text-amber-400" },
  review_request:    { icon: MessageCircle, colour: "text-violet-400" },
  system:            { icon: Bell,        colour: "text-zinc-400" },
};

function getIcon(type: string) {
  return TYPE_CONFIG[type]?.icon ?? Bell;
}
function getColour(type: string) {
  return TYPE_CONFIG[type]?.colour ?? "text-zinc-400";
}
function timeAgo(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [showPrefs, setShowPrefs] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getNotifications({
      unreadOnly: filter === "unread",
      limit: 50,
    });
    if (data.success) {
      setNotifications(data.notifications as InAppNotification[]);
      setUnreadCount(data.unreadCount);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    setUnreadCount(0);
    flash("All notifications marked as read");
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    flash("Notification deleted");
  };

  const loadPrefs = async () => {
    setPrefsLoading(true);
    const data = await getNotificationPreferences();
    if (data.success && data.preferences) {
      setPrefs(data.preferences as unknown as NotifPrefs);
    }
    setPrefsLoading(false);
  };

  const handleTogglePref = async (field: keyof NotifPrefs, value: boolean) => {
    if (!prefs) return;
    const updated = { ...prefs, [field]: value };
    setPrefs(updated);
    await updateNotificationPreferences({ [field]: value });
    flash("Preferences updated");
  };

  return (
    <main className="min-h-dvh bg-[var(--background)] text-white">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/client" className="p-2 rounded-lg hover:bg-white/10 transition text-zinc-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Bell className="h-6 w-6 text-[var(--gold)]" />
                Notifications
                {unreadCount > 0 && (
                  <span className="text-sm font-normal text-zinc-400">({unreadCount} unread)</span>
                )}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
            <button
              onClick={() => { setShowPrefs(!showPrefs); if (!prefs) loadPrefs(); }}
              className={`p-2 rounded-lg border transition ${showPrefs ? "border-[var(--gold)]/40 bg-[var(--gold)]/10 text-[var(--gold)]" : "border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"}`}
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {successMsg && (
          <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 flex items-center gap-2 text-sm text-emerald-300">
            <Check className="h-4 w-4 shrink-0" /> {successMsg}
          </div>
        )}

        {/* Notification Preferences */}
        {showPrefs && (
          <div className="mb-6 rounded-xl border border-[var(--gold)]/20 bg-[var(--surface)] p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Settings className="h-4 w-4 text-[var(--gold)]" /> Notification Channels
            </h3>
            {prefsLoading ? (
              <div className="flex items-center gap-2 text-zinc-500 text-sm py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading preferences…
              </div>
            ) : prefs && (
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: "emailEnabled" as const, label: "Email", desc: "Receive via email" },
                  { key: "smsEnabled" as const, label: "SMS", desc: "Text message alerts" },
                  { key: "whatsappEnabled" as const, label: "WhatsApp", desc: "WhatsApp messages" },
                  { key: "pushEnabled" as const, label: "Push", desc: "In-app notifications" },
                ]).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                    <div>
                      <p className="text-sm font-medium text-white">{label}</p>
                      <p className="text-[10px] text-zinc-500">{desc}</p>
                    </div>
                    <button
                      onClick={() => handleTogglePref(key, !prefs[key])}
                      className={`relative w-11 h-6 rounded-full transition-colors ${prefs[key] ? "bg-emerald-500" : "bg-zinc-700"}`}
                    >
                      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${prefs[key] ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition ${
                filter === f ? "bg-white/15 text-white border-white/20" : "border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              {f === "all" ? "All" : "Unread"}
              {f === "unread" && unreadCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-12 text-center text-zinc-500">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" /> Loading…
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-12 text-center text-zinc-500">
            <BellOff className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">{filter === "unread" ? "No unread notifications" : "No notifications yet"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => {
              const isUnread = !n.readAt;
              const Icon = getIcon(n.type);
              const colour = getColour(n.type);              return (
                <div
                  key={n.id}
                  className={`rounded-xl border transition group ${
                    isUnread ? "border-[var(--gold)]/20 bg-[var(--gold)]/5" : "border-white/10 bg-[var(--surface)]"
                  }`}
                >
                  <div className="flex items-start gap-3 p-4">
                    {/* Unread dot + icon */}
                    <div className="relative shrink-0">
                      {isUnread && <span className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-[var(--gold)]" />}
                      <div className={`w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center`}>
                        <Icon className={`h-4 w-4 ${colour}`} />
                      </div>
                    </div>

                    {/* Content */}
                    {n.link ? (
                      <Link href={n.link} className="flex-1 min-w-0">
                      <p className={`text-sm ${isUnread ? "font-semibold text-white" : "text-zinc-300"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-zinc-600 mt-1">{timeAgo(n.createdAt)}</p>
                      </Link>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isUnread ? "font-semibold text-white" : "text-zinc-300"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-zinc-600 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
                      {isUnread && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
                          title="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
