import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createUserSession } from "@/lib/auth";

// GET /api/auth/google/callback — exchange code for tokens, find/create user, sign in
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return htmlRedirect(`${origin}/login?error=google_cancelled`);
  }

  if (!code || !state) {
    return htmlRedirect(`${origin}/login?error=google_failed`);
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("google_oauth_state")?.value;

  if (!savedState || savedState !== state) {
    return htmlRedirect(`${origin}/login?error=google_failed`);
  }

  cookieStore.delete("google_oauth_state");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return htmlRedirect(`${origin}/login?error=google_failed`);
  }

  const redirectUri = `${origin}/api/auth/google/callback`;

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
      return htmlRedirect(`${origin}/login?error=google_failed`);
    }

    const tokens = await tokenRes.json();

    // Fetch user profile from Google
    const profileRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );

    if (!profileRes.ok) {
      console.error("[google-auth] profile fetch failed:", profileRes.status);
      return htmlRedirect(`${origin}/login?error=google_failed`);
    }

    const profile = await profileRes.json();
    const email = profile.email?.toLowerCase();
    const name = profile.name || email?.split("@")[0] || "Google User";

    if (!email) {
      return htmlRedirect(`${origin}/login?error=google_failed`);
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

    // Return HTML page that stores the cookie then redirects client-side.
    // Server-side NextResponse.redirect() from API routes can fail to pass
    // Set-Cookie headers reliably in some environments, causing redirect loops.
    return htmlRedirect(`${origin}/login`);
  } catch (err) {
    console.error("[google-auth] unexpected error:", err);
    return htmlRedirect(`${origin}/login?error=google_failed`);
  }
}

// Return a minimal HTML page that redirects client-side.
// This ensures Set-Cookie headers from the response are processed by the
// browser before navigation, preventing the redirect loop.
function htmlRedirect(url: string) {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${url}"></head><body><script>window.location.replace("${url}")</script></body></html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }
  );
}
