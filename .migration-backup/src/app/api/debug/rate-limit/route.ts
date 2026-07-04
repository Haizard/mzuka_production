import { NextRequest, NextResponse } from "next/server";
import { getStoreSnapshot } from "@/lib/rate-limit";

// Protect this endpoint: only enabled when DEBUG_RATE_LIMIT=1 or when the
// request includes a matching secret header (x-debug-key) that equals
// process.env.DEBUG_SECRET. This avoids exposing internal state in prod.
export async function GET(req: NextRequest) {
  const enabled = process.env.DEBUG_RATE_LIMIT === "1";
  const headerKey = req.headers.get("x-debug-key");
  const secretMatch = headerKey && process.env.DEBUG_SECRET && headerKey === process.env.DEBUG_SECRET;

  if (!enabled && !secretMatch) {
    return new NextResponse(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  const ip = req.nextUrl.searchParams.get("ip");
  const { now, snapshots } = getStoreSnapshot();

  const filtered = ip ? snapshots.filter((s) => s.key.includes(ip)) : snapshots;

  return NextResponse.json({ now, count: filtered.length, entries: filtered });
}
