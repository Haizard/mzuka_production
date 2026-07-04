import Link from "next/link";
import { MessageCircle, Mail, Smartphone, Bell, ArrowLeft, Clock } from "lucide-react";
import { requireApprovedUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const channelIcon = (channel: string) => {
  if (channel === "email") return <Mail className="h-4 w-4" />;
  if (channel === "sms") return <Smartphone className="h-4 w-4" />;
  return <Bell className="h-4 w-4" />;
};

const channelLabel = (channel: string) => {
  if (channel === "email") return "Email";
  if (channel === "sms") return "SMS";
  return "In-App";
};

function timeAgo(date: Date) {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default async function MessagesPage() {
  const user = await requireApprovedUser();

  const messages = await prisma.message.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-dvh bg-[var(--background)] text-white pb-24 lg:pb-8">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-6">
          <Link href="/client" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition mb-4 lg:flex hidden">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/15 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-[var(--gold)]" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--gold)]">Inbox</p>
              <h1 className="text-2xl font-bold leading-tight">Messages</h1>
            </div>
          </div>
        </header>

        {messages.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[var(--surface)] p-10 text-center">
            <MessageCircle className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-400 text-sm">No messages yet</p>
            <p className="text-zinc-600 text-xs mt-1">
              Updates from your studio will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-2xl border border-white/10 bg-[var(--surface)] p-4 hover:border-white/20 transition"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      msg.channel === "email"
                        ? "bg-blue-500/15 text-blue-400"
                        : msg.channel === "sms"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-[var(--gold)]/15 text-[var(--gold)]"
                    }`}>
                      {channelIcon(msg.channel)}
                      {channelLabel(msg.channel)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-600 shrink-0">
                    <Clock className="h-3 w-3" />
                    {timeAgo(msg.sentAt ?? msg.createdAt)}
                  </div>
                </div>

                {/* Subject */}
                <p className="font-semibold text-sm text-white mb-1 truncate">
                  {msg.subject}
                </p>

                {/* Body */}
                <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">
                  {msg.body}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Info note */}
        <p className="mt-6 text-center text-xs text-zinc-600">
          Messages are sent by your studio team. Reply via email or contact us directly.
        </p>
      </div>
    </main>
  );
}
