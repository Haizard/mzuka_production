import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const convo = await prisma.directConversation.findUnique({ where: { id } });
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (convo.adminId !== user.id && convo.participantId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const messages = await prisma.directMessage.findMany({
    where: { conversationId: id },
    include: { sender: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  await prisma.directMessage.updateMany({
    where: { conversationId: id, senderId: { not: user.id }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Message body required" }, { status: 400 });

  const convo = await prisma.directConversation.findUnique({ where: { id } });
  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (convo.adminId !== user.id && convo.participantId !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const message = await prisma.directMessage.create({
    data: { conversationId: id, senderId: user.id, body: body.trim() },
    include: { sender: { select: { id: true, name: true, role: true } } },
  });

  await prisma.directConversation.update({
    where: { id },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ message });
}
