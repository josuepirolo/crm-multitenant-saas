/**
 * Objetivo 4 — Hardening de sessão e erros.
 * Combina testes unitários do publicError() com análise estática dos
 * arquivos de Server Actions para garantir que erros internos não vazam.
 */

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { publicError } from "@/lib/security/security-errors";

// ─── publicError — unit tests ─────────────────────────────────────────────────

describe("publicError — não expõe erro interno ao cliente", () => {
  it("retorna o publicMsg, não o erro interno", () => {
    const result = publicError(new Error("SQL: unique constraint 'pg_users_pkey'"), "Erro ao salvar.");
    expect(result.error).toBe("Erro ao salvar.");
    expect(result.error).not.toContain("SQL");
    expect(result.error).not.toContain("constraint");
    expect(result.error).not.toContain("pg_users_pkey");
  });

  it("retorna o publicMsg quando err não é Error", () => {
    const result = publicError("raw string error", "Ocorreu um erro.");
    expect(result.error).toBe("Ocorreu um erro.");
  });

  it("não inclui stack trace na resposta", () => {
    const err = new Error("internal failure");
    const result = publicError(err, "Erro genérico.");
    expect(result.error).not.toContain("at ");       // stack frame
    expect(result.error).not.toContain(".ts:");      // file reference
    expect(result.error).not.toContain(".js:");
  });

  it("retorna objeto com chave 'error' (compatível com padrão das actions)", () => {
    const result = publicError(new Error("x"), "msg");
    expect(result).toHaveProperty("error");
    expect(Object.keys(result)).toEqual(["error"]);
  });

  it("loga o erro interno no servidor (console.error)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    publicError(new Error("internal detail"), "msg segura");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("log do servidor NÃO inclui secrets (trunca em 300 chars)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
      const logged = String(args.join(" "));
      // mensagem longa deve ser truncada — não deve ter mais de 300 chars de err.message
      expect(logged.length).toBeLessThan(500);
    });
    publicError(new Error("x".repeat(1000)), "msg");
    spy.mockRestore();
  });
});

// ─── Análise estática — Server Actions não vazam internals ───────────────────

const ACTION_FILES = [
  join(process.cwd(), "src/app/(auth)/actions.ts"),
  join(process.cwd(), "src/app/(dashboard)/settings/actions.ts"),
  join(process.cwd(), "src/app/(dashboard)/contacts/actions.ts"),
];

function readAction(path: string) {
  return readFileSync(path, "utf-8");
}

describe("hardening — Server Actions não retornam err.stack", () => {
  it("auth/actions.ts não retorna err.stack", () => {
    const src = readAction(ACTION_FILES[0]);
    expect(src).not.toContain("err.stack");
    expect(src).not.toContain("error.stack");
  });

  it("settings/actions.ts não retorna err.stack", () => {
    const src = readAction(ACTION_FILES[1]);
    expect(src).not.toContain("err.stack");
    expect(src).not.toContain("error.stack");
  });

  it("contacts/actions.ts não retorna err.stack", () => {
    const src = readAction(ACTION_FILES[2]);
    expect(src).not.toContain("err.stack");
    expect(src).not.toContain("error.stack");
  });
});

describe("hardening — settings actions usam publicError (não err.message direto)", () => {
  it("settings/actions.ts usa publicError nos catch blocks", () => {
    const src = readAction(ACTION_FILES[1]);
    expect(src).toContain("publicError(");
  });

  it("settings/actions.ts não expõe err.message diretamente em retornos", () => {
    const src = readAction(ACTION_FILES[1]);
    // Não deve ter padrão: return { error: err.message }
    expect(src).not.toMatch(/return\s*\{\s*error:\s*err\.message/);
    expect(src).not.toMatch(/return\s*\{\s*error:\s*error\.message/);
  });
});

describe("hardening — guards protegem todas as actions sensíveis", () => {
  it("settings/actions.ts verifica getWorkspaceContext em cada action mutante", () => {
    const src = readAction(ACTION_FILES[1]);
    const guardCount = (src.match(/getWorkspaceContext/g) ?? []).length;
    // updateWorkspace, inviteMember, updateMemberRole, deactivateMember, getSettingsData = 5
    expect(guardCount).toBeGreaterThanOrEqual(4);
  });

  it("contacts/actions.ts verifica getWorkspaceContext ou getCurrentWorkspaceId", () => {
    const src = readAction(ACTION_FILES[2]);
    expect(
      src.includes("getWorkspaceContext") || src.includes("getCurrentWorkspaceId")
    ).toBe(true);
  });

  it("auth/actions.ts nunca retorna stack trace em erros de auth", () => {
    const src = readAction(ACTION_FILES[0]);
    // Padrões de vazamento de erro bruto
    expect(src).not.toMatch(/return\s*\{\s*error:\s*(authError|error)\.message\s*\}/);
    expect(src).not.toContain("error.stack");
  });
});

describe("hardening — respostas públicas não contêm termos internos", () => {
  it("nenhuma action retorna 'JWT' ao usuário", () => {
    for (const file of ACTION_FILES) {
      const src = readAction(file);
      // Verifica que strings retornadas ao user não contêm 'JWT'
      // (a string pode estar em comentário, mas não em return { error: "...JWT..." })
      const returnStrings = [...src.matchAll(/return\s*\{[^}]*error:\s*["']([^"']+)["']/g)];
      for (const match of returnStrings) {
        expect(match[1]).not.toContain("JWT");
        expect(match[1]).not.toContain("SQL");
        expect(match[1]).not.toContain("postgres");
      }
    }
  });
});
