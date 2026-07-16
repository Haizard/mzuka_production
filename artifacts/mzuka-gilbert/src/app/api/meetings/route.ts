import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { nanoid } from "nanoid";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meetings = await prisma.meeting.findMany({
    where: { isActive: true },
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json({ meetings });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = user.role === "FOUNDER" || user.role === "ADMIN" || user.staffRole === "ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Only admins can create meetings" }, { status: 403 });

  const { title, description, scheduledAt, endsAt } = await req.json();
  if (!title || !scheduledAt) return NextResponse.json({ error: "title and scheduledAt required" }, { status: 400 });

  const roomId = `mg-${nanoid(10)}`;

  const meeting = await prisma.meeting.create({
    data: {
      title,
      description: description ?? null,
      roomId,
      scheduledAt: new Date(scheduledAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      createdById: user.id,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ meeting });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = user.role === "FOUNDER" || user.role === "ADMIN" || user.staffRole === "ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.meeting.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true });
}
