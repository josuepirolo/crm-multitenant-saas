/**
 * TESTES DE INTEGRAÇÃO — Fluxo autenticado + mutações.
 * Cria usuários reais de teste, roda os cenários e faz cleanup.
 * Requer conexão com Supabase — não usa mocks.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestFixtures,
  cleanupTestFixtures,
  signInAs,
  TEST_EMAILS,
  admin,
  type TestFixture,
} from "./helpers/test-setup";

let fixture: TestFixture;

beforeAll(async () => {
  fixture = await createTestFixtures();
}, 30000);

afterAll(async () => {
  if (fixture) await cleanupTestFixtures(fixture);
}, 30000);

// ─── 1. FLUXO AUTENTICADO — LEITURA ──────────────────────────────────────────

describe("AUTH LIVE — usuário autenticado lê apenas seu workspace", () => {
  it("ownerA lê contacts do próprio workspace", { timeout: 15000 }, async () => {
    const client = await signInAs(TEST_EMAILS.ownerA);
    const { data, error } = await client
      .from("contacts")
      .select("id,workspace_id")
      .eq("workspace_id", fixture.workspaces.wsA);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(1);
    expect(data?.every((c) => c.workspace_id === fixture.workspaces.wsA)).toBe(true);
  });

  it("ownerA não lê contacts do wsB", { timeout: 15000 }, async () => {
    const client = await signInAs(TEST_EMAILS.ownerA);
    const { data, error } = await client
      .from("contacts")
      .select("id,workspace_id")
      .eq("workspace_id", fixture.workspaces.wsB);

    // RLS bloqueia: zero rows ou erro
    const bloqueado = (data?.length ?? 0) === 0 || error !== null;
    expect(bloqueado, "ownerA está lendo contacts do wsB").toBe(true);
  });

  it("memberA lê contacts do wsA", { timeout: 15000 }, async () => {
    const client = await signInAs(TEST_EMAILS.memberA);
    const { data, error } = await client
      .from("contacts")
      .select("id,workspace_id")
      .eq("workspace_id", fixture.workspaces.wsA);

    expect(error).toBeNull();
    expect(data?.every((c) => c.workspace_id === fixture.workspaces.wsA)).toBe(true);
  });

  it("memberA não lê contacts do wsB", { timeout: 15000 }, async () => {
    const client = await signInAs(TEST_EMAILS.memberA);
    const { data, error } = await client
      .from("contacts")
      .select("id,workspace_id")
      .eq("workspace_id", fixture.workspaces.wsB);

    const bloqueado = (data?.length ?? 0) === 0 || error !== null;
    expect(bloqueado, "memberA está lendo contacts do wsB").toBe(true);
  });

  it("ownerB não vê membros do wsA", { timeout: 15000 }, async () => {
    const client = await signInAs(TEST_EMAILS.ownerB);
    const { data, error } = await client
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", fixture.workspaces.wsA);

    const bloqueado = (data?.length ?? 0) === 0 || error !== null;
    expect(bloqueado, "ownerB está vendo membros do wsA").toBe(true);
  });
});

// ─── 2. MUTAÇÕES — INSERT ─────────────────────────────────────────────────────

describe("AUTH LIVE — mutações bloqueiam cross-tenant", () => {
  const createdIds: string[] = [];

  afterAll(async () => {
    // Limpa qualquer contact que tenha sido criado nos testes
    if (createdIds.length > 0) {
      await admin.from("contacts").delete().in("id", createdIds);
    }
  });

  it("ownerA cria contact no próprio workspace", { timeout: 15000 }, async () => {
    const client = await signInAs(TEST_EMAILS.ownerA);
    const { data, error } = await client
      .from("contacts")
      .insert({
        workspace_id: fixture.workspaces.wsA,
        name: "TEST_Insert_Legítimo",
        phone: "+5511000000001",
        status: "lead",
      })
      .select("id,workspace_id")
      .single();

    expect(error).toBeNull();
    expect(data?.workspace_id).toBe(fixture.workspaces.wsA);
    if (data?.id) createdIds.push(data.id);
  });

  it("ownerA tenta inserir contact forçando workspace_id do wsB — bloqueado", { timeout: 15000 }, async () => {
    const client = await signInAs(TEST_EMAILS.ownerA);
    const { data, error } = await client
      .from("contacts")
      .insert({
        workspace_id: fixture.workspaces.wsB, // tentativa de cross-tenant
        name: "TEST_Insert_Cross_Tenant",
        phone: "+5511000000002",
        status: "lead",
      })
      .select("id")
      .single();

    // RLS deve bloquear — ou error, ou data é null
    const bloqueado = error !== null || data === null;
    expect(bloqueado, "ownerA conseguiu inserir contact no wsB").toBe(true);
    if (data?.id) createdIds.push(data.id); // cleanup precautório
  });
});

// ─── 3. MUTAÇÕES — UPDATE ────────────────────────────────────────────────────

describe("AUTH LIVE — update cross-tenant bloqueado", () => {
  it("ownerA não consegue atualizar contact do wsB", { timeout: 15000 }, async () => {
    const client = await signInAs(TEST_EMAILS.ownerA);
    const { data, error } = await client
      .from("contacts")
      .update({ name: "HACK_UPDATE" })
      .eq("id", fixture.contacts.contactB) // contact de wsB
      .select("id");

    // RLS deve bloquear: zero rows atualizados ou erro
    const bloqueado = (data?.length ?? 0) === 0 || error !== null;
    expect(bloqueado, "ownerA atualizou contact do wsB").toBe(true);

    // Confirma que o contact não foi alterado
    const { data: check } = await admin
      .from("contacts")
      .select("name")
      .eq("id", fixture.contacts.contactB)
      .single();

    expect(check?.name).not.toBe("HACK_UPDATE");
  });

  it("ownerB não consegue atualizar contact do wsA", { timeout: 15000 }, async () => {
    const client = await signInAs(TEST_EMAILS.ownerB);
    const { data, error } = await client
      .from("contacts")
      .update({ name: "HACK_UPDATE_B" })
      .eq("id", fixture.contacts.contactA) // contact de wsA
      .select("id");

    const bloqueado = (data?.length ?? 0) === 0 || error !== null;
    expect(bloqueado, "ownerB atualizou contact do wsA").toBe(true);

    const { data: check } = await admin
      .from("contacts")
      .select("name")
      .eq("id", fixture.contacts.contactA)
      .single();

    expect(check?.name).not.toBe("HACK_UPDATE_B");
  });
});

// ─── 4. MUTAÇÕES — DELETE ────────────────────────────────────────────────────

describe("AUTH LIVE — delete cross-tenant bloqueado", () => {
  it("ownerA não consegue deletar/soft-delete contact do wsB", { timeout: 15000 }, async () => {
    const client = await signInAs(TEST_EMAILS.ownerA);

    // Tenta soft delete via update de deleted_at
    const { data, error } = await client
      .from("contacts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", fixture.contacts.contactB)
      .select("id");

    const bloqueado = (data?.length ?? 0) === 0 || error !== null;
    expect(bloqueado, "ownerA fez soft-delete em contact do wsB").toBe(true);

    // Confirma que o contact ainda existe intacto
    const { data: check } = await admin
      .from("contacts")
      .select("id,deleted_at")
      .eq("id", fixture.contacts.contactB)
      .single();

    expect(check?.deleted_at).toBeNull();
  });

  it("ownerA não consegue fazer hard delete de contact do wsB", { timeout: 15000 }, async () => {
    const client = await signInAs(TEST_EMAILS.ownerA);
    const { data, error } = await client
      .from("contacts")
      .delete()
      .eq("id", fixture.contacts.contactB)
      .select("id");

    const bloqueado = (data?.length ?? 0) === 0 || error !== null;
    expect(bloqueado, "ownerA deletou contact do wsB").toBe(true);

    // Contact ainda existe
    const { data: check } = await admin
      .from("contacts")
      .select("id")
      .eq("id", fixture.contacts.contactB)
      .single();

    expect(check?.id).toBe(fixture.contacts.contactB);
  });
});

// ─── 5. WORKSPACE_ID FORÇADO NÃO VAZA ───────────────────────────────────────

describe("AUTH LIVE — workspace_id do cliente nunca é confiado", () => {
  it("autenticado: workspace_id em query é ignorado pelo RLS se não pertence ao user", { timeout: 15000 }, async () => {
    const client = await signInAs(TEST_EMAILS.memberA);

    // memberA pertence a wsA — tenta listar contacts do wsB usando a anon key
    const { data } = await client
      .from("contacts")
      .select("id,workspace_id")
      .eq("workspace_id", fixture.workspaces.wsB);

    // RLS deve filtrar — nenhum resultado do wsB para um usuário de wsA
    const wsAIds = (data ?? []).filter((c) => c.workspace_id === fixture.workspaces.wsB);
    expect(wsAIds, "memberA leu contacts do wsB via workspace_id na query").toHaveLength(0);
  });
});
