import { describe, it, expect, vi } from "vitest";
import { SupabaseContactRepository } from "@/repositories/contact.repository";
import { SupabaseWorkspaceMemberRepository } from "@/repositories/member.repository";

/**
 * Simula comportamento do RLS do Supabase:
 * quando um usuário tenta acessar dados de outro workspace,
 * o banco retorna vazio ou erro — os repositórios devem propagar isso corretamente.
 */

const WS_A = "workspace-aaa-111";
const WS_B = "workspace-bbb-222";

// Simula cliente Supabase com RLS ativo:
// Retorna dados apenas se workspace_id bater com o esperado
function buildRLSSimulator(ownedWorkspace: string, ownedData: unknown[]) {
  const makeRLSChain = (table: string, op: string) => {
    let requestedWorkspace: string | null = null;

    const resolve = async () => {
      const hasAccess = requestedWorkspace === ownedWorkspace;
      return {
        data: hasAccess ? ownedData : [],
        error: null,
        count: hasAccess ? ownedData.length : 0,
      };
    };

    const resolveSingle = async () => {
      const hasAccess = requestedWorkspace === ownedWorkspace;
      return {
        data: hasAccess ? (ownedData[0] ?? null) : null,
        error: hasAccess ? null : { message: "Row not found (RLS)" },
      };
    };

    const chain: Record<string, unknown> = {
      eq: vi.fn((col: string, val: unknown) => {
        if (col === "workspace_id") requestedWorkspace = val as string;
        return chain;
      }),
      is: vi.fn(() => chain),
      or: vi.fn(() => chain),
      ilike: vi.fn(() => chain),
      in: vi.fn(() => chain),
      order: vi.fn(() => chain),
      range: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      select: vi.fn(() => chain),
      single: vi.fn(resolveSingle),
    };

    const p = Promise.resolve(null).then(resolve);
    Object.assign(chain, {
      then: p.then.bind(p),
      catch: p.catch.bind(p),
      finally: p.finally.bind(p),
    });

    return chain;
  };

  return {
    from: vi.fn((table: string) => ({
      select: vi.fn(() => makeRLSChain(table, "select")),
      insert: vi.fn((data: unknown) => {
        const insertedWs = (data as Record<string, unknown>)?.workspace_id;
        const hasAccess = insertedWs === ownedWorkspace;
        const p = Promise.resolve({
          data: hasAccess ? ownedData[0] : null,
          error: hasAccess ? null : { message: "permission denied for table (RLS)" },
        });
        const chain: Record<string, unknown> = {
          select: vi.fn(() => chain),
          single: vi.fn(() => p),
          then: p.then.bind(p),
          catch: p.catch.bind(p),
          finally: p.finally.bind(p),
        };
        return chain;
      }),
      update: vi.fn((_data: unknown) => makeRLSChain(table, "update")),
      delete: vi.fn(() => makeRLSChain(table, "delete")),
    })),
  };
}

// ─── Contacts com RLS ────────────────────────────────────────────────────────

describe("RLS Simulation — ContactRepository", () => {
  const contactA = {
    id: "c-1",
    workspace_id: WS_A,
    name: "Contato A",
    phone: null,
    email: null,
    document: null,
    company: null,
    status: "lead",
    avatar_url: null,
    notes: null,
    custom_fields: {},
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  it("usuário de WS_A lê seus contatos com sucesso", async () => {
    const client = buildRLSSimulator(WS_A, [contactA]);
    const repo = new SupabaseContactRepository(client as never);

    const { data } = await repo.findAll(WS_A, {}, 0, 20);
    expect(data.length).toBeGreaterThan(0);
  });

  it("usuário de WS_B recebe lista vazia ao tentar acessar WS_A", async () => {
    // RLS do WS_A só libera dados para WS_A
    const client = buildRLSSimulator(WS_A, [contactA]);
    const repo = new SupabaseContactRepository(client as never);

    const { data } = await repo.findAll(WS_B, {}, 0, 20);
    expect(data).toHaveLength(0);
  });

  it("findById de WS_B para contato de WS_A retorna null", async () => {
    const client = buildRLSSimulator(WS_A, [contactA]);
    const repo = new SupabaseContactRepository(client as never);

    const result = await repo.findById(WS_B, "c-1");
    expect(result).toBeNull();
  });

  it("update de WS_B em contato de WS_A falha", async () => {
    const client = buildRLSSimulator(WS_A, [contactA]);
    const repo = new SupabaseContactRepository(client as never);

    // Quando WS_B tenta update, RLS retorna linha vazia → repositório lança erro
    await expect(repo.update(WS_B, "c-1", { name: "Hack" })).rejects.toThrow();
  });
});

// ─── WorkspaceMembers com RLS ─────────────────────────────────────────────────

describe("RLS Simulation — WorkspaceMemberRepository", () => {
  const memberA = {
    id: "m-1",
    workspace_id: WS_A,
    user_id: "user-1",
    role: "sales",
    created_at: new Date().toISOString(),
    profiles: null,
  };

  it("usuário de WS_A vê seus próprios membros", async () => {
    const client = buildRLSSimulator(WS_A, [memberA]);
    const repo = new SupabaseWorkspaceMemberRepository(client as never);

    const result = await repo.findByWorkspace(WS_A);
    expect(result.length).toBeGreaterThan(0);
  });

  it("usuário de WS_B recebe lista vazia ao tentar listar membros de WS_A", async () => {
    const client = buildRLSSimulator(WS_A, [memberA]);
    const repo = new SupabaseWorkspaceMemberRepository(client as never);

    const result = await repo.findByWorkspace(WS_B);
    expect(result).toHaveLength(0);
  });

  it("findRole de WS_B não retorna role de WS_A", async () => {
    const client = buildRLSSimulator(WS_A, [{ role: "owner" }]);
    const repo = new SupabaseWorkspaceMemberRepository(client as never);

    const role = await repo.findRole(WS_B, "user-1");
    expect(role).toBeNull();
  });
});
