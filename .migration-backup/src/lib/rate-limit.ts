/**
 * Simple in-process rate limiter using a sliding-window token bucket.
 * Works in Next.js serverless (per-instance) and long-running Node processes.
 *
 * For multi-instance production deployments, swap the in-memory store
 * for a Redis-backed implementation (e.g. @upstash/ratelimit).
 */

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSecs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
}

/**
 * Check and consume one token for the given key.
 * @param key        Unique identifier — e.g. `"gallery:${ip}"` or `"auth:${ip}"`
 * @param config     Limit and window configuration
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSecs * 1000;

  let bucket = store.get(key);

  if (!bucket || now - bucket.lastRefill >= windowMs) {
    // New window — full bucket
    bucket = { tokens: config.limit, lastRefill: now };
  }

  const resetAt = bucket.lastRefill + windowMs;

  if (bucket.tokens <= 0) {
    store.set(key, bucket);
    return { allowed: false, remaining: 0, resetAt };
  }

  bucket.tokens -= 1;
  store.set(key, bucket);

  return { allowed: true, remaining: bucket.tokens, resetAt };
}

// Pre-configured limiters for each sensitive area
export const Limiters = {
  /** Login / register — increased to 30 attempts per 15 minutes per IP (less aggressive) */
  auth: (ip: string) =>
    rateLimit(`auth:${ip}`, { limit: 30, windowSecs: 900 }),

  /** Gallery view — 60 requests per minute per IP */
  gallery: (ip: string) =>
    rateLimit(`gallery:${ip}`, { limit: 60, windowSecs: 60 }),

  /** Cron endpoint — 20 calls per minute per IP */
  cron: (ip: string) =>
    rateLimit(`cron:${ip}`, { limit: 20, windowSecs: 60 }),

  /** Stripe webhook — 100 per minute (Stripe sends bursts) */
  webhook: (ip: string) =>
    rateLimit(`webhook:${ip}`, { limit: 100, windowSecs: 60 }),
} as const;

// Dev helper: return a snapshot of the in-memory store for debugging.
// Only intended for local inspection; expose carefully via a protected endpoint.
export function getStoreSnapshot() {
  const now = Date.now();
  const snapshots: Array<{
    key: string;
    tokens: number;
    lastRefill: number;
    // best-effort estimate of reset timestamp (ms)
    resetAt: number;
    remaining: number;
    windowSecs: number;
  }> = [];

  for (const [key, bucket] of store.entries()) {
    let windowSecs = 60; // default
    if (key.startsWith("auth:")) windowSecs = 900;
    else if (key.startsWith("gallery:")) windowSecs = 60;
    else if (key.startsWith("cron:")) windowSecs = 60;
    else if (key.startsWith("webhook:")) windowSecs = 60;

    const resetAt = bucket.lastRefill + windowSecs * 1000;
    snapshots.push({ key, tokens: bucket.tokens, lastRefill: bucket.lastRefill, resetAt, remaining: bucket.tokens, windowSecs });
  }

  return { now, snapshots };
}
