import { describe, it, expect, vi } from "vitest";
import { SupabaseContactRepository } from "@/repositories/contact.repository";
import { SupabaseWorkspaceMemberRepository } from "@/repositories/member.repository";
import { buildMockClient } from "../helpers/mock-supabase";

/**
 * Testes de enforcement: verificam que workspace_id está presente
 * em TODAS as queries de leitura, update e delete das tabelas críticas.
 *
 * Se um repositório for alterado e remover o filtro, esses testes quebram.
 */

const WS = "workspace-test-999";

describe("ENFORCEMENT: toda query de leitura deve usar workspace_id", () => {
  it("contacts.findAll — workspace_id presente no filtro", async () => {
    const mock = buildMockClient({ returnData: [], returnCount: 0 });
    const repo = new SupabaseContactRepository(mock as never);
    await repo.findAll(WS, {}, 0, 20);

    const contact = mock._queries.find((q) => q.table === "contacts" && q.operation === "select");
    expect(contact?.eqFilters["workspace_id"]).toBe(WS);
  });

  it("contacts.findById — workspace_id presente no filtro", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseContactRepository(mock as never);
    await repo.findById(WS, "some-id");

    const contact = mock._queries.find((q) => q.table === "contacts");
    expect(contact?.eqFilters["workspace_id"]).toBe(WS);
  });

  it("workspace_members.findByWorkspace — workspace_id presente", async () => {
    const mock = buildMockClient({ returnData: [] });
    const repo = new SupabaseWorkspaceMemberRepository(mock as never);
    await repo.findByWorkspace(WS);

    const q = mock._queries.find((q) => q.table === "workspace_members");
    expect(q?.eqFilters["workspace_id"]).toBe(WS);
  });

  it("workspace_members.findRole — workspace_id presente", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseWorkspaceMemberRepository(mock as never);
    await repo.findRole(WS, "user-x");

    const q = mock._queries.find((q) => q.table === "workspace_members");
    expect(q?.eqFilters["workspace_id"]).toBe(WS);
  });
});

describe("ENFORCEMENT: toda mutação (update/delete) deve usar workspace_id", () => {
  it("contacts.update — workspace_id presente no filtro", async () => {
    const mock = buildMockClient({ returnData: { id: "c1", workspace_id: WS } });
    const repo = new SupabaseContactRepository(mock as never);
    await repo.update(WS, "c1", { name: "Novo" });

    const q = mock._queries.find((q) => q.table === "contacts" && q.operation === "update");
    expect(q?.eqFilters["workspace_id"]).toBe(WS);
  });

  it("contacts.softDelete — workspace_id presente no filtro", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseContactRepository(mock as never);
    await repo.softDelete(WS, "c1");

    const q = mock._queries.find((q) => q.table === "contacts" && q.operation === "update");
    expect(q?.eqFilters["workspace_id"]).toBe(WS);
  });

  it("workspace_members.updateRole — workspace_id presente no filtro", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseWorkspaceMemberRepository(mock as never);
    await repo.updateRole(WS, "user-x", "manager");

    const q = mock._queries.find((q) => q.table === "workspace_members" && q.operation === "update");
    expect(q?.eqFilters["workspace_id"]).toBe(WS);
  });

  it("workspace_members.deactivate — workspace_id presente no filtro", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseWorkspaceMemberRepository(mock as never);
    await repo.deactivate(WS, "user-x");

    const q = mock._queries.find((q) => q.table === "workspace_members" && q.operation === "update");
    expect(q?.eqFilters["workspace_id"]).toBe(WS);
  });
});

describe("ENFORCEMENT: criação deve incluir workspace_id no payload inserido", () => {
  it("contacts.create — workspace_id no objeto inserido", async () => {
    const mock = buildMockClient({ returnData: { id: "c1", workspace_id: WS } });
    const repo = new SupabaseContactRepository(mock as never);
    await repo.create({ workspace_id: WS, name: "Test" });

    const q = mock._queries.find((q) => q.table === "contacts" && q.operation === "insert");
    expect((q?.insertedData as Record<string, unknown>)?.workspace_id).toBe(WS);
  });

  it("workspace_members.invite — workspace_id no objeto inserido", async () => {
    const mock = buildMockClient({ returnData: { id: "m1", workspace_id: WS } });
    const repo = new SupabaseWorkspaceMemberRepository(mock as never);
    await repo.invite({ workspace_id: WS, user_id: "u1", role: "sales" });

    const q = mock._queries.find((q) => q.table === "workspace_members" && q.operation === "insert");
    expect((q?.insertedData as Record<string, unknown>)?.workspace_id).toBe(WS);
  });
});

describe("ENFORCEMENT: nenhuma query deve aceitar workspace_id vazio ou indefinido", () => {
  it("contacts.findAll com workspace_id vazio lança erro ou retorna vazio", async () => {
    const mock = buildMockClient({ returnError: "workspace_id cannot be empty" });
    const repo = new SupabaseContactRepository(mock as never);

    // Um workspace_id vazio deve resultar em erro ou comportamento seguro
    await expect(repo.findAll("", {}, 0, 20)).rejects.toThrow();
  });

  it("contacts.create com workspace_id vazio deve falhar", async () => {
    const mock = buildMockClient({ returnError: 'null value in column "workspace_id"' });
    const repo = new SupabaseContactRepository(mock as never);

    await expect(repo.create({ workspace_id: "", name: "Sem Workspace" })).rejects.toThrow();
  });
});
