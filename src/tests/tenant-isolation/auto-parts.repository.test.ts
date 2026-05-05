import { describe, it, expect } from "vitest";
import { SupabaseAutoPartsRepository } from "@/repositories/auto-parts.repository";
import { buildMockClient } from "../helpers/mock-supabase";

const WS_A = "workspace-aaa-111";
const WS_B = "workspace-bbb-222";
const PART_ID = "part-uuid-001";
const QUOTE_ID = "quote-uuid-001";

const makePart = (override = {}) => ({
  id: PART_ID,
  part_number: "MB-LAT-001",
  name: "Lateral Dianteira",
  description: null,
  category: "Carroceria",
  color: "Azul",
  unit: "UN",
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...override,
});

const makePricing = (workspace_id = WS_A) => ({
  part_id: PART_ID,
  workspace_id,
  cost_price: 850,
  sale_price: 1190,
  markup_pct: 40,
  margin_pct: 28.57,
  updated_at: new Date().toISOString(),
});

const makeQuote = (workspace_id = WS_A) => ({
  id: QUOTE_ID,
  workspace_id,
  contact_id: null,
  status: "draft",
  notes: null,
  expires_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

// ─── Pricing ─────────────────────────────────────────────────────────────────

describe("AutoPartsRepository.getPricing — isolamento de tenant", () => {
  it("filtra pricing por workspace_id correto", async () => {
    const mock = buildMockClient({ returnData: makePricing(WS_A) });
    const repo = new SupabaseAutoPartsRepository(mock as never);

    await repo.getPricing(PART_ID, WS_A);

    const { ok, violations } = mock.assertAllQueriesHaveWorkspaceId(WS_A);
    expect(violations).toEqual([]);
    expect(ok).toBe(true);
  });

  it("não retorna pricing de outro workspace", async () => {
    const mock = buildMockClient({ returnData: makePricing(WS_A) });
    const repo = new SupabaseAutoPartsRepository(mock as never);

    await repo.getPricing(PART_ID, WS_B);

    // deve ter filtrado por WS_B — nenhuma query cruzada
    const captured = mock._queries;
    const pricingQuery = captured.find(q => q.table === "auto_parts_workspace_pricing");
    expect(pricingQuery?.eqFilters["workspace_id"]).toBe(WS_B);
  });
});

describe("AutoPartsRepository.upsertPricing — isolamento de tenant", () => {
  it("insere pricing com workspace_id correto", async () => {
    const mock = buildMockClient({ returnData: makePricing(WS_A) });
    const repo = new SupabaseAutoPartsRepository(mock as never);

    await repo.upsertPricing({ part_id: PART_ID, workspace_id: WS_A, cost_price: 850, sale_price: 1190 });

    const captured = mock._queries;
    const upsert = captured.find(q => q.table === "auto_parts_workspace_pricing" && q.operation === "insert");
    expect((upsert?.insertedData as any)?.workspace_id).toBe(WS_A);
  });
});

// ─── Quotes ───────────────────────────────────────────────────────────────────

describe("AutoPartsRepository.listQuotes — isolamento de tenant", () => {
  it("filtra orçamentos por workspace_id", async () => {
    const mock = buildMockClient({ returnData: [makeQuote(WS_A)] });
    const repo = new SupabaseAutoPartsRepository(mock as never);

    await repo.listQuotes(WS_A);

    const { ok, violations } = mock.assertAllQueriesHaveWorkspaceId(WS_A);
    expect(violations).toEqual([]);
    expect(ok).toBe(true);
  });

  it("workspaces diferentes têm queries isoladas", async () => {
    const mockA = buildMockClient({ returnData: [makeQuote(WS_A)] });
    const mockB = buildMockClient({ returnData: [makeQuote(WS_B)] });
    const repoA = new SupabaseAutoPartsRepository(mockA as never);
    const repoB = new SupabaseAutoPartsRepository(mockB as never);

    await repoA.listQuotes(WS_A);
    await repoB.listQuotes(WS_B);

    const capturedA = mockA._queries;
    const capturedB = mockB._queries;

    expect(capturedA[0]?.eqFilters["workspace_id"]).toBe(WS_A);
    expect(capturedB[0]?.eqFilters["workspace_id"]).toBe(WS_B);
  });
});

describe("AutoPartsRepository.createQuote — workspace_id nunca vem do client", () => {
  it("workspace_id no insert vem do servidor, não do form", async () => {
    const mock = buildMockClient({ returnData: makeQuote(WS_A) });
    const repo = new SupabaseAutoPartsRepository(mock as never);

    await repo.createQuote({ workspace_id: WS_A, notes: "teste" });

    const captured = mock._queries;
    const insert = captured.find(q => q.operation === "insert");
    expect((insert?.insertedData as any)?.workspace_id).toBe(WS_A);
    // nunca deve ter WS_B
    expect((insert?.insertedData as any)?.workspace_id).not.toBe(WS_B);
  });
});
