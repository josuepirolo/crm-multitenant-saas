import { describe, it, expect } from "vitest";
import { SupabaseRbacRepository } from "@/repositories/rbac.repository";
import { buildMockClient } from "../helpers/mock-supabase";

const WS_A = "workspace-aaa-111";
const WS_B = "workspace-bbb-222";

describe("SupabaseRbacRepository — isolamento por workspace", () => {
  it("listWorkspaceRoles filtra por workspace_id", async () => {
    const mock = buildMockClient({ returnData: [] });
    const repo = new SupabaseRbacRepository(mock as never);

    await repo.listWorkspaceRoles(WS_A);

    const q = mock._queries.find(
      (q) => q.table === "workspace_roles" && q.eqFilters["workspace_id"] !== undefined
    );
    expect(q).toBeDefined();
    expect(q?.eqFilters["workspace_id"]).toBe(WS_A);
  });

  it("listWorkspaceRoles de WS_A não usa WS_B como filtro", async () => {
    const mock = buildMockClient({ returnData: [] });
    const repo = new SupabaseRbacRepository(mock as never);

    await repo.listWorkspaceRoles(WS_A);

    const q = mock._queries.find((q) => q.table === "workspace_roles");
    expect(q?.eqFilters["workspace_id"]).not.toBe(WS_B);
  });

  it("createRole usa workspace_id correto no insert", async () => {
    const mock = buildMockClient({ returnData: { id: "role-1", workspace_id: WS_A, name: "Vendedor Senior", is_system: false, created_at: "" } });
    const repo = new SupabaseRbacRepository(mock as never);

    await repo.createRole(WS_A, "Vendedor Senior");

    const q = mock._queries.find((q) => q.table === "workspace_roles" && q.operation === "insert");
    expect(q).toBeDefined();
    expect(q?.insertedData).toMatchObject({ workspace_id: WS_A, name: "Vendedor Senior", is_system: false });
  });

  it("createRole de WS_A não usa WS_B", async () => {
    const mock = buildMockClient({ returnData: { id: "role-1", workspace_id: WS_A, name: "Role A", is_system: false, created_at: "" } });
    const repo = new SupabaseRbacRepository(mock as never);

    await repo.createRole(WS_A, "Role A");

    const q = mock._queries.find((q) => q.table === "workspace_roles" && q.operation === "insert");
    expect((q?.insertedData as Record<string, unknown>)?.["workspace_id"]).not.toBe(WS_B);
  });

  it("setRolePermissions deleta apenas pela role_id (não por workspace)", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseRbacRepository(mock as never);

    await repo.setRolePermissions("role-abc", ["perm-1", "perm-2"]);

    const del = mock._queries.find(
      (q) => q.table === "workspace_role_permissions" && q.operation === "delete"
    );
    expect(del).toBeDefined();
    expect(del?.eqFilters["role_id"]).toBe("role-abc");
  });

  it("setRolePermissions insere somente as permissões informadas", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseRbacRepository(mock as never);

    await repo.setRolePermissions("role-abc", ["perm-1", "perm-2"]);

    const ins = mock._queries.find(
      (q) => q.table === "workspace_role_permissions" && q.operation === "insert"
    );
    expect(ins).toBeDefined();
    expect(Array.isArray(ins?.insertedData)).toBe(true);
    expect((ins?.insertedData as unknown[]).length).toBe(2);
  });

  it("setRolePermissions com lista vazia não insere nenhuma permissão", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseRbacRepository(mock as never);

    await repo.setRolePermissions("role-abc", []);

    const ins = mock._queries.find(
      (q) => q.table === "workspace_role_permissions" && q.operation === "insert"
    );
    expect(ins).toBeUndefined();
  });

  it("assignRoleToMember atualiza workspace_members pelo id do membro", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseRbacRepository(mock as never);

    await repo.assignRoleToMember("member-xyz", "role-abc");

    const q = mock._queries.find(
      (q) => q.table === "workspace_members" && q.operation === "update"
    );
    expect(q).toBeDefined();
    expect(q?.eqFilters["id"]).toBe("member-xyz");
    expect(q?.insertedData).toMatchObject({ workspace_role_id: "role-abc" });
  });

  it("assignRoleToMember não usa workspace_id como filtro", async () => {
    const mock = buildMockClient({ returnData: null });
    const repo = new SupabaseRbacRepository(mock as never);

    await repo.assignRoleToMember("member-xyz", "role-abc");

    const q = mock._queries.find(
      (q) => q.table === "workspace_members" && q.operation === "update"
    );
    expect(q?.eqFilters["workspace_id"]).toBeUndefined();
  });
});

describe("SupabaseRbacRepository.canModuleAction — lógica de permissão", () => {
  it("retorna true quando a permissão existe no Set", () => {
    const repo = new SupabaseRbacRepository(null as never);
    const perms = new Set(["contacts:view", "contacts:create"]);
    expect(repo.canModuleAction(perms, "contacts", "view")).toBe(true);
    expect(repo.canModuleAction(perms, "contacts", "create")).toBe(true);
  });

  it("retorna false quando a permissão não existe no Set", () => {
    const repo = new SupabaseRbacRepository(null as never);
    const perms = new Set(["contacts:view"]);
    expect(repo.canModuleAction(perms, "contacts", "delete")).toBe(false);
    expect(repo.canModuleAction(perms, "members", "view")).toBe(false);
  });

  it("Set vazio nega todas as permissões", () => {
    const repo = new SupabaseRbacRepository(null as never);
    const perms = new Set<string>();
    expect(repo.canModuleAction(perms, "leads", "view")).toBe(false);
  });
});
