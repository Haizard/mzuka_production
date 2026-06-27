/**
 * Next.js 16 proxy (previously middleware) — rate limiting on sensitive routes.
 * Runs before every matched request.
 */
import { NextRequest, NextResponse } from "next/server";
import { Limiters } from "@/lib/rate-limit";

// Routes and their rate-limit profiles
const RATE_LIMITED_ROUTES: Array<{
  pattern: RegExp;
  limiter: (ip: string) => ReturnType<typeof Limiters.auth>;
}> = [
  { pattern: /^\/(login|register)$/, limiter: Limiters.auth },
  { pattern: /^\/client\/galleries\//, limiter: Limiters.gallery },
  { pattern: /^\/api\/cron\//, limiter: Limiters.cron },
  { pattern: /^\/api\/webhooks\//, limiter: Limiters.webhook },
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Extract real client IP (Vercel, Cloudflare, or direct)
  const ip =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  for (const { pattern, limiter } of RATE_LIMITED_ROUTES) {
    if (pattern.test(pathname)) {
      const result = limiter(ip);

      if (!result.allowed) {
        return new NextResponse(
          JSON.stringify({
            error: "Too many requests. Please slow down.",
            resetAt: new Date(result.resetAt).toISOString(),
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
              "X-RateLimit-Limit": "see config",
              "X-RateLimit-Remaining": "0",
            },
          }
        );
      }

      const response = NextResponse.next();
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/client/galleries/:path*",
    "/api/cron/:path*",
    "/api/webhooks/:path*",
  ],
};
