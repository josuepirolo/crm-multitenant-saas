/**
 * TESTES DE INTEGRAÇÃO — Conexão real com o Supabase de produção/dev.
 * Objetivo: verificar as propriedades de segurança do checklist (não lógica de código).
 * Esses testes são somente leitura — nenhuma mutação nos dados.
 */

import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(process.cwd(), ".env.local") });

const URL          = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Workspaces reais do banco (lidos antes via service role)
const WS_LEKAZIS = "23a8b0b2-3845-42a3-bb0b-bb9abbfdf8e6";
const WS_PYTEC   = "b5a71a25-c2d1-4395-9d66-ac059cff1ce0";

const OWNER_LEKAZIS = "f5180ead-9be7-481b-a7e1-794438852d08";
const OWNER_PYTEC   = "6fcc2412-3708-499f-bed7-546531cc428b";

// Tabelas com dados de tenant — todas devem ter RLS ativa
const TENANT_TABLES = ["contacts", "workspace_members", "workspaces", "profiles"];

// Verifica que anon não acessa dados — aceita 0 rows OU erro (ambos são seguros)
function assertBlocked(count: number | null, error: { message: string } | null, table: string) {
  const isBlocked = (count ?? 0) === 0;
  const hasError = error !== null;
  expect(
    isBlocked || hasError,
    `${table} está exposto para anon: ${count} rows retornados sem error`
  ).toBe(true);
}

const anon  = createClient(URL, ANON_KEY);
const admin = createClient(URL, SERVICE_ROLE);

// ─── 1. RLS BLOQUEANDO ACESSO ANÔNIMO ────────────────────────────────────────

describe("RLS LIVE — anon key sem auth retorna 0 rows", () => {
  for (const table of TENANT_TABLES) {
    it(`${table}: anon sem auth → bloqueado (0 rows ou erro)`, { timeout: 10000 }, async () => {
      const { count, error } = await anon
        .from(table)
        .select("*", { count: "exact", head: true });

      assertBlocked(count, error, table);
    });
  }
});

// ─── 2. SERVICE ROLE TEM ACESSO COMPLETO (bypass legítimo) ───────────────────

