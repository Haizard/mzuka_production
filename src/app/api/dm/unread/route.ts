import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ count: 0 });

  const isAdmin = user.role === "FOUNDER" || user.role === "ADMIN" || user.staffRole === "ADMIN";

  const myConvos = await prisma.directConversation.findMany({
    where: isAdmin ? { adminId: user.id } : { participantId: user.id },
    select: { id: true },
  });
  const convoIds = myConvos.map((c) => c.id);

  const count = await prisma.directMessage.count({
    where: {
      conversationId: { in: convoIds },
      senderId: { not: user.id },
      readAt: null,
    },
  });

  return NextResponse.json({ count });
}
