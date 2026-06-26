import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  Aperture,
  BarChart3,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Crown,
  Download,
  FileCheck2,
  GalleryHorizontalEnd,
  Home as HomeIcon,
  ImageUp,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UserCheck,
  WalletCards,
} from "lucide-react";

const clientNav = [
  { label: "Home", icon: HomeIcon },
  { label: "Book", icon: CalendarDays },
  { label: "Gallery", icon: GalleryHorizontalEnd },
  { label: "Messages", icon: MessageCircle },
  { label: "Profile", icon: UserCheck },
];

const adminNav = [
  { label: "Dashboard", icon: BarChart3 },
  { label: "Bookings", icon: CalendarDays },
  { label: "Clients", icon: UserCheck },
  { label: "Gallery", icon: ImageUp },
  { label: "Payments", icon: WalletCards },
  { label: "Security", icon: ShieldCheck },
];

const mvpFlow = [
  "Private client login",
  "Admin approval",
  "Booking and reminders",
  "Watermarked preview",
  "Stripe unlock",
  "6K/8K delivery",
];

const buildStatus = [
  { label: "Next.js scaffold", state: "Done" },
  { label: "Luxury app shell", state: "Done" },
  { label: "Postgres schema draft", state: "Done" },
  { label: "Auth implementation", state: "Next" },
  { label: "Booking workflow", state: "Next" },
  { label: "Protected gallery", state: "Next" },
];

const scoreRows = [
  ["Sharpness", "96%"],
  ["Lighting", "92%"],
  ["Face quality", "98%"],
  ["Composition", "94%"],
  ["Emotion", "95%"],
];

