import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  approveClientAction,
  rejectClientAction,
} from "@/app/admin/approvals/actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ApprovalsPage() {
  await requireAdmin();

  const pendingClients = await prisma.user.findMany({
    where: { role: "CLIENT", approvalStatus: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
    },
  });

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-5xl">
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--gold)]">
              Private access control
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Client approvals</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Nobody sees private work until an admin approves their account.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center rounded-lg border border-white/10 px-4 text-sm text-zinc-200 hover:bg-white/5"
            href="/admin"
          >
            Back to admin
          </Link>
        </header>

        <section className="mt-6 rounded-lg border border-white/10 bg-[var(--surface)]">
          {pendingClients.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
              <h2 className="mt-4 text-xl font-semibold">
                No pending approvals
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                New client access requests will appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {pendingClients.map((client) => (
                <div
                  className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center"
                  key={client.id}
                >
                  <div>
                    <h2 className="font-semibold">{client.name}</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      {client.email}
                      {client.phone ? ` | ${client.phone}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Requested {client.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <form action={approveClientAction}>
                      <input name="clientId" type="hidden" value={client.id} />
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--gold)] px-4 text-sm font-semibold text-black"
                        type="submit"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </button>
                    </form>
                    <form action={rejectClientAction}>
                      <input name="clientId" type="hidden" value={client.id} />
                      <button
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-500/30 px-4 text-sm font-medium text-red-200 hover:bg-red-500/10"
                        type="submit"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
