/**
 * Testes de análise estática dos headers de segurança HTTP.
 * Lê next.config.ts como texto e valida a presença e valores corretos —
 * mesmo padrão de environment-security.test.ts, sem dependências de runtime.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const config = readFileSync(join(process.cwd(), "next.config.ts"), "utf-8");

/** Verifica se a chave do header está declarada */
function hasHeaderKey(key: string): boolean {
  return config.includes(`"${key}"`);
}

/** Verifica se um valor específico está presente no config */
function hasValue(value: string): boolean {
  return config.includes(value);
}

/** Verifica que um padrão NÃO existe no config */
function lacksPattern(pattern: string): boolean {
  return !config.includes(pattern);
}

// ─── Headers obrigatórios ─────────────────────────────────────────────────────

describe("security-headers — headers HTTP obrigatórios presentes", () => {
  it("X-Frame-Options está configurado", () => {
    expect(hasHeaderKey("X-Frame-Options")).toBe(true);
  });

  it("X-Frame-Options tem valor DENY", () => {
    expect(hasValue("DENY")).toBe(true);
  });

  it("X-Content-Type-Options está configurado", () => {
    expect(hasHeaderKey("X-Content-Type-Options")).toBe(true);
  });

  it("X-Content-Type-Options tem valor nosniff", () => {
    expect(hasValue("nosniff")).toBe(true);
  });

  it("Referrer-Policy está configurado", () => {
    expect(hasHeaderKey("Referrer-Policy")).toBe(true);
  });

  it("Referrer-Policy tem valor strict-origin-when-cross-origin", () => {
    expect(hasValue("strict-origin-when-cross-origin")).toBe(true);
  });

  it("Permissions-Policy está configurado", () => {
    expect(hasHeaderKey("Permissions-Policy")).toBe(true);
  });

  it("Permissions-Policy desabilita camera, microphone e geolocation", () => {
    expect(hasValue("camera=()")).toBe(true);
    expect(hasValue("microphone=()")).toBe(true);
    expect(hasValue("geolocation=()")).toBe(true);
  });

  it("Strict-Transport-Security (HSTS) está configurado", () => {
    expect(hasHeaderKey("Strict-Transport-Security")).toBe(true);
  });

  it("HSTS inclui max-age e includeSubDomains", () => {
    expect(hasValue("max-age=31536000")).toBe(true);
    expect(hasValue("includeSubDomains")).toBe(true);
  });

  it("Cross-Origin-Opener-Policy está configurado (proteção Spectre)", () => {
    expect(hasHeaderKey("Cross-Origin-Opener-Policy")).toBe(true);
    expect(hasValue("same-origin")).toBe(true);
  });

  it("Content-Security-Policy está configurado", () => {
    expect(hasHeaderKey("Content-Security-Policy")).toBe(true);
  });
});

// ─── CSP — diretivas obrigatórias ─────────────────────────────────────────────

describe("security-headers — CSP diretivas obrigatórias", () => {
  it("default-src 'self' presente", () => {
    expect(hasValue("default-src 'self'")).toBe(true);
  });

  it("frame-ancestors 'none' — anti-clickjacking via CSP", () => {
    expect(hasValue("frame-ancestors 'none'")).toBe(true);
  });

  it("object-src 'none' — impede execução de plugins (Flash, Java)", () => {
    expect(hasValue("object-src 'none'")).toBe(true);
  });

  it("base-uri 'self' — impede base tag injection", () => {
    expect(hasValue("base-uri 'self'")).toBe(true);
  });

  it("font-src 'self' — fontes limitadas à origem", () => {
    expect(hasValue("font-src 'self'")).toBe(true);
  });
});

// ─── CSP — integrações reais cobertas ────────────────────────────────────────

describe("security-headers — CSP cobre dependências do projeto", () => {
  it("connect-src cobre Supabase (HTTPS)", () => {
    expect(hasValue("https://*.supabase.co")).toBe(true);
  });

  it("connect-src cobre Supabase Realtime (WSS)", () => {
    expect(hasValue("wss://*.supabase.co")).toBe(true);
  });

  it("script-src cobre Cloudflare Turnstile", () => {
    expect(hasValue("https://challenges.cloudflare.com")).toBe(true);
  });

  it("frame-src cobre Cloudflare Turnstile (iframe do captcha)", () => {
    expect(hasValue("frame-src https://challenges.cloudflare.com")).toBe(true);
  });

  it("img-src permite blob: e data: (avatares e uploads locais)", () => {
    expect(hasValue("blob:")).toBe(true);
    expect(hasValue("data:")).toBe(true);
  });
});

// ─── CSP — padrões perigosos ausentes ────────────────────────────────────────

describe("security-headers — CSP não contém padrões perigosos", () => {
  it("script-src não contém wildcard '*'", () => {
    // Verifica que script-src não tem allowAll
    const scriptSrcMatch = config.match(/script-src[^"']*/);
    if (scriptSrcMatch) {
      expect(scriptSrcMatch[0]).not.toContain("*");
    }
    // Verifica ausência de 'allow-all' equivalente na seção script
    expect(lacksPattern("script-src *")).toBe(true);
  });

  it("frame-ancestors não permite '*'", () => {
    expect(lacksPattern("frame-ancestors *")).toBe(true);
    expect(lacksPattern("frame-ancestors 'none'")).toBe(false); // deve ter 'none'
  });

  it("object-src não usa wildcard", () => {
    expect(lacksPattern("object-src *")).toBe(true);
  });
});

// ─── Estrutura — headers aplicados a todas as rotas ──────────────────────────

describe("security-headers — aplicação a todas as rotas", () => {
  it("source pattern cobre todas as rotas /(.*)", () => {
    expect(hasValue("source")).toBe(true);
    // O source deve ser amplo o suficiente para cobrir tudo
    const hasWildcardSource =
      config.includes('"/(.*)"') ||
      config.includes("'/(.*)'") ||
      config.includes('"/**"') ||
      config.includes("'/**'");
    expect(hasWildcardSource).toBe(true);
  });
});