export default function Home() {
  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <div className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <BrandMark />
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--gold)]/35 bg-white/5 text-[var(--gold)]">
            <Crown className="h-4 w-4" />
            <span className="sr-only">Founder controls</span>
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1560px]">
        <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 border-r border-white/10 bg-black/55 p-5 backdrop-blur-xl lg:block">
          <BrandMark />
          <nav className="mt-10 space-y-2">
            {adminNav.map((item, index) => (
              <a
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition ${
                  index === 0
                    ? "bg-[var(--gold)] text-black"
                    : "text-zinc-300 hover:bg-white/7 hover:text-white"
                }`}
                href="#dashboard"
                key={item.label}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-10 rounded-lg border border-[var(--gold)]/25 bg-[var(--deep-red)]/25 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
              Core rule
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-200">
              Only Muzuka Gilbert controls who can view, download, share, or
              receive final media.
            </p>
          </div>
        </aside>

        <section className="w-full px-4 pb-28 pt-20 sm:px-6 lg:px-8 lg:py-8">
          <header className="hidden items-center justify-between lg:flex">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[var(--gold)]">
                Founder command center
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-white">
                Muzuka Gilbert
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-zinc-200"
                href="/login"
              >
                <LockKeyhole className="h-4 w-4 text-[var(--gold)]" />
                Sign in
              </Link>
              <Link
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--gold)] px-4 text-sm font-semibold text-black"
                href="/register"
              >
                <CalendarDays className="h-4 w-4" />
                Request access
              </Link>
            </div>
          </header>

          <section className="grid gap-5 lg:mt-8 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="overflow-hidden rounded-lg border border-white/10 bg-[var(--surface)] shadow-2xl shadow-black/35">
              <div className="relative min-h-[560px] p-5 sm:p-8">
                <Image
                  alt="Muzuka Gilbert luxury photography concept"
                  className="absolute inset-0 h-full w-full object-cover opacity-35"
                  fill
                  priority
                  src="/brand/muzuka-primary-concept.jpeg"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/80 to-black" />
                <div className="relative z-10 flex min-h-[500px] flex-col justify-between">
                  <div className="max-w-2xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--gold)]/35 bg-black/50 px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--gold)]">
                      <Crown className="h-4 w-4" />
                      Luxury protected gallery MVP
                    </div>
                    <h2 className="mt-6 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
                      Private booking. Protected delivery. Cinematic control.
                    </h2>
                    <p className="mt-5 max-w-xl text-base leading-8 text-zinc-200 sm:text-lg">
                      &ldquo;We don&apos;t just take pictures. We create
                      masterpieces that tell your story.&rdquo;
                    </p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:hidden">
                      <Link
                        className="inline-flex h-12 items-center justify-center rounded-lg bg-[var(--gold)] px-5 text-sm font-semibold text-black"
                        href="/register"
                      >
                        Request access
                      </Link>
                      <Link
                        className="inline-flex h-12 items-center justify-center rounded-lg border border-white/10 bg-black/45 px-5 text-sm font-medium text-white"
                        href="/login"
                      >
                        Sign in
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["Admin approval", UserCheck],
                      ["Watermarked previews", ShieldCheck],
                      ["Payment unlock", Download],
                    ].map(([label, Icon]) => (
                      <div
                        className="rounded-lg border border-white/10 bg-black/55 p-4 backdrop-blur"
                        key={label as string}
                      >
                        <Icon className="h-5 w-5 text-[var(--gold)]" />
                        <p className="mt-3 text-sm font-medium text-white">
                          {label as string}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5">
              <Panel title="MVP Build Path" eyebrow="Phase 0 to Phase 1">
                <div className="space-y-3">
                  {mvpFlow.map((item, index) => (
                    <div
                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3"
                      key={item}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-sm font-bold text-black">
                        {index + 1}
                      </div>
                      <span className="text-sm text-zinc-200">{item}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="AI Photo Analyzer" eyebrow="Quality gate">
                <div className="flex items-center gap-5">
                  <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-4 border-[var(--gold)] bg-black text-center">
                    <div>
                      <p className="text-3xl font-semibold text-white">95%</p>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">
                        score
                      </p>
                    </div>
                  </div>
                  <div className="w-full space-y-2">
                    {scoreRows.map(([label, value]) => (
                      <div className="flex items-center justify-between" key={label}>
                        <span className="text-sm text-zinc-400">{label}</span>
                        <span className="text-sm font-medium text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            </div>
          </section>

          <section
            className="mt-5 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]"
            id="dashboard"
          >
            <Panel title="Protected Gallery Rules" eyebrow="Security model">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Before payment", "Watermark, no download, no share, low quality preview"],
                  ["After payment", "Signed full-quality 6K/8K downloads are unlocked"],
                  ["Access", "Verified account, admin approval, expiring links"],
                  ["Audit", "Device, IP, gallery views, downloads, release decisions"],
                ].map(([title, text]) => (
                  <div
                    className="rounded-lg border border-white/10 bg-black/35 p-4"
                    key={title}
                  >
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Current Build Status" eyebrow="Agent pilot">
              <div className="grid gap-3 sm:grid-cols-2">
                {buildStatus.map((item) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] p-3"
                    key={item.label}
                  >
                    <div className="flex items-center gap-3">
                      {item.state === "Done" ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-[var(--gold)]" />
                      )}
                      <span className="text-sm text-zinc-200">{item.label}</span>
                    </div>
                    <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-zinc-400">
                      {item.state}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-3">
            <FeatureCard
              icon={Camera}
              title="Client App"
              text="Book services, view events, receive messages, and access approved galleries."
            />
            <FeatureCard
              icon={Aperture}
              title="Admin Studio"
              text="Approve clients, manage bookings, upload galleries, track payments, and release files."
            />
            <FeatureCard
              icon={FileCheck2}
              title="Founder Control"
              text="Control viewing, downloading, sharing, screenshot policy, expiry, and final delivery."
            />
          </section>
        </section>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/85 backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid h-20 max-w-xl grid-cols-5 px-2">
          {clientNav.map((item, index) => (
            <a
              className={`flex flex-col items-center justify-center gap-1 text-[11px] ${
                index === 0 ? "text-[var(--gold)]" : "text-zinc-500"
              }`}
              href="#dashboard"
              key={item.label}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </main>
  );
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-12 w-12 place-items-center rounded-lg border border-[var(--gold)]/40 bg-black text-[var(--gold)] shadow-lg shadow-[var(--gold)]/10">
        <Crown className="h-5 w-5" />
      </div>
      <div>
        <p className="text-lg font-semibold leading-none text-white">[MG]</p>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
          Muzuka Gilbert
        </p>
      </div>
    </div>
  );
}

function Panel({
  children,
  eyebrow,
  title,
}: Readonly<{
  children: ReactNode;
  eyebrow: string;
  title: string;
}>) {
  return (
    <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5 shadow-xl shadow-black/20">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--gold)]">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
        </div>
        <Sparkles className="h-5 w-5 shrink-0 text-[var(--gold)]" />
      </div>
      {children}
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  text,
  title,
}: Readonly<{
  icon: ComponentType<{ className?: string }>;
  text: string;
  title: string;
}>) {
  return (
    <article className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--gold)] text-black">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-400">{text}</p>
    </article>
  );
}
