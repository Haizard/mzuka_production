import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = user.role === "FOUNDER" || user.role === "ADMIN" || user.staffRole === "ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { id: { not: user.id }, approvalStatus: "APPROVED" },
    select: { id: true, name: true, email: true, role: true, staffRole: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    take: 100,
  });

  return NextResponse.json({ users });
}
