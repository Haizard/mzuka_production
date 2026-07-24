import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { conversationChannel, getPusher } from "@/lib/realtime";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const formData = await request.formData();
  const socketId = formData.get("socket_id");
  const channelName = formData.get("channel_name");
  if (typeof socketId !== "string" || typeof channelName !== "string") return NextResponse.json({ error: "Invalid subscription request" }, { status: 400 });
  const prefix = "private-conversation-";
  if (!channelName.startsWith(prefix)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const conversationId = channelName.slice(prefix.length);
  if (!conversationId || channelName !== conversationChannel(conversationId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const conversation = await prisma.directConversation.findUnique({ where: { id: conversationId }, select: { adminId: true, participantId: true } });
  if (!conversation || (conversation.adminId !== user.id && conversation.participantId !== user.id)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const pusher = getPusher();
  if (!pusher) return NextResponse.json({ error: "Realtime is not configured" }, { status: 503 });
  return NextResponse.json(pusher.authorizeChannel(socketId, channelName));
}
