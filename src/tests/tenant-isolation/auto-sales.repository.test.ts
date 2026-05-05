import { describe, it, expect } from "vitest";
import { SupabaseAutoSalesRepository } from "@/repositories/auto-sales.repository";
import { buildMockClient } from "../helpers/mock-supabase";

const WS_A = "workspace-aaa-111";
const WS_B = "workspace-bbb-222";
const INV_ID = "inventory-uuid-001";
const MODEL_ID = "model-uuid-001";

const makeInventory = (workspace_id = WS_A) => ({
  id: INV_ID,
  workspace_id,
  model_id: MODEL_ID,
  plate: "ABC-1234",
  color: "Cinza",
  year_manufacture: 2025,
  year_model: 2026,
  trim: "XRE",
  mileage_km: 0,
  fuel: "Híbrido",
  transmission: "CVT",
  chassis: null,
  renavam: null,
  condition: "new",
  has_sinistro: false,
  has_cautelar_issue: false,
  accepts_trade_in: true,
  requires_down_pay: false,
  accepts_financing: true,
  status: "available",
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const makeProposal = (workspace_id = WS_A) => ({
  id: "proposal-001",
  workspace_id,
  contact_id: null,
  deal_id: null,
  inventory_id: INV_ID,
  trade_in_plate: null,
  trade_in_model_id: null,
  trade_in_year: null,
  trade_in_mileage_km: null,
  trade_in_estimated_value: null,
  final_price: 158900,
  down_payment: null,
  financing_months: null,
  financing_institution: null,
  status: "draft",
  notes: null,
  expires_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// ─── Inventory ────────────────────────────────────────────────────────────────

describe("AutoSalesRepository.listInventory — isolamento de tenant", () => {
  it("filtra estoque por workspace_id", async () => {
    const mock = buildMockClient({ returnData: [makeInventory(WS_A)] });
    const repo = new SupabaseAutoSalesRepository(mock as never);

    await repo.listInventory(WS_A);

    const { ok, violations } = mock.assertAllQueriesHaveWorkspaceId(WS_A);
    expect(violations).toEqual([]);
    expect(ok).toBe(true);
  });

  it("workspaces A e B têm queries completamente isoladas", async () => {
    const mockA = buildMockClient({ returnData: [makeInventory(WS_A)] });
    const mockB = buildMockClient({ returnData: [makeInventory(WS_B)] });

    await new SupabaseAutoSalesRepository(mockA as never).listInventory(WS_A);
    await new SupabaseAutoSalesRepository(mockB as never).listInventory(WS_B);

    expect(mockA._queries[0]?.eqFilters["workspace_id"]).toBe(WS_A);
    expect(mockB._queries[0]?.eqFilters["workspace_id"]).toBe(WS_B);
  });
});

describe("AutoSalesRepository.createInventory — workspace_id do servidor", () => {
  it("insert sempre usa workspace_id passado pelo servidor", async () => {
    const mock = buildMockClient({ returnData: makeInventory(WS_A) });
    const repo = new SupabaseAutoSalesRepository(mock as never);

    await repo.createInventory({
      workspace_id: WS_A,
      model_id: MODEL_ID,
      color: "Cinza",
      year_manufacture: 2025,
      year_model: 2026,
    });

    const insert = mock._queries.find(q => q.operation === "insert");
    expect((insert?.insertedData as any)?.workspace_id).toBe(WS_A);
    expect((insert?.insertedData as any)?.workspace_id).not.toBe(WS_B);
  });
});

describe("AutoSalesRepository.updateStatus — filtra por workspace_id", () => {
  it("update sempre inclui workspace_id no filtro", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseAutoSalesRepository(mock as never);

    await repo.updateStatus(INV_ID, WS_A, "sold");

    const update = mock._queries.find(q => q.operation === "update");
    expect(update?.eqFilters["workspace_id"]).toBe(WS_A);
    expect(update?.eqFilters["id"]).toBe(INV_ID);
  });
});

// ─── Proposals ────────────────────────────────────────────────────────────────

describe("AutoSalesRepository.listProposals — isolamento de tenant", () => {
  it("filtra propostas por workspace_id", async () => {
    const mock = buildMockClient({ returnData: [makeProposal(WS_A)] });
    const repo = new SupabaseAutoSalesRepository(mock as never);

    await repo.listProposals(WS_A);

    const { ok, violations } = mock.assertAllQueriesHaveWorkspaceId(WS_A);
    expect(violations).toEqual([]);
    expect(ok).toBe(true);
  });
});

describe("AutoSalesRepository.createProposal — workspace_id do servidor", () => {
  it("proposal insert usa workspace_id do servidor", async () => {
    const mock = buildMockClient({ returnData: makeProposal(WS_A) });
    const repo = new SupabaseAutoSalesRepository(mock as never);

    await repo.createProposal({ workspace_id: WS_A, final_price: 158900 });

    const insert = mock._queries.find(q => q.operation === "insert");
    expect((insert?.insertedData as any)?.workspace_id).toBe(WS_A);
  });
});
