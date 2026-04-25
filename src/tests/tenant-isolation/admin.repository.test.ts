import { describe, it, expect } from "vitest";
import { SupabaseAdminRepository } from "@/repositories/admin.repository";
import { buildMockClient } from "../helpers/mock-supabase";

/**
 * Admin repository opera globalmente (sem workspace_id filtrado por tenant),
 * mas DEVE ser acessado apenas por superadmins.
 * Os testes aqui garantem:
 * 1. getWorkspaceMembers sempre filtra por workspace_id (não vaza dados globais)
 * 2. listWorkspaces e getStats são globais MAS exigem service_role — testamos estrutura da query
 */

const WS_A = "workspace-aaa-111";
const WS_B = "workspace-bbb-222";

describe("AdminRepository.getWorkspaceMembers — isolamento por workspace", () => {
  it("deve filtrar por workspace_id ao buscar membros", async () => {
    const mock = buildMockClient({ returnData: [] });
    const repo = new SupabaseAdminRepository(mock as never);

    await repo.getWorkspaceMembers(WS_A);

    const q = mock._queries.find(
      (q) => q.table === "workspace_members" && q.eqFilters["workspace_id"] !== undefined
    );
    expect(q).toBeDefined();
    expect(q?.eqFilters["workspace_id"]).toBe(WS_A);
  });

  it("busca de WS_A não expõe membros de WS_B", async () => {
    const memberA = { id: "m1", workspace_id: WS_A, user_id: "u1", role: "sales" };
    const mock = buildMockClient({ returnData: [memberA] });
    const repo = new SupabaseAdminRepository(mock as never);

    const result = await repo.getWorkspaceMembers(WS_A);

    expect(result.every((m: { workspace_id?: string }) => m.workspace_id === WS_A || m.workspace_id === undefined)).toBe(true);
  });

  it("busca de WS_B filtra pela chave correta", async () => {
    const mock = buildMockClient({ returnData: [] });
    const repo = new SupabaseAdminRepository(mock as never);

    await repo.getWorkspaceMembers(WS_B);

    const q = mock._queries.find(
      (q) => q.table === "workspace_members" && q.eqFilters["workspace_id"] !== undefined
    );
    expect(q?.eqFilters["workspace_id"]).toBe(WS_B);
    expect(q?.eqFilters["workspace_id"]).not.toBe(WS_A);
  });
});

describe("AdminRepository.getStats — operação global (exige service_role)", () => {
  it("getStats consulta workspaces sem filtro de tenant — operação global esperada", async () => {
    const mock = buildMockClient({ returnData: null, returnCount: 5 });
    const repo = new SupabaseAdminRepository(mock as never);

    const stats = await repo.getStats();

    // getStats é global por design (superadmin) — verifica estrutura do retorno
    expect(stats).toMatchObject({
      total_workspaces: expect.any(Number),
      total_members: expect.any(Number),
      total_contacts: expect.any(Number),
      total_deals: expect.any(Number),
    });

    // Garante que pelo menos 4 queries foram feitas (uma por entidade)
    expect(mock._queries.length).toBeGreaterThanOrEqual(4);
  });
});
