import { describe, it, expect } from "vitest";
import { SupabaseWorkspaceMemberRepository } from "@/repositories/member.repository";
import { buildMockClient } from "../helpers/mock-supabase";

const WS_A = "workspace-aaa-111";
const WS_B = "workspace-bbb-222";

const makeMember = (workspaceId = WS_A) => ({
  id: "member-1",
  workspace_id: workspaceId,
  user_id: "user-1",
  role: "sales" as const,
  created_at: new Date().toISOString(),
  profiles: { name: "Vendedor", email: "v@empresa.com", avatar_url: null },
});

describe("WorkspaceMemberRepository — isolamento de tenant", () => {
  it("findByWorkspace filtra por workspace_id", async () => {
    const mock = buildMockClient({ returnData: [makeMember(WS_A)] });
    const repo = new SupabaseWorkspaceMemberRepository(mock as never);

    await repo.findByWorkspace(WS_A);

    const q = mock._queries.find((q) => q.table === "workspace_members");
    expect(q?.eqFilters["workspace_id"]).toBe(WS_A);
  });

  it("usuário de WS_B não vê membros de WS_A", async () => {
    // RLS: retorna vazio para workspace errado
    const mock = buildMockClient({ returnData: [] });
    const repo = new SupabaseWorkspaceMemberRepository(mock as never);

    const result = await repo.findByWorkspace(WS_B);
    expect(result).toHaveLength(0);
  });

  it("findRole filtra por workspace_id E user_id", async () => {
    const mock = buildMockClient({ returnData: { role: "admin" } });
    const repo = new SupabaseWorkspaceMemberRepository(mock as never);

    await repo.findRole(WS_A, "user-1");

    const q = mock._queries.find((q) => q.table === "workspace_members");
    expect(q?.eqFilters["workspace_id"]).toBe(WS_A);
    expect(q?.eqFilters["user_id"]).toBe("user-1");
  });

  it("findRole de WS_B retorna null quando usuário não pertence a ele", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseWorkspaceMemberRepository(mock as never);

    const role = await repo.findRole(WS_B, "user-1");
    expect(role).toBeNull();
  });

  it("invite inclui workspace_id no payload", async () => {
    const member = makeMember(WS_A);
    const mock = buildMockClient({ returnData: member });
    const repo = new SupabaseWorkspaceMemberRepository(mock as never);

    await repo.invite({ workspace_id: WS_A, user_id: "user-2", role: "sales" });

    const q = mock._queries.find((q) => q.operation === "insert");
    expect((q?.insertedData as Record<string, unknown>)?.workspace_id).toBe(WS_A);
  });

  it("updateRole filtra por workspace_id", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseWorkspaceMemberRepository(mock as never);

    await repo.updateRole(WS_A, "user-1", "admin");

    const q = mock._queries.find((q) => q.operation === "update");
    expect(q?.eqFilters["workspace_id"]).toBe(WS_A);
    expect(q?.eqFilters["user_id"]).toBe("user-1");
  });

  it("deactivate filtra por workspace_id", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseWorkspaceMemberRepository(mock as never);

    await repo.deactivate(WS_A, "user-1");

    const q = mock._queries.find((q) => q.operation === "update");
    expect(q?.eqFilters["workspace_id"]).toBe(WS_A);
    expect(q?.eqFilters["user_id"]).toBe("user-1");
  });
});
