import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createUserSession } from "@/lib/auth";

function getBaseUrl() {
  const envUrl =
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// GET /api/auth/google/callback — exchange code for tokens, find/create user, sign in
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${getBaseUrl()}/login?error=google_cancelled`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${getBaseUrl()}/login?error=google_failed`);
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_oauth_state")?.value;

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${getBaseUrl()}/login?error=google_failed`);
  }

  cookieStore.delete("google_oauth_state");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${getBaseUrl()}/login?error=google_failed`);
  }

  const base = getBaseUrl();
  const redirectUri = `${base}/api/auth/google/callback`;

  try {
    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("[google-auth] token exchange failed:", tokenRes.status);
      return NextResponse.redirect(`${getBaseUrl()}/login?error=google_failed`);
    }

    const tokens = await tokenRes.json();

    // Fetch user profile from Google
    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    if (!profileRes.ok) {
      console.error("[google-auth] profile fetch failed:", profileRes.status);
      return NextResponse.redirect(`${getBaseUrl()}/login?error=google_failed`);
    }

    const profile = await profileRes.json();
    const email = profile.email?.toLowerCase();
    const name = profile.name || email?.split("@")[0] || "Google User";

    if (!email) {
      return NextResponse.redirect(`${getBaseUrl()}/login?error=google_failed`);
    }

    // Find existing user by email
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, approvalStatus: true },
    });

    if (!user) {
      // New user — create account
      const userCount = await prisma.user.count();
      const isFirstUser = userCount === 0;

      user = await prisma.user.create({
        data: {
          name,
          email,
          role: isFirstUser ? "FOUNDER" : "CLIENT",
          approvalStatus: isFirstUser ? "APPROVED" : "PENDING",
        },
        select: { id: true, role: true, approvalStatus: true },
      });

      // Create approval record
      await prisma.clientApproval.create({
        data: {
          clientId: user.id,
          status: user.approvalStatus,
          decidedAt: user.approvalStatus === "APPROVED" ? new Date() : null,
          notes: isFirstUser
            ? "First registered user becomes the approved founder account."
            : "Google sign-in registration — awaiting admin approval.",
        },
      });
    }

    // Create session
    await createUserSession(user.id);

    // Redirect based on role and approval
    if (user.approvalStatus === "DEACTIVATED") {
      return NextResponse.redirect(`${getBaseUrl()}/login?error=account-deactivated`);
    }
    if (user.approvalStatus === "REJECTED") {
      return NextResponse.redirect(`${getBaseUrl()}/login?error=account-rejected`);
    }
    if (user.approvalStatus !== "APPROVED") {
      return NextResponse.redirect(`${getBaseUrl()}/pending-approval`);
    }
    if (["FOUNDER", "ADMIN"].includes(user.role)) {
      return NextResponse.redirect(`${getBaseUrl()}/admin`);
    }
    return NextResponse.redirect(`${getBaseUrl()}/client`);
  } catch (err) {
    console.error("[google-auth] unexpected error:", err);
    return NextResponse.redirect(`${getBaseUrl()}/login?error=google_failed`);
  }
}
