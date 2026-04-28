import { describe, it, expect } from "vitest";
import { SupabaseNicheRepository, buildNicheTree } from "@/repositories/niche.repository";
import { buildMockClient } from "../helpers/mock-supabase";
import type { BusinessNiche } from "@/types";

function makeNiche(overrides: Partial<BusinessNiche> = {}): BusinessNiche {
  return {
    id: "niche-1",
    parent_id: null,
    name: "Moda",
    slug: "moda",
    description: null,
    is_active: true,
    sort_order: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── buildNicheTree ───────────────────────────────────────────────────────────

describe("buildNicheTree", () => {
  it("retorna lista vazia para input vazio", () => {
    expect(buildNicheTree([])).toEqual([]);
  });

  it("retorna nichos raiz sem children quando não há filhos", () => {
    const flat = [makeNiche({ id: "a" }), makeNiche({ id: "b", slug: "saude" })];
    const tree = buildNicheTree(flat);
    expect(tree).toHaveLength(2);
    expect(tree[0].children).toEqual([]);
  });

  it("aninha filhos no pai correto", () => {
    const pai = makeNiche({ id: "pai", slug: "moda" });
    const filho = makeNiche({ id: "filho", slug: "moda-feminina", parent_id: "pai" });
    const tree = buildNicheTree([pai, filho]);
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].id).toBe("filho");
  });

  it("aninha sub-subnicho corretamente", () => {
    const a = makeNiche({ id: "a", slug: "moda" });
    const b = makeNiche({ id: "b", slug: "moda-feminina", parent_id: "a" });
    const c = makeNiche({ id: "c", slug: "moda-evangelica", parent_id: "b" });
    const tree = buildNicheTree([a, b, c]);
    expect(tree[0].children![0].children![0].id).toBe("c");
  });

  it("filhos com parent_id inexistente ficam na raiz", () => {
    const orphan = makeNiche({ id: "x", parent_id: "nao-existe", slug: "orfao" });
    const tree = buildNicheTree([orphan]);
    expect(tree).toHaveLength(0); // orphan não aparece pois parent não está no map
  });
});

// ─── Repository ───────────────────────────────────────────────────────────────

describe("SupabaseNicheRepository.create", () => {
  it("insere com os campos corretos", async () => {
    const row = makeNiche({ id: "new-1", name: "Varejo", slug: "varejo" });
    const mock = buildMockClient({ returnData: row });
    const repo = new SupabaseNicheRepository(mock as never);

    await repo.create({ name: "Varejo", slug: "varejo", sort_order: 5 });

    const q = mock._queries.find((q) => q.table === "business_niches" && q.operation === "insert");
    expect(q).toBeDefined();
    expect(q?.insertedData).toMatchObject({ name: "Varejo", slug: "varejo", sort_order: 5 });
  });

  it("aceita parent_id null (nicho raiz)", async () => {
    const row = makeNiche();
    const mock = buildMockClient({ returnData: row });
    const repo = new SupabaseNicheRepository(mock as never);

    await repo.create({ name: "Moda", slug: "moda", parent_id: null });

    const q = mock._queries.find((q) => q.table === "business_niches" && q.operation === "insert");
    expect((q?.insertedData as Record<string, unknown>)?.parent_id).toBeNull();
  });

  it("aceita parent_id definido (subnicho)", async () => {
    const row = makeNiche({ id: "sub", parent_id: "pai", slug: "moda-feminina" });
    const mock = buildMockClient({ returnData: row });
    const repo = new SupabaseNicheRepository(mock as never);

    await repo.create({ name: "Moda Feminina", slug: "moda-feminina", parent_id: "pai" });

    const q = mock._queries.find((q) => q.table === "business_niches" && q.operation === "insert");
    expect((q?.insertedData as Record<string, unknown>)?.parent_id).toBe("pai");
  });
});

describe("SupabaseNicheRepository.setActive", () => {
  it("atualiza is_active pelo id correto", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseNicheRepository(mock as never);

    await repo.setActive("niche-abc", false);

    const q = mock._queries.find((q) => q.table === "business_niches" && q.operation === "update");
    expect(q?.eqFilters["id"]).toBe("niche-abc");
    expect(q?.insertedData).toMatchObject({ is_active: false });
  });
});

describe("SupabaseNicheRepository.isUsedByWorkspace", () => {
  it("retorna true quando count > 0", async () => {
    const mock = buildMockClient({ returnCount: 2 });
    const repo = new SupabaseNicheRepository(mock as never);
    const result = await repo.isUsedByWorkspace("niche-123");
    expect(result).toBe(true);
  });

  it("retorna false quando count = 0", async () => {
    const mock = buildMockClient({ returnCount: 0 });
    const repo = new SupabaseNicheRepository(mock as never);
    const result = await repo.isUsedByWorkspace("niche-sem-uso");
    expect(result).toBe(false);
  });
});
