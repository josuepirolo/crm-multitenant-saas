import { describe, it, expect, beforeEach } from "vitest";
import { SupabaseContactRepository } from "@/repositories/contact.repository";
import { buildMockClient } from "../helpers/mock-supabase";

const WS_A = "workspace-aaa-111";
const WS_B = "workspace-bbb-222";

const makeContact = (override: Partial<{ id: string; workspace_id: string }> = {}) => ({
  id: "contact-1",
  workspace_id: WS_A,
  name: "João Silva",
  phone: "+5511999999999",
  email: "joao@empresa.com",
  document: null,
  company: "Empresa A",
  status: "lead" as const,
  avatar_url: null,
  notes: null,
  custom_fields: {},
  created_by: "user-1",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
  ...override,
});

// ─── findAll ──────────────────────────────────────────────────────────────────

describe("ContactRepository.findAll — isolamento de tenant", () => {
  it("deve sempre filtrar por workspace_id", async () => {
    const mock = buildMockClient({ returnData: [makeContact()], returnCount: 1 });
    const repo = new SupabaseContactRepository(mock as never);

    await repo.findAll(WS_A, {}, 0, 20);

    const { ok, violations } = mock.assertAllQueriesHaveWorkspaceId(WS_A);
    expect(violations).toEqual([]);
    expect(ok).toBe(true);
  });

  it("retorna apenas contatos do workspace correto", async () => {
    const contactA = makeContact({ workspace_id: WS_A });
    const mock = buildMockClient({ returnData: [contactA], returnCount: 1 });
    const repo = new SupabaseContactRepository(mock as never);

    const { data } = await repo.findAll(WS_A, {}, 0, 20);

    expect(data.every((c) => c.workspace_id === WS_A)).toBe(true);
  });

  it("não deve retornar contatos de outro workspace na mesma query", async () => {
    // Simula que workspace B chamou findAll com WS_A — repositório deve rejeitar o cruzamento
    const contactB = makeContact({ workspace_id: WS_B });
    const mock = buildMockClient({ returnData: [contactB], returnCount: 1 });
    const repo = new SupabaseContactRepository(mock as never);

    // Usuário de WS_B buscando WS_B
    await repo.findAll(WS_B, {}, 0, 20);

    // A query deve ter filtrado por WS_B, nunca WS_A
    const q = mock._queries.find((q) => q.table === "contacts");
    expect(q?.eqFilters["workspace_id"]).toBe(WS_B);
    expect(q?.eqFilters["workspace_id"]).not.toBe(WS_A);
  });
});

// ─── findById ─────────────────────────────────────────────────────────────────

describe("ContactRepository.findById — isolamento de tenant", () => {
  it("deve filtrar por workspace_id E id simultaneamente", async () => {
    const contact = makeContact();
    const mock = buildMockClient({ returnData: contact });
    const repo = new SupabaseContactRepository(mock as never);

    await repo.findById(WS_A, "contact-1");

    const q = mock._queries.find((q) => q.table === "contacts");
    expect(q?.eqFilters["workspace_id"]).toBe(WS_A);
    expect(q?.eqFilters["id"]).toBe("contact-1");
  });

  it("usuário de WS_B não pode acessar contato de WS_A por id", async () => {
    // Mock simula RLS: nenhum dado retornado para workspace errado
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseContactRepository(mock as never);

    const result = await repo.findById(WS_B, "contact-1");

    // Resultado null = RLS bloqueou ou workspace_id não bateu
    expect(result).toBeNull();
  });
});

// ─── create ───────────────────────────────────────────────────────────────────

describe("ContactRepository.create — workspace_id obrigatório", () => {
  it("deve inserir workspace_id no payload de criação", async () => {
    const contact = makeContact();
    const mock = buildMockClient({ returnData: contact });
    const repo = new SupabaseContactRepository(mock as never);

    await repo.create({
      workspace_id: WS_A,
      name: "João Silva",
      phone: "+5511999999999",
    });

    const insertQuery = mock._queries.find((q) => q.operation === "insert");
    expect(insertQuery).toBeDefined();
    expect((insertQuery?.insertedData as Record<string, unknown>)?.workspace_id).toBe(WS_A);
  });

  it("criação sem workspace_id não deve ser aceita", async () => {
    const mock = buildMockClient({ returnError: "null value in column workspace_id" });
    const repo = new SupabaseContactRepository(mock as never);

    await expect(
      repo.create({ workspace_id: "", name: "Sem workspace" })
    ).rejects.toThrow();
  });
});

// ─── update ───────────────────────────────────────────────────────────────────

describe("ContactRepository.update — isolamento de tenant", () => {
  it("deve filtrar update por workspace_id E id", async () => {
    const contact = makeContact();
    const mock = buildMockClient({ returnData: contact });
    const repo = new SupabaseContactRepository(mock as never);

    await repo.update(WS_A, "contact-1", { name: "Novo Nome" });

    const q = mock._queries.find((q) => q.operation === "update");
    expect(q?.eqFilters["workspace_id"]).toBe(WS_A);
    expect(q?.eqFilters["id"]).toBe("contact-1");
  });

  it("usuário de WS_B não pode atualizar contato de WS_A", async () => {
    // RLS simulado: retorna erro para workspace incorreto
    const mock = buildMockClient({ returnError: "No rows found" });
    const repo = new SupabaseContactRepository(mock as never);

    await expect(repo.update(WS_B, "contact-1", { name: "Hack" })).rejects.toThrow();
  });
});

// ─── softDelete ───────────────────────────────────────────────────────────────

describe("ContactRepository.softDelete — isolamento de tenant", () => {
  it("deve filtrar delete por workspace_id E id", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseContactRepository(mock as never);

    await repo.softDelete(WS_A, "contact-1");

    const q = mock._queries.find((q) => q.operation === "update");
    expect(q?.eqFilters["workspace_id"]).toBe(WS_A);
    expect(q?.eqFilters["id"]).toBe("contact-1");
  });

  it("usuário de WS_B não pode deletar contato de WS_A", async () => {
    const mock = buildMockClient({ returnError: "permission denied" });
    const repo = new SupabaseContactRepository(mock as never);

    await expect(repo.softDelete(WS_B, "contact-1")).rejects.toThrow();
  });
});