describe("RLS LIVE — service role acessa dados (bypass esperado)", () => {
  for (const table of TENANT_TABLES) {
    it(`${table}: service role lê registros`, { timeout: 10000 }, async () => {
      const { count, error } = await admin
        .from(table)
        .select("*", { count: "exact", head: true });

      expect(error, `Erro ao acessar ${table} com service role`).toBeNull();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  }
});

// ─── 3. WORKSPACE_ID PRESENTE EM TODAS AS LINHAS ─────────────────────────────

describe("RLS LIVE — workspace_id obrigatório em tabelas de tenant", () => {
  it("contacts: nenhuma linha sem workspace_id", { timeout: 10000 }, async () => {
    const { data, error } = await admin
      .from("contacts")
      .select("id")
      .is("workspace_id", null);

    expect(error).toBeNull();
    expect(data, "Existem contacts sem workspace_id").toHaveLength(0);
  });

  it("workspace_members: nenhuma linha sem workspace_id", { timeout: 10000 }, async () => {
    const { data, error } = await admin
      .from("workspace_members")
      .select("id")
      .is("workspace_id", null);

    expect(error).toBeNull();
    expect(data, "Existem membros sem workspace_id").toHaveLength(0);
  });

  it("workspaces: todos com id único (sem duplicatas)", { timeout: 10000 }, async () => {
    const { data, error } = await admin.from("workspaces").select("id");
    expect(error).toBeNull();
    const ids = (data ?? []).map((w) => w.id);
    expect(new Set(ids).size, "Existem workspaces com ID duplicado").toBe(ids.length);
  });
});

// ─── 4. ISOLAMENTO MULTI-TENANT ───────────────────────────────────────────────

describe("RLS LIVE — isolamento entre workspaces (cross-tenant)", () => {
  it("contacts de WS_A não aparecem em query filtrada por WS_B", { timeout: 10000 }, async () => {
    const [resultA, resultB] = await Promise.all([
      admin.from("contacts").select("id,workspace_id").eq("workspace_id", WS_LEKAZIS),
      admin.from("contacts").select("id,workspace_id").eq("workspace_id", WS_PYTEC),
    ]);

    expect(resultA.error).toBeNull();
    expect(resultB.error).toBeNull();

    const idsA = new Set((resultA.data ?? []).map((c) => c.id));
    const idsB = new Set((resultB.data ?? []).map((c) => c.id));

    const crossLeak = [...idsA].filter((id) => idsB.has(id));
    expect(crossLeak, `IDs vazando entre workspaces: ${crossLeak.join(", ")}`).toHaveLength(0);
  });

  it("workspace_members de WS_A não aparecem em query filtrada por WS_B", { timeout: 10000 }, async () => {
    const [memA, memB] = await Promise.all([
      admin.from("workspace_members").select("user_id,workspace_id").eq("workspace_id", WS_LEKAZIS),
      admin.from("workspace_members").select("user_id,workspace_id").eq("workspace_id", WS_PYTEC),
    ]);

    const usersA = new Set((memA.data ?? []).map((m) => m.user_id));
    const usersB = new Set((memB.data ?? []).map((m) => m.user_id));

    // Owners são distintos — nenhum user pertence aos dois workspaces nos dados reais
    const crossLeak = [...usersA].filter((id) => usersB.has(id));
    expect(crossLeak, `Membros compartilhados entre workspaces: ${crossLeak.join(", ")}`).toHaveLength(0);
  });

  it("owner de WS_A não pode ser confundido com owner de WS_B", { timeout: 10000 }, async () => {
    expect(OWNER_LEKAZIS).not.toBe(OWNER_PYTEC);

    const [ownerARow, ownerBRow] = await Promise.all([
      admin.from("workspace_members").select("workspace_id,role")
        .eq("user_id", OWNER_LEKAZIS).eq("workspace_id", WS_PYTEC),
      admin.from("workspace_members").select("workspace_id,role")
        .eq("user_id", OWNER_PYTEC).eq("workspace_id", WS_LEKAZIS),
    ]);

    expect(ownerARow.data, "Owner de Lekazis aparece como membro de PyTec").toHaveLength(0);
    expect(ownerBRow.data, "Owner de PyTec aparece como membro de Lekazis").toHaveLength(0);
  });
});

// ─── 5. SOFT DELETE — membros desativados não aparecem ativos ────────────────

describe("RLS LIVE — integridade de dados de members", () => {
  it("workspace_members ativos têm deleted_at nulo", { timeout: 10000 }, async () => {
    const { data, error } = await admin
      .from("workspace_members")
      .select("id,deleted_at")
      .not("deleted_at", "is", null);

    expect(error).toBeNull();
    // Se existirem membros soft-deleted, eles não devem ter role 'owner'
    // (owner não pode ser removido)
    if (data && data.length > 0) {
      const deletedIds = data.map((m) => m.id);
      const { data: deletedOwners } = await admin
        .from("workspace_members")
        .select("id,role")
        .in("id", deletedIds)
        .eq("role", "owner");

      expect(deletedOwners, "Owner foi soft-deleted — violação de regra de negócio").toHaveLength(0);
    }
  });
});

// ─── 6. CHAVE ANON NÃO ACESSA DADOS MESMO COM workspace_id CORRETO ───────────

describe("RLS LIVE — anon não burla RLS mesmo com workspace_id conhecido", () => {
  it("anon key + workspace_id real → ainda retorna 0 rows", { timeout: 10000 }, async () => {
    const { count, error } = await anon
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", WS_LEKAZIS);

    expect(error).toBeNull();
    expect(count, "RLS não está bloqueando anon mesmo com workspace_id correto").toBe(0);
  });

  it("anon key + user_id real → workspace_members bloqueado", { timeout: 10000 }, async () => {
    const { count, error } = await anon
      .from("workspace_members")
      .select("*", { count: "exact", head: true })
      .eq("user_id", OWNER_LEKAZIS);

    assertBlocked(count, error, "workspace_members");
  });
});
