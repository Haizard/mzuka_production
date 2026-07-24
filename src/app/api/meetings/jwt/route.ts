import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createJitsiJwt } from "@/lib/jitsi-server";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roomId } = await req.json();
  if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });

  const appId = process.env.NEXT_PUBLIC_JITSI_APP_ID || process.env.JITSI_APP_ID;
  const privateKey = process.env.JITSI_PRIVATE_KEY;
  const kid = process.env.JITSI_KID || `${appId}/DEFAULT_KEY`;

  if (!appId || !privateKey) {
    return NextResponse.json({ error: "Jitsi credentials not configured" }, { status: 500 });
  }

  const token = createJitsiJwt({
    roomId,
    userId: user.id,
    userName: user.name || user.email || "User",
    userEmail: user.email,
    isModerator: user.role === "FOUNDER" || user.role === "ADMIN" || user.staffRole === "ADMIN",
    appId,
    privateKey,
    kid,
  });

  return NextResponse.json({ token });
}
