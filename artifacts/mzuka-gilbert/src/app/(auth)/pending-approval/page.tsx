import { Clock, ShieldCheck } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { requireUser } from "@/lib/auth";

export default async function PendingApprovalPage() {
  const user = await requireUser();

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--background)] px-4 py-10 text-white">
      <section className="w-full max-w-xl rounded-lg border border-white/10 bg-[var(--surface)] p-6 text-center shadow-2xl shadow-black/35">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[var(--gold)]/40 bg-black text-[var(--gold)]">
          <Clock className="h-7 w-7" />
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
          Awaiting approval
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Private access pending</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          {user.name}, your account is created but not approved yet. Muzuka
          Gilbert must approve access before private galleries, bookings, and
          downloads are visible.
        </p>
        <div className="mt-6 rounded-lg border border-white/10 bg-black/35 p-4 text-left">
          <div className="flex gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[var(--gold)]" />
            <p className="text-sm leading-6 text-zinc-300">
              This protects every client&apos;s work: nobody sees private media
              until the founder or admin approves them.
            </p>
          </div>
        </div>
        <form action={logoutAction} className="mt-6">
          <button
            className="h-11 rounded-lg border border-white/10 px-4 text-sm text-zinc-200 transition hover:bg-white/5"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
