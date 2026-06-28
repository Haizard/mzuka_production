"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Users } from "lucide-react";
import { EmployeeManager } from "./employee-manager";
import { STAFF_ROLES } from "./staff-roles";

async function getData() {
  const admin = await requireAdmin();
  if (!["FOUNDER","ADMIN"].includes(admin.role)) redirect("/admin");

  const staff = await prisma.user.findMany({
    where: { role: { in: ["FOUNDER","ADMIN","STAFF"] }, approvalStatus: "APPROVED" },
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, staffRole: true, isProductionManager: true, createdAt: true,
      staffAssignments: {
        include: { project: { select: { id: true, stage: true, booking: { select: { title: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 2,
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });

  return { staff };
}

export default async function EmployeesPage() {
  const { staff } = await getData();

  // Group by staffRole (or role if staffRole not set)
  const grouped: Record<string, typeof staff> = {};
  for (const member of staff) {
    const key = member.staffRole ?? (member.role === "FOUNDER" ? "ADMIN" : member.role);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(member);
  }

  const totalStaff = staff.length;
  const roleBreakdown = STAFF_ROLES.map((r) => ({
    ...r,
    count: (grouped[r.value] ?? []).length,
  }));

  return (
    <main className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-[var(--gold)]">Team Management</p>
        <h2 className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
          <Users className="h-6 w-6 text-[var(--gold)]" />
          Employee Management
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Create staff accounts, assign roles, and manage the team</p>
      </div>

      {/* Role overview */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-4 col-span-2 sm:col-span-1">
          <p className="text-3xl font-bold text-[var(--gold)]">{totalStaff}</p>
          <p className="text-xs text-zinc-400 mt-1">Total Team</p>
        </div>
        {roleBreakdown.filter((r) => r.count > 0).slice(0, 3).map((r) => (
          <div key={r.value} className="rounded-lg border border-white/10 bg-[var(--surface)] p-4">
            <p className="text-3xl font-bold text-white">{r.count}</p>
            <p className="text-xs text-zinc-400 mt-1">{r.label}</p>
          </div>
        ))}
      </div>

      {/* Full employee manager (client component) */}
      <EmployeeManager
        staff={staff as Parameters<typeof EmployeeManager>[0]["staff"]}
        grouped={grouped as Parameters<typeof EmployeeManager>[0]["grouped"]}
        roleBreakdown={roleBreakdown}
      />
    </main>
  );
}
