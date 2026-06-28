import Link from "next/link";
import { Crown } from "lucide-react";

export function AuthCard({
  children,
  footerHref,
  footerLabel,
  footerText,
  subtitle,
  title,
}: Readonly<{
  children: React.ReactNode;
  footerHref: string;
  footerLabel: string;
  footerText: string;
  subtitle: string;
  title: string;
}>) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--background)] px-4 py-10 text-white relative overflow-hidden">

      {/* Mobile: decorative gold glow behind card */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-[var(--gold)]/5 blur-3xl pointer-events-none lg:hidden" />

      <div className="w-full max-w-md">

        {/* ── iOS/Android-style card ── */}
        <div className="rounded-3xl lg:rounded-lg border border-white/10 bg-[var(--surface)] p-7 lg:p-6 shadow-2xl shadow-black/50">

          {/* Brand header */}
          <div className="flex items-center gap-3 mb-8 lg:mb-0">
            <div className="grid h-12 w-12 lg:h-11 lg:w-11 place-items-center rounded-2xl lg:rounded-lg border border-[var(--gold)]/40 bg-black text-[var(--gold)]">
              <Crown className="h-6 w-6 lg:h-5 lg:w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-none">[MG]</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
                Muzuka Gilbert
              </p>
            </div>
          </div>

          {/* Title block */}
          <div className="mt-0 lg:mt-8">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--gold)]">
              Private access
            </p>
            {/* Mobile: larger heading for native feel */}
            <h1 className="mt-3 text-3xl lg:text-3xl font-semibold">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{subtitle}</p>
          </div>

          {/* Form content */}
          <div className="mt-6">{children}</div>

          {/* Footer */}
          <p className="mt-6 text-center text-sm text-zinc-400">
            {footerText}{" "}
            <Link className="font-medium text-[var(--gold)]" href={footerHref}>
              {footerLabel}
            </Link>
          </p>
        </div>

        {/* Mobile: bottom safe area spacing */}
        <div className="h-[env(safe-area-inset-bottom,0px)] lg:hidden" />
      </div>
    </main>
  );
}
