import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { logoutAction } from "@/app/(auth)/actions";
import { ListTodo, LogOut, Camera, Video, Scissors, Car, Users2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const ROLE_META: Record<string, { label: string; icon: React.ElementType; colour: string }> = {
  PHOTOGRAPHER:  { label: "Photographer",  icon: Camera,   colour: "text-blue-400" },
  VIDEO_EDITOR:  { label: "Video Editor",  icon: Video,    colour: "text-cyan-400" },
  EDITOR:        { label: "Photo Editor",  icon: Scissors, colour: "text-indigo-400" },
  DRIVER:        { label: "Driver",        icon: Car,      colour: "text-amber-400" },
  ASSISTANT:     { label: "Assistant",     icon: Users2,   colour: "text-zinc-400" },
};

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.approvalStatus !== "APPROVED") redirect("/pending-approval");
  if (!["FOUNDER","ADMIN","STAFF"].includes(user.role)) redirect("/client");

  // Admin-side staff roles should be in the admin panel, not the staff task portal
  const adminStaffRoles = ["ADMIN","PRODUCTION_MANAGER","COORDINATOR","HUMAN_RESOURCE"];
  if (user.staffRole && adminStaffRoles.includes(user.staffRole)) {
    redirect("/admin");
  }

  const meta = user.staffRole ? (ROLE_META[user.staffRole] ?? null) : null;
  const RoleIcon = meta?.icon ?? ListTodo;

  return (
    <div className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[var(--surface)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 sm:px-6">
          {/* Brand + role */}
          <div className="flex items-center gap-3">
            <img src="/brand/company-logo.jpg" alt="Muzuka Gilbert" className="h-8 w-auto object-contain" />
            {meta && (
              <span className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 border border-white/10 ${meta.colour}`}>
                <RoleIcon className="h-3 w-3" />
                {meta.label}
              </span>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {/* User name chip */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-[var(--gold)]/20 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] font-bold text-xs shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs text-zinc-400 max-w-[100px] truncate">{user.name.split(" ")[0]}</span>
            </div>

            <Link href="/staff" className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">My Tasks</span>
            </Link>

            {["FOUNDER","ADMIN"].includes(user.role) && (
              <Link href="/admin" className="text-sm text-[var(--gold)] hover:underline hidden sm:inline">Admin</Link>
            )}

            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-red-400 border border-white/10 hover:border-red-500/20 rounded-lg px-2.5 py-1.5 transition"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
