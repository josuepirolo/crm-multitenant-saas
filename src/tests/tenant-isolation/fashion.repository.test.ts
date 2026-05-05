import { describe, it, expect } from "vitest";
import { SupabaseFashionRepository } from "@/repositories/fashion.repository";
import { buildMockClient } from "../helpers/mock-supabase";

const WS_A = "workspace-aaa-111";
const WS_B = "workspace-bbb-222";
const PRODUCT_ID = "product-uuid-001";
const VARIANT_ID = "variant-uuid-001";

const makeProduct = (workspace_id = WS_A) => ({
  id: PRODUCT_ID,
  workspace_id,
  name: "Vestido Gabriela",
  description: null,
  category: "Vestidos",
  gender: "feminino",
  brand: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

const makeVariant = () => ({
  id: VARIANT_ID,
  product_id: PRODUCT_ID,
  color: "Azul Marinho",
  size: "M",
  sku: "GAB-AZM-M",
  is_active: true,
});

const makePricing = (workspace_id = WS_A) => ({
  variant_id: VARIANT_ID,
  workspace_id,
  cost_price: 89,
  sale_price: 219,
  markup_pct: 146.07,
  margin_pct: 59.36,
  updated_at: new Date().toISOString(),
});

const makeStock = (workspace_id = WS_A) => ({
  variant_id: VARIANT_ID,
  workspace_id,
  quantity: 14,
  min_stock: 3,
  updated_at: new Date().toISOString(),
});

// ─── Products ────────────────────────────────────────────────────────────────

describe("FashionRepository.listProducts — isolamento de tenant", () => {
  it("filtra produtos por workspace_id", async () => {
    const mock = buildMockClient({ returnData: [makeProduct(WS_A)] });
    const repo = new SupabaseFashionRepository(mock as never);

    await repo.listProducts(WS_A);

    const { ok, violations } = mock.assertAllQueriesHaveWorkspaceId(WS_A);
    expect(violations).toEqual([]);
    expect(ok).toBe(true);
  });

  it("workspaces A e B completamente isolados", async () => {
    const mockA = buildMockClient({ returnData: [makeProduct(WS_A)] });
    const mockB = buildMockClient({ returnData: [makeProduct(WS_B)] });

    await new SupabaseFashionRepository(mockA as never).listProducts(WS_A);
    await new SupabaseFashionRepository(mockB as never).listProducts(WS_B);

    expect(mockA._queries[0]?.eqFilters["workspace_id"]).toBe(WS_A);
    expect(mockB._queries[0]?.eqFilters["workspace_id"]).toBe(WS_B);
  });
});

describe("FashionRepository.createProduct — workspace_id do servidor", () => {
  it("insert usa workspace_id passado pelo servidor", async () => {
    const mock = buildMockClient({ returnData: makeProduct(WS_A) });
    const repo = new SupabaseFashionRepository(mock as never);

    await repo.createProduct({ workspace_id: WS_A, name: "Vestido Gabriela", category: "Vestidos" });

    const insert = mock._queries.find(q => q.operation === "insert");
    expect((insert?.insertedData as any)?.workspace_id).toBe(WS_A);
    expect((insert?.insertedData as any)?.workspace_id).not.toBe(WS_B);
  });
});

// ─── Pricing ─────────────────────────────────────────────────────────────────

describe("FashionRepository.upsertPricing — isolamento de tenant", () => {
  it("pricing upsert usa workspace_id correto", async () => {
    const mock = buildMockClient({ returnData: makePricing(WS_A) });
    const repo = new SupabaseFashionRepository(mock as never);

    await repo.upsertPricing({ variant_id: VARIANT_ID, workspace_id: WS_A, cost_price: 89, sale_price: 219 });

    const insert = mock._queries.find(q => q.operation === "insert");
    expect((insert?.insertedData as any)?.workspace_id).toBe(WS_A);
  });

  it("pricing de WS_B não vaza para WS_A", async () => {
    const mockA = buildMockClient({ returnData: makePricing(WS_A) });
    const mockB = buildMockClient({ returnData: makePricing(WS_B) });

    await new SupabaseFashionRepository(mockA as never).upsertPricing({ variant_id: VARIANT_ID, workspace_id: WS_A, cost_price: 89, sale_price: 219 });
    await new SupabaseFashionRepository(mockB as never).upsertPricing({ variant_id: VARIANT_ID, workspace_id: WS_B, cost_price: 95, sale_price: 250 });

    const capturedA = mockA._queries.find(q => q.operation === "insert");
    const capturedB = mockB._queries.find(q => q.operation === "insert");

    expect((capturedA?.insertedData as any)?.workspace_id).toBe(WS_A);
    expect((capturedB?.insertedData as any)?.workspace_id).toBe(WS_B);
    expect((capturedA?.insertedData as any)?.workspace_id).not.toBe(WS_B);
  });
});

// ─── Stock ───────────────────────────────────────────────────────────────────

describe("FashionRepository.updateStock — isolamento de tenant", () => {
  it("upsert de estoque usa workspace_id correto", async () => {
    const mock = buildMockClient({ returnData: makeStock(WS_A) });
    const repo = new SupabaseFashionRepository(mock as never);

    await repo.updateStock(VARIANT_ID, WS_A, 20);

    const insert = mock._queries.find(q => q.operation === "insert");
    expect((insert?.insertedData as any)?.workspace_id).toBe(WS_A);
    expect((insert?.insertedData as any)?.quantity).toBe(20);
  });
});
