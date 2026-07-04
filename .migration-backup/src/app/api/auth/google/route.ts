import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createUserSession } from "@/lib/auth";
import { nanoid } from "nanoid";
import { sendWelcomeMessage } from "@/lib/messages";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

function getBaseUrl(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin) return origin;
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

// GET /api/auth/google — redirect to Google
export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 503 });
  }

  const base = getBaseUrl(req);
  const redirectUri = `${base}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: "code",
    scope:         "openid email profile",
    access_type:   "offline",
    prompt:        "select_account",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
