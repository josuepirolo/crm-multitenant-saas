import { describe, it, expect, beforeEach, vi } from "vitest";

// Shared mock store — simulates the rate_limits Supabase table
const store = vi.hoisted(() => new Map<string, number[]>());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (_table: string) => ({
      select: (_fields: string, _opts?: unknown) => ({
        eq: (_col: string, key: string) => ({
          gte: (_col2: string, since: string) => {
            const sinceMs = new Date(since).getTime();
            const timestamps = store.get(key) ?? [];
            const count = timestamps.filter((t) => t >= sinceMs).length;
            return Promise.resolve({ count, error: null });
          },
        }),
      }),
      insert: (data: { key: string }) => {
        const timestamps = store.get(data.key) ?? [];
        timestamps.push(Date.now());
        store.set(data.key, timestamps);
        return Promise.resolve({ error: null });
      },
      delete: () => ({
        eq: () => ({
          lt: () => Promise.resolve({ error: null }),
        }),
      }),
    }),
  }),
}));

import { checkRateLimit, _resetStoreForTesting, RATE_LIMITS } from "@/lib/security/rate-limit";

beforeEach(() => {
  store.clear();
  _resetStoreForTesting();
});

// ─── lógica central ───────────────────────────────────────────────────────────

describe("checkRateLimit — janela deslizante", () => {
  it("permite até o limite de tentativas", async () => {
    const config = { windowMs: 60_000, max: 3 };
    expect(await checkRateLimit("test:key", config)).toBe(true);
    expect(await checkRateLimit("test:key", config)).toBe(true);
    expect(await checkRateLimit("test:key", config)).toBe(true);
  });

  it("bloqueia ao exceder o limite", async () => {
    const config = { windowMs: 60_000, max: 3 };
    await checkRateLimit("test:key", config);
    await checkRateLimit("test:key", config);
    await checkRateLimit("test:key", config);
    expect(await checkRateLimit("test:key", config)).toBe(false);
    expect(await checkRateLimit("test:key", config)).toBe(false);
  });

  it("chaves diferentes não interferem entre si", async () => {
    const config = { windowMs: 60_000, max: 1 };
    expect(await checkRateLimit("key:A", config)).toBe(true);
    expect(await checkRateLimit("key:A", config)).toBe(false);
    expect(await checkRateLimit("key:B", config)).toBe(true); // B independente de A
  });

  it("reseta após expirar a janela de tempo", async () => {
    const config = { windowMs: 1, max: 1 }; // 1ms — expira imediatamente
    await checkRateLimit("expire:key", config);
    expect(await checkRateLimit("expire:key", config)).toBe(false);

    return new Promise<void>((resolve) =>
      setTimeout(async () => {
        expect(await checkRateLimit("expire:key", config)).toBe(true); // janela expirou
        resolve();
      }, 10)
    );
  });

  it("permite exatamente max=1 tentativa e bloqueia a segunda", async () => {
    const config = { windowMs: 60_000, max: 1 };
    expect(await checkRateLimit("max1:key", config)).toBe(true);
    expect(await checkRateLimit("max1:key", config)).toBe(false);
  });
});

// ─── chaves de rate limit por contexto ───────────────────────────────────────

describe("checkRateLimit — isolamento por IP e por e-mail", () => {
  it("rate limit por IP é independente entre IPs distintos", async () => {
    const config = { windowMs: 60_000, max: 1 };
    await checkRateLimit("login:ip:1.1.1.1", config);
    expect(await checkRateLimit("login:ip:1.1.1.1", config)).toBe(false);
    expect(await checkRateLimit("login:ip:2.2.2.2", config)).toBe(true); // outro IP, janela limpa
  });

  it("rate limit por email é independente entre e-mails distintos", async () => {
    const config = { windowMs: 60_000, max: 1 };
    await checkRateLimit("login:email:a@a.com", config);
    expect(await checkRateLimit("login:email:a@a.com", config)).toBe(false);
    expect(await checkRateLimit("login:email:b@b.com", config)).toBe(true);
  });

  it("bloqueio por IP não bloqueia rate limit por email do mesmo usuário (chaves distintas)", async () => {
    const config = { windowMs: 60_000, max: 1 };
    await checkRateLimit("login:ip:3.3.3.3", config); // esgota IP
    expect(await checkRateLimit("login:email:c@c.com", config)).toBe(true); // email ainda tem janela
  });
});

// ─── RATE_LIMITS configs ──────────────────────────────────────────────────────

describe("RATE_LIMITS — configurações sensatas", () => {
  it("login: máximo 5 tentativas", () => {
    expect(RATE_LIMITS.login.max).toBe(5);
  });

  it("forgotPassword: máximo 3 tentativas", () => {
    expect(RATE_LIMITS.forgotPassword.max).toBe(3);
  });

  it("register: janela de 1 hora", () => {
    expect(RATE_LIMITS.register.windowMs).toBe(60 * 60_000);
  });

  it("todas as configs têm max > 0 e windowMs > 0", () => {
    for (const [action, cfg] of Object.entries(RATE_LIMITS)) {
      expect(cfg.max, `${action}.max deve ser > 0`).toBeGreaterThan(0);
      expect(cfg.windowMs, `${action}.windowMs deve ser > 0`).toBeGreaterThan(0);
    }
  });
});
