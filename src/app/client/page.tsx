import Link from "next/link";
import {
  CalendarDays,
  GalleryHorizontalEnd,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { requireApprovedUser } from "@/lib/auth";

const clientCards = [
  {
    icon: CalendarDays,
    title: "Book Appointment",
    text: "Request photography, videography, wedding, event, or production service.",
  },
  {
    icon: GalleryHorizontalEnd,
    title: "Protected Gallery",
    text: "Preview approved work with watermark protection until payment unlock.",
  },
  {
    icon: MessageCircle,
    title: "Messages",
    text: "Receive booking updates, reminders, gallery notices, and delivery messages.",
  },
];

export default async function ClientPage() {
  const user = await requireApprovedUser();

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
              Client portal
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              Welcome, {user.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-400">
              Your account is approved for private Muzuka Gilbert access.
            </p>
          </div>
          <form action={logoutAction}>
            <button className="h-11 rounded-lg border border-white/10 px-4 text-sm text-zinc-200 hover:bg-white/5">
              Sign out
            </button>
          </form>
        </header>

        <div className="mt-6 rounded-lg border border-[var(--gold)]/25 bg-[var(--deep-red)]/20 p-5">
          <div className="flex gap-3">
            <LockKeyhole className="mt-1 h-5 w-5 shrink-0 text-[var(--gold)]" />
            <p className="text-sm leading-6 text-zinc-200">
              Protected galleries are private by default. Preview media is
              watermarked, downloads stay locked until payment, and final files
              use expiring secure delivery.
            </p>
          </div>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {clientCards.map((card) => (
            <article
              className="rounded-lg border border-white/10 bg-[var(--surface)] p-5"
              key={card.title}
            >
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-[var(--gold)] text-black">
                <card.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-lg font-semibold">{card.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{card.text}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-lg border border-white/10 bg-[var(--surface)] p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--gold)]" />
            <div>
              <h2 className="text-lg font-semibold">MVP pages coming next</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Booking forms and gallery pages will connect here after the auth
                foundation is migrated to the database.
              </p>
              <Link
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--gold)] px-4 text-sm font-semibold text-black"
                href="/"
              >
                View project shell
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
