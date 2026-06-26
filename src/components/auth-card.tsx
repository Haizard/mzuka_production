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
    <main className="grid min-h-dvh place-items-center bg-[var(--background)] px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[var(--surface)] p-6 shadow-2xl shadow-black/35">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg border border-[var(--gold)]/40 bg-black text-[var(--gold)]">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-none">[MG]</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[var(--gold)]">
              Muzuka Gilbert
            </p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-[0.22em] text-[var(--gold)]">
            Private access
          </p>
          <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">{subtitle}</p>
        </div>

        <div className="mt-6">{children}</div>

        <p className="mt-6 text-center text-sm text-zinc-400">
          {footerText}{" "}
          <Link className="font-medium text-[var(--gold)]" href={footerHref}>
            {footerLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}
