import { createAdminClient } from "@/lib/supabase/admin";

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export const RATE_LIMITS = {
  login:              { windowMs: 15 * 60_000, max: 5 },
  register:           { windowMs: 60 * 60_000, max: 5 },
  forgotPassword:     { windowMs: 60 * 60_000, max: 3 },
  updatePassword:     { windowMs: 15 * 60_000, max: 5 },
  contactsBulkImport: { windowMs: 60 * 60_000, max: 5 },
} satisfies Record<string, RateLimitConfig>;

/** Returns true when the request is allowed, false when blocked. */
export async function checkRateLimit(key: string, config: RateLimitConfig): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const windowStart = new Date(Date.now() - config.windowMs).toISOString();

    const { count, error } = await admin
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", windowStart);

    if (error) {
      console.error("[rate-limit] DB error:", error.message.slice(0, 100));
      return true; // fail open — never block on DB error
    }

    if ((count ?? 0) >= config.max) return false;

    await admin.from("rate_limits").insert({ key });

    // Lazy cleanup — fire-and-forget, does not block response
    void Promise.resolve(
      admin.from("rate_limits").delete().eq("key", key).lt("created_at", windowStart)
    ).catch(() => {});

    return true;
  } catch {
    return true; // fail open
  }
}

/** No-op in production — tests mock the admin client directly. */
export function _resetStoreForTesting(): void {}
