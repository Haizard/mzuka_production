import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { Crown, ListTodo, LogOut } from "lucide-react";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.approvalStatus !== "APPROVED") redirect("/pending-approval");
  if (!["FOUNDER","ADMIN","STAFF"].includes(user.role)) redirect("/client");

  return (
    <div className="min-h-dvh bg-[var(--background)] text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--surface)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--gold)]/40 bg-black text-[var(--gold)]">
              <Crown className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-widest text-[var(--gold)]">[MG]</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/staff" className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition">
              <ListTodo className="h-4 w-4" /> My Tasks
            </Link>
            {["FOUNDER","ADMIN"].includes(user.role) && (
              <Link href="/admin" className="text-sm text-[var(--gold)] hover:underline">Admin</Link>
            )}
            <form action={logoutAction}>
              <button className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
