// ⚠️  In-memory: resets on restart and does not share state across instances.
// For multi-instance / serverless production, replace with Redis or Upstash KV.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export const RATE_LIMITS = {
  login:          { windowMs: 15 * 60_000, max: 5 },
  register:       { windowMs: 60 * 60_000, max: 5 },
  forgotPassword: { windowMs: 60 * 60_000, max: 3 },
  updatePassword: { windowMs: 15 * 60_000, max: 5 },
} satisfies Record<string, RateLimitConfig>;

/** Returns true when the request is allowed, false when blocked. */
export function checkRateLimit(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return true;
  }

  if (entry.count >= config.max) return false;
  entry.count++;
  return true;
}

/** Test-only helper — clears the in-memory store between test runs. */
export function _resetStoreForTesting() {
  store.clear();
}
