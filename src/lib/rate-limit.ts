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
  /** Login / register — 10 attempts per 15 minutes per IP */
  auth: (ip: string) =>
    rateLimit(`auth:${ip}`, { limit: 10, windowSecs: 900 }),

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
