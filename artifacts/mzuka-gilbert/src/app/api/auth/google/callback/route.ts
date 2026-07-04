import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createUserSession } from "@/lib/auth";
import { sendWelcomeMessage, sendApprovalMessage } from "@/lib/messages";
import { nanoid } from "nanoid";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

function getBaseUrl(req: NextRequest) {
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

export async function GET(req: NextRequest) {
  const base = getBaseUrl(req);
  const { searchParams } = new URL(req.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${base}/login?error=google_cancelled`);
  }

  try {
    const clientId     = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri  = `${base}/api/auth/google/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
    });

    const tokens = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokens.access_token) {
      console.error("Google token exchange failed:", tokens);
      return NextResponse.redirect(`${base}/login?error=google_token`);
    }

    // Fetch Google user info
    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userRes.json() as GoogleUser;

    if (!googleUser.email) {
      return NextResponse.redirect(`${base}/login?error=google_no_email`);
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email.toLowerCase() },
      select: { id: true, role: true, approvalStatus: true, name: true, email: true, phone: true },
    });

    const isNewUser = !user;

    if (!user) {
      // New Google user — auto-approve as CLIENT immediately
      user = await prisma.user.create({
        data: {
          id:             nanoid(25),
          name:           googleUser.name || googleUser.email.split("@")[0],
          email:          googleUser.email.toLowerCase(),
          role:           "CLIENT",
          approvalStatus: "APPROVED", // ← auto-approved via Google
          emailVerifiedAt: new Date(),
        },
        select: { id: true, role: true, approvalStatus: true, name: true, email: true, phone: true },
      });

      await prisma.clientApproval.create({
        data: {
          clientId:  user.id,
          status:    "APPROVED",
          decidedAt: new Date(),
          notes:     "Auto-approved via Google OAuth sign-in.",
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId:  user.id,
          action:   "LOGIN",
          entity:   "User",
          entityId: user.id,
          metadata: { provider: "google", email: googleUser.email },
        },
      });

      // Send welcome + approval messages non-blocking
      sendWelcomeMessage({ id: user.id, name: user.name, email: user.email, phone: user.phone })
        .catch((e) => console.error("[google-oauth] welcome:", e));
      sendApprovalMessage({ id: user.id, name: user.name, email: user.email, phone: user.phone })
        .catch((e) => console.error("[google-oauth] approval:", e));

    } else if (user.approvalStatus === "PENDING") {
      // Existing user who was pending — auto-approve them now via Google verification
      await prisma.user.update({
        where: { id: user.id },
        data: { approvalStatus: "APPROVED", emailVerifiedAt: new Date() },
      });
      await prisma.clientApproval.updateMany({
        where: { clientId: user.id },
        data: { status: "APPROVED", decidedAt: new Date(), notes: "Auto-approved via Google OAuth." },
      });
      user = { ...user, approvalStatus: "APPROVED" };

      sendApprovalMessage({ id: user.id, name: user.name, email: user.email, phone: user.phone })
        .catch((e) => console.error("[google-oauth] approval:", e));
    }

    // Create session using existing auth system
    await createUserSession(user.id);

    // Redirect based on role
    if (["FOUNDER", "ADMIN"].includes(user.role)) {
      return NextResponse.redirect(`${base}/admin`);
    }

    if (user.role === "STAFF") {
      // Fetch staffRole to determine correct destination
      const staffUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { staffRole: true },
      });
      const adminStaffRoles = ["ADMIN", "PRODUCTION_MANAGER", "COORDINATOR", "HUMAN_RESOURCE"];
      if (staffUser?.staffRole && adminStaffRoles.includes(staffUser.staffRole)) {
        return NextResponse.redirect(`${base}/admin`);
      }
      return NextResponse.redirect(`${base}/staff`);
    }

    return NextResponse.redirect(`${base}/client`);

  } catch (err) {
    console.error("[google-oauth] callback error:", err);
    return NextResponse.redirect(`${base}/login?error=google_failed`);
  }
}
