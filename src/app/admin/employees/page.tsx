"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Users, CalendarDays, Briefcase, ShieldCheck } from "lucide-react";
import { EmployeeActions } from "./employee-actions";

async function getEmployeeData() {
  const admin = await requireAdmin();
  if (!["FOUNDER","ADMIN"].includes(admin.role)) redirect("/admin");

  const [staff, assignments] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["FOUNDER","ADMIN","STAFF"] }, approvalStatus: "APPROVED" },
      select: {
        id: true, name: true, email: true, phone: true, role: true,
        isProductionManager: true, createdAt: true,
        staffAssignments: {
          include: { project: { select: { id: true, stage: true, booking: { select: { title: true } } } } },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.staffAssignment.groupBy({ by: ["staffId"], _count: { id: true } }),
  ]);

  const assignmentMap = Object.fromEntries(assignments.map((a) => [a.staffId, a._count.id]));
  return { staff, assignmentMap };
}

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const ROLE_COLOURS: Record<string, string> = {
  FOUNDER: "bg-[var(--gold)]/20 text-[var(--gold)]",
  ADMIN:   "bg-blue-500/15 text-blue-300",
  STAFF:   "bg-violet-500/15 text-violet-300",
};

export default async function EmployeesPage() {
  const { staff, assignmentMap } = await getEmployeeData();

  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">MG AI Command Center</p>
        <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <Users className="h-6 w-6 text-[var(--gold)]" />
          Employee Management
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Team members, roles, project assignments, and Production Manager designation</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
          <p className="text-3xl font-bold text-[var(--gold)]">{staff.length}</p>
          <p className="text-sm text-zinc-400 mt-1">Team Members</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
          <p className="text-3xl font-bold text-white">{staff.filter((s) => s.role === "STAFF").length}</p>
          <p className="text-sm text-zinc-400 mt-1">Staff</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
          <p className="text-3xl font-bold text-violet-400">
            {staff.filter((s) => s.role === "STAFF" && s.isProductionManager).length}
          </p>
          <p className="text-sm text-zinc-400 mt-1">Production Managers</p>
        </div>
      </div>

      {/* Team grid */}
      {staff.length === 0 ? (
        <div className="rounded-lg border border-white/10 p-16 text-center text-zinc-500">No team members yet</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => (
            <div key={member.id} className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
              {/* Avatar + role */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--gold)]/20 flex items-center justify-center text-[var(--gold)] font-bold text-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{member.name}</p>
                    <p className="text-xs text-zinc-500">{member.email}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLOURS[member.role] ?? "text-zinc-400"}`}>
                  {member.role}
                </span>
              </div>

              {/* Production Manager badge */}
              {member.isProductionManager && (
                <div className="mb-3 flex items-center gap-1.5 text-xs text-violet-300 bg-violet-500/10 px-2 py-1 rounded-full w-fit">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Production Manager
                </div>
              )}

              {/* Details */}
              <div className="space-y-2 text-sm mb-4">
                {member.phone && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Phone</span>
                    <span className="text-zinc-300">{member.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-500">Joined</span>
                  <span className="text-zinc-300">{fmt(member.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Projects</span>
                  <span className="text-zinc-300">{assignmentMap[member.id] ?? 0}</span>
                </div>
              </div>

              {/* Recent assignments */}
              {member.staffAssignments.length > 0 && (
                <div className="pt-3 border-t border-white/10 mb-4">
                  <p className="text-xs text-zinc-500 mb-2">Recent assignments</p>
                  {member.staffAssignments.map((a) => (
                    <div key={a.id} className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                      <Briefcase className="h-3 w-3 text-zinc-600 shrink-0" />
                      <span className="truncate">{a.project.booking.title}</span>
                      <span className={`shrink-0 ${a.project.stage === "DELIVERED" ? "text-emerald-400" : "text-zinc-500"}`}>
                        {a.project.stage}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* PM toggle — only for STAFF role */}
              {member.role === "STAFF" && (
                <EmployeeActions
                  staffId={member.id}
                  isProductionManager={member.isProductionManager}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Coming soon */}
      <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-5">
        <div className="flex gap-3">
          <CalendarDays className="h-5 w-5 text-zinc-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-zinc-300">Full HR Features Coming Soon</p>
            <p className="text-sm text-zinc-500 mt-1">
              Payroll tracking, leave management, performance reviews, and shift scheduling will be added in the employee management expansion.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
