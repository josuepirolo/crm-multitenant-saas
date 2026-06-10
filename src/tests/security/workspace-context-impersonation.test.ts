import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testes do fix de isolamento de tenant durante impersonação:
 * getCurrentWorkspaceId / getWorkspaceContext (src/lib/guards.ts) e
 * getUserRole (src/lib/user-role.ts) devem resolver o workspace impersonado
 * (com acesso owner-like) quando getValidatedImpersonatedWorkspaceId
 * retornar um valor, e preservar o fluxo normal (profiles/workspace_members)
 * quando não houver impersonação válida.
 *
 * Ver discoveries/2026-06-09-impersonation-tenant-isolation-bug.md e
 * decisions/ADR-004-impersonation-owner-like-access.md.
 */

function chainable(result: { data: unknown; error?: unknown }) {
  const obj: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "order", "limit", "in", "neq"]) {
    obj[m] = vi.fn().mockReturnValue(obj);
  }
  obj.single = vi.fn().mockResolvedValue(result);
  obj.maybeSingle = vi.fn().mockResolvedValue(result);
  return obj;
}

const mocks = vi.hoisted(() => ({
  getCachedUser: vi.fn(),
  getValidatedImpersonatedWorkspaceId: vi.fn(),
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
  serverFrom: vi.fn(),
  serverAuthGetUser: vi.fn(),
  adminFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/cached-auth", () => ({ getCachedUser: mocks.getCachedUser }));
vi.mock("@/lib/impersonation", () => ({
  getValidatedImpersonatedWorkspaceId: mocks.getValidatedImpersonatedWorkspaceId,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

import { getCurrentWorkspaceId, getWorkspaceContext, getScopedSupabaseClient } from "@/lib/guards";
import { getUserRole } from "@/lib/user-role";

const USER_ID = "user-1";
const OWN_WORKSPACE_ID = "ws-pytec";
const IMPERSONATED_WORKSPACE_ID = "ws-lekazis";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({
    from: mocks.serverFrom,
    auth: { getUser: mocks.serverAuthGetUser },
  });
  mocks.createAdminClient.mockReturnValue({ from: mocks.adminFrom });
  mocks.getValidatedImpersonatedWorkspaceId.mockResolvedValue(null);
});

// ─── getCurrentWorkspaceId ──────────────────────────────────────────────────

describe("getCurrentWorkspaceId", () => {
  it("retorna null quando não autenticado, sem checar impersonação", async () => {
    mocks.getCachedUser.mockResolvedValue({ data: { user: null } });

    expect(await getCurrentWorkspaceId()).toBeNull();
    expect(mocks.getValidatedImpersonatedWorkspaceId).not.toHaveBeenCalled();
  });

  it("retorna o workspace impersonado quando há impersonação válida, sem consultar profiles", async () => {
    mocks.getCachedUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mocks.getValidatedImpersonatedWorkspaceId.mockResolvedValue(IMPERSONATED_WORKSPACE_ID);

    expect(await getCurrentWorkspaceId()).toBe(IMPERSONATED_WORKSPACE_ID);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("sem impersonação, retorna profiles.current_workspace_id do próprio usuário", async () => {
    mocks.getCachedUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mocks.serverFrom.mockReturnValue(chainable({ data: { current_workspace_id: OWN_WORKSPACE_ID } }));

    expect(await getCurrentWorkspaceId()).toBe(OWN_WORKSPACE_ID);
  });
});

// ─── getWorkspaceContext ─────────────────────────────────────────────────────

describe("getWorkspaceContext", () => {
  it("retorna erro quando não autenticado", async () => {
    mocks.getCachedUser.mockResolvedValue({ data: { user: null } });

    expect(await getWorkspaceContext("contacts", "create")).toEqual({ error: "Não autenticado." });
  });

  it("durante impersonação válida, retorna o workspace impersonado com acesso owner-like (sem checar RBAC)", async () => {
    mocks.getCachedUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mocks.getValidatedImpersonatedWorkspaceId.mockResolvedValue(IMPERSONATED_WORKSPACE_ID);

    const result = await getWorkspaceContext("contacts", "create");

    expect(result).toEqual({ workspaceId: IMPERSONATED_WORKSPACE_ID, userId: USER_ID });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("sem impersonação, owner do workspace próprio mantém acesso permitido (sem regressão)", async () => {
    mocks.getCachedUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mocks.adminFrom.mockReturnValue(
      chainable({
        data: {
          current_workspace_id: OWN_WORKSPACE_ID,
          workspace_members: [
            {
              id: "member-1",
              role: "owner",
              workspace_id: OWN_WORKSPACE_ID,
              deleted_at: null,
              workspace_role_id: null,
              workspace_roles: null,
            },
          ],
        },
      })
    );

    expect(await getWorkspaceContext("contacts", "create")).toEqual({
      workspaceId: OWN_WORKSPACE_ID,
      userId: USER_ID,
    });
  });

  it("sem impersonação, usuário sem vínculo ativo no workspace é rejeitado", async () => {
    mocks.getCachedUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mocks.adminFrom.mockReturnValue(
      chainable({ data: { current_workspace_id: OWN_WORKSPACE_ID, workspace_members: [] } })
    );

    expect(await getWorkspaceContext("contacts", "create")).toEqual({
      error: "Você não tem permissão para realizar esta ação.",
    });
  });
});

// ─── getScopedSupabaseClient ────────────────────────────────────────────────
//
// Mesmo workspaceId resolvido por getWorkspaceContext/getCurrentWorkspaceId,
// o createClient() RLS-bound ao auth.uid() real (superadmin) não enxerga
// dados de workspaces onde o superadmin não é membro (RLS = workspace_id IN
// my_workspace_ids()). Durante impersonação validada, leituras/escritas
// usam service_role — ver discoveries/2026-06-10-impersonation-rls-blocks-data-access.md.

describe("getScopedSupabaseClient", () => {
  it("não autenticado: retorna createClient() sem checar impersonação", async () => {
    mocks.getCachedUser.mockResolvedValue({ data: { user: null } });

    const client = await getScopedSupabaseClient();

    expect(mocks.getValidatedImpersonatedWorkspaceId).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(mocks.createClient).toHaveBeenCalled();
    expect(client).toEqual({ from: mocks.serverFrom, auth: { getUser: mocks.serverAuthGetUser } });
  });

  it("sem impersonação válida: retorna createClient() (RLS-bound), idêntico ao comportamento anterior", async () => {
    mocks.getCachedUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mocks.getValidatedImpersonatedWorkspaceId.mockResolvedValue(null);

    const client = await getScopedSupabaseClient();

    expect(mocks.createAdminClient).not.toHaveBeenCalled();
    expect(client).toEqual({ from: mocks.serverFrom, auth: { getUser: mocks.serverAuthGetUser } });
  });

  it("com impersonação válida: retorna createAdminClient() (service_role) para contornar RLS de my_workspace_ids()", async () => {
    mocks.getCachedUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mocks.getValidatedImpersonatedWorkspaceId.mockResolvedValue(IMPERSONATED_WORKSPACE_ID);

    const client = await getScopedSupabaseClient();

    expect(mocks.createClient).not.toHaveBeenCalled();
    expect(mocks.createAdminClient).toHaveBeenCalled();
    expect(client).toEqual({ from: mocks.adminFrom });
  });
});

// ─── getUserRole ──────────────────────────────────────────────────────────────

describe("getUserRole", () => {
  it("retorna null quando não autenticado", async () => {
    mocks.serverAuthGetUser.mockResolvedValue({ data: { user: null } });

    expect(await getUserRole(IMPERSONATED_WORKSPACE_ID)).toBeNull();
  });

  it("retorna 'owner' quando há impersonação válida desse workspace", async () => {
    mocks.serverAuthGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mocks.getValidatedImpersonatedWorkspaceId.mockResolvedValue(IMPERSONATED_WORKSPACE_ID);

    expect(await getUserRole(IMPERSONATED_WORKSPACE_ID)).toBe("owner");
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("impersonando outro workspace, consulta normalmente a role do workspace perguntado", async () => {
    mocks.serverAuthGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mocks.getValidatedImpersonatedWorkspaceId.mockResolvedValue(IMPERSONATED_WORKSPACE_ID);
    mocks.adminFrom.mockReturnValue(chainable({ data: { role: "manager" } }));

    expect(await getUserRole(OWN_WORKSPACE_ID)).toBe("manager");
  });

  it("sem impersonação, retorna a role de workspace_members", async () => {
    mocks.serverAuthGetUser.mockResolvedValue({ data: { user: { id: USER_ID } } });
    mocks.adminFrom.mockReturnValue(chainable({ data: { role: "sales" } }));

    expect(await getUserRole(OWN_WORKSPACE_ID)).toBe("sales");
  });
});
