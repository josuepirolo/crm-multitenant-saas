import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, _resetStoreForTesting, RATE_LIMITS } from "@/lib/security/rate-limit";

beforeEach(() => {
  _resetStoreForTesting();
});

// ─── lógica central ───────────────────────────────────────────────────────────

describe("checkRateLimit — janela deslizante", () => {
  it("permite até o limite de tentativas", () => {
    const config = { windowMs: 60_000, max: 3 };
    expect(checkRateLimit("test:key", config)).toBe(true);
    expect(checkRateLimit("test:key", config)).toBe(true);
    expect(checkRateLimit("test:key", config)).toBe(true);
  });

  it("bloqueia ao exceder o limite", () => {
    const config = { windowMs: 60_000, max: 3 };
    checkRateLimit("test:key", config);
    checkRateLimit("test:key", config);
    checkRateLimit("test:key", config);
    expect(checkRateLimit("test:key", config)).toBe(false);
    expect(checkRateLimit("test:key", config)).toBe(false);
  });

  it("chaves diferentes não interferem entre si", () => {
    const config = { windowMs: 60_000, max: 1 };
    expect(checkRateLimit("key:A", config)).toBe(true);
    expect(checkRateLimit("key:A", config)).toBe(false);
    expect(checkRateLimit("key:B", config)).toBe(true); // B independente de A
  });

  it("reseta após expirar a janela de tempo", () => {
    const config = { windowMs: 1, max: 1 }; // 1ms — expira imediatamente
    checkRateLimit("expire:key", config);
    expect(checkRateLimit("expire:key", config)).toBe(false);

    return new Promise<void>((resolve) =>
      setTimeout(() => {
        expect(checkRateLimit("expire:key", config)).toBe(true); // janela expirou
        resolve();
      }, 10)
    );
  });

  it("permite exatamente max=1 tentativa e bloqueia a segunda", () => {
    const config = { windowMs: 60_000, max: 1 };
    expect(checkRateLimit("max1:key", config)).toBe(true);
    expect(checkRateLimit("max1:key", config)).toBe(false);
  });
});

// ─── chaves de rate limit por contexto ───────────────────────────────────────

describe("checkRateLimit — isolamento por IP e por e-mail", () => {
  it("rate limit por IP é independente entre IPs distintos", () => {
    const config = { windowMs: 60_000, max: 1 };
    checkRateLimit("login:ip:1.1.1.1", config);
    expect(checkRateLimit("login:ip:1.1.1.1", config)).toBe(false);
    expect(checkRateLimit("login:ip:2.2.2.2", config)).toBe(true); // outro IP, janela limpa
  });

  it("rate limit por email é independente entre e-mails distintos", () => {
    const config = { windowMs: 60_000, max: 1 };
    checkRateLimit("login:email:a@a.com", config);
    expect(checkRateLimit("login:email:a@a.com", config)).toBe(false);
    expect(checkRateLimit("login:email:b@b.com", config)).toBe(true);
  });

  it("bloqueio por IP não bloqueia rate limit por email do mesmo usuário (chaves distintas)", () => {
    const config = { windowMs: 60_000, max: 1 };
    checkRateLimit("login:ip:3.3.3.3", config);    // esgota IP
    expect(checkRateLimit("login:email:c@c.com", config)).toBe(true); // email ainda tem janela
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
