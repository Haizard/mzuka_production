import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = user.role === "FOUNDER" || user.role === "ADMIN" || user.staffRole === "ADMIN";

  const conversations = await prisma.directConversation.findMany({
    where: isAdmin ? { adminId: user.id } : { participantId: user.id },
    include: {
      admin: { select: { id: true, name: true, role: true, staffRole: true } },
      participant: { select: { id: true, name: true, role: true, staffRole: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = user.role === "FOUNDER" || user.role === "ADMIN" || user.staffRole === "ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "Only admins can start conversations" }, { status: 403 });

  const { participantId } = await req.json();
  if (!participantId) return NextResponse.json({ error: "participantId required" }, { status: 400 });

  const existing = await prisma.directConversation.findUnique({
    where: { adminId_participantId: { adminId: user.id, participantId } },
  });
  if (existing) return NextResponse.json({ conversation: existing });

  const conversation = await prisma.directConversation.create({
    data: { adminId: user.id, participantId },
    include: {
      admin: { select: { id: true, name: true, role: true, staffRole: true } },
      participant: { select: { id: true, name: true, role: true, staffRole: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return NextResponse.json({ conversation });
}
