import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockSupabase = { auth: { getUser: vi.fn() } };
  const mockAdmin = { rpc: vi.fn() };
  return {
    getWorkspaceContext: vi.fn(),
    revalidatePath: vi.fn(),
    createClient: vi.fn().mockResolvedValue(mockSupabase),
    createAdminClient: vi.fn().mockReturnValue(mockAdmin),
    wsRepoFindById: vi.fn(),
    wsRepoUpdate: vi.fn(),
    memberFindByWorkspace: vi.fn(),
    memberFindRole: vi.fn(),
    memberInvite: vi.fn(),
    memberUpdateRole: vi.fn(),
    memberDeactivate: vi.fn(),
    createAuditLog: vi.fn().mockResolvedValue(undefined),
    getClientIp: vi.fn().mockResolvedValue("127.0.0.1"),
    mockSupabase,
    mockAdmin,
  };
});

vi.mock("@/lib/guards", () => ({ getWorkspaceContext: mocks.getWorkspaceContext }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/audit/audit-log", () => ({
  createAuditLog: mocks.createAuditLog,
  AUDIT_ACTIONS: {
    LOGIN_SUCCESS:        "login_success",
    LOGIN_FAILURE:        "login_failure",
    RATE_LIMIT_TRIGGERED: "rate_limit_triggered",
    REGISTER_SUCCESS:     "register_success",
    WORKSPACE_UPDATED:    "workspace_updated",
    MEMBER_INVITED:       "member_invited",
    MEMBER_ROLE_UPDATED:  "member_role_updated",
    MEMBER_DEACTIVATED:   "member_deactivated",
  },
}));
vi.mock("@/lib/security/client-ip", () => ({ getClientIp: mocks.getClientIp }));
vi.mock("@/repositories/workspace.repository");
vi.mock("@/repositories/member.repository");

import { SupabaseWorkspaceRepository } from "@/repositories/workspace.repository";
import { SupabaseWorkspaceMemberRepository } from "@/repositories/member.repository";
import {
  getSettingsData,
  updateWorkspace,
  inviteMember,
  updateMemberRole,
  deactivateMember,
} from "@/app/(dashboard)/settings/actions";

function fd(fields: Record<string, string>) {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => f.append(k, v));
  return f;
}

const CTX = { workspaceId: "ws-aaa", userId: "user-aaa" };
const VALID_USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const ERR_AUTH = { error: "Não autenticado." };
const ERR_PERM = { error: "Você não tem permissão para realizar esta ação." };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue(mocks.mockSupabase);
  mocks.createAdminClient.mockReturnValue(mocks.mockAdmin);

  mocks.wsRepoFindById.mockResolvedValue({ id: "ws-aaa", name: "Empresa A" });
  mocks.wsRepoUpdate.mockResolvedValue({ id: "ws-aaa", name: "Novo Nome" });
  mocks.memberFindByWorkspace.mockResolvedValue([]);
  mocks.memberFindRole.mockResolvedValue("sales");
  mocks.memberInvite.mockResolvedValue({ id: "m-new" });
  mocks.memberUpdateRole.mockResolvedValue(undefined);
  mocks.memberDeactivate.mockResolvedValue(undefined);
  mocks.mockAdmin.rpc.mockResolvedValue({ data: null, error: { message: "not found" } });
  mocks.createAuditLog.mockResolvedValue(undefined);
  mocks.getClientIp.mockResolvedValue("127.0.0.1");

  vi.mocked(SupabaseWorkspaceRepository).mockImplementation(function () {
    return { findById: mocks.wsRepoFindById, update: mocks.wsRepoUpdate } as never;
  });
  vi.mocked(SupabaseWorkspaceMemberRepository).mockImplementation(function () {
    return {
      findByWorkspace: mocks.memberFindByWorkspace,
      findRole: mocks.memberFindRole,
      invite: mocks.memberInvite,
      updateRole: mocks.memberUpdateRole,
      deactivate: mocks.memberDeactivate,
    } as never;
  });
});

// ─── getSettingsData ──────────────────────────────────────────────────────────

describe("getSettingsData — proteção de acesso", () => {
  it("retorna erro quando não autenticado", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    const result = await getSettingsData();
    expect(result.error).toBe("Não autenticado.");
    expect(result.workspace).toBeNull();
    expect(result.members).toHaveLength(0);
  });

  it("não chama repositório quando guard falha", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    await getSettingsData();
    expect(mocks.wsRepoFindById).not.toHaveBeenCalled();
    expect(mocks.memberFindByWorkspace).not.toHaveBeenCalled();
  });

  it("retorna dados quando autenticado com permissão", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const result = await getSettingsData();
    expect(result.error).toBeUndefined();
    expect(mocks.wsRepoFindById).toHaveBeenCalled();
    expect(mocks.memberFindByWorkspace).toHaveBeenCalledWith(CTX.workspaceId);
  });
});

// ─── updateWorkspace ──────────────────────────────────────────────────────────

describe("updateWorkspace — proteção de acesso", () => {
  it("retorna erro quando não autenticado", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    const result = await updateWorkspace(null, fd({ name: "Novo" }));
    expect(result).toMatchObject({ error: "Não autenticado." });
  });

  it("retorna erro quando sem permissão de edição", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_PERM);
    const result = await updateWorkspace(null, fd({ name: "Novo" }));
    expect((result as { error: string }).error).toContain("permissão");
  });

  it("não executa update se guard falhar", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    await updateWorkspace(null, fd({ name: "Novo" }));
    expect(mocks.wsRepoUpdate).not.toHaveBeenCalled();
  });

  it("executa update com workspaceId do contexto autenticado, nunca do client", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    await updateWorkspace(null, fd({ name: "Novo Nome" }));
    expect(mocks.wsRepoUpdate).toHaveBeenCalledWith(CTX.workspaceId, { name: "Novo Nome" });
  });
});

// ─── inviteMember ─────────────────────────────────────────────────────────────

describe("inviteMember — proteção de acesso", () => {
  it("retorna erro quando não autenticado", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    const result = await inviteMember(null, fd({ email: "x@x.com", role: "sales" }));
    expect((result as { error: string }).error).toBe("Não autenticado.");
  });

  it("não executa RPC se guard falhar", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    await inviteMember(null, fd({ email: "x@x.com", role: "sales" }));
    expect(mocks.mockAdmin.rpc).not.toHaveBeenCalled();
  });

  it("retorna erro genérico quando e-mail não existe — não revela se usuário existe", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.mockAdmin.rpc.mockResolvedValue({ data: null, error: null });
    const result = await inviteMember(null, fd({ email: "ghost@x.com", role: "sales" }));
    const error = (result as { error: string }).error;
    expect(error).toContain("criar uma conta");
    expect(error).not.toContain("ghost@x.com");
  });

  it("workspace_id do convite vem do contexto autenticado, nunca do client", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.mockAdmin.rpc.mockResolvedValue({ data: "user-bbb", error: null });
    // findRole retorna null: usuário ainda não é membro (pré-condição de invite)
    mocks.memberFindRole.mockResolvedValue(null);
    await inviteMember(null, fd({ email: "novo@x.com", role: "sales" }));
    expect(mocks.memberInvite).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_id: CTX.workspaceId })
    );
  });
});

// ─── updateMemberRole ─────────────────────────────────────────────────────────

describe("updateMemberRole — proteção de acesso", () => {
  it("retorna erro quando não autenticado", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    const result = await updateMemberRole(null, fd({ userId: VALID_USER_ID, role: "sales" }));
    expect((result as { error: string }).error).toBe("Não autenticado.");
  });

  it("não executa update se guard falhar", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    await updateMemberRole(null, fd({ userId: VALID_USER_ID, role: "sales" }));
    expect(mocks.memberUpdateRole).not.toHaveBeenCalled();
  });

  it("executa updateRole com workspaceId do contexto, nunca do client", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    await updateMemberRole(null, fd({ userId: VALID_USER_ID, role: "sales" }));
    expect(mocks.memberUpdateRole).toHaveBeenCalledWith(CTX.workspaceId, VALID_USER_ID, "sales");
  });
});

// ─── deactivateMember ────────────────────────────────────────────────────────

describe("deactivateMember — proteção de acesso", () => {
  it("retorna erro quando não autenticado", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    const result = await deactivateMember(fd({ userId: VALID_USER_ID }));
    expect((result as { error: string }).error).toBe("Não autenticado.");
  });

  it("não executa desativação se guard falhar", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    await deactivateMember(fd({ userId: VALID_USER_ID }));
    expect(mocks.memberDeactivate).not.toHaveBeenCalled();
  });

  it("retorna erro quando userId ausente (após guard)", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const result = await deactivateMember(fd({}));
    expect((result as { error: string }).error).toBeDefined();
    expect(mocks.memberDeactivate).not.toHaveBeenCalled();
  });

  it("deactivate recebe workspaceId do contexto, nunca do client", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    await deactivateMember(fd({ userId: VALID_USER_ID }));
    expect(mocks.memberDeactivate).toHaveBeenCalledWith(CTX.workspaceId, VALID_USER_ID);
  });
});

// ─── Auditoria — settings actions ────────────────────────────────────────────

describe("updateWorkspace — registra auditoria", () => {
  it("cria audit log com WORKSPACE_UPDATED e workspace_id do contexto", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    await updateWorkspace(null, fd({ name: "Novo Nome" }));

    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action:       "workspace_updated",
        workspace_id: CTX.workspaceId,
        user_id:      CTX.userId,
      })
    );
  });

  it("não cria audit log quando guard falha", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    await updateWorkspace(null, fd({ name: "Novo" }));
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });
});

describe("inviteMember — registra auditoria", () => {
  it("cria audit log com MEMBER_INVITED e role no metadata", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.mockAdmin.rpc.mockResolvedValue({ data: "user-bbb", error: null });
    mocks.memberFindRole.mockResolvedValue(null);

    await inviteMember(null, fd({ email: "novo@x.com", role: "sales" }));

    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action:       "member_invited",
        workspace_id: CTX.workspaceId,
        metadata:     expect.objectContaining({ role: "sales" }),
      })
    );
  });
});

describe("deactivateMember — registra auditoria", () => {
  it("cria audit log com MEMBER_DEACTIVATED", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    await deactivateMember(fd({ userId: VALID_USER_ID }));

    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action:       "member_deactivated",
        workspace_id: CTX.workspaceId,
        entity_id:    VALID_USER_ID,
      })
    );
  });
});

describe("updateMemberRole — registra auditoria", () => {
  it("cria audit log com MEMBER_ROLE_UPDATED e role no metadata", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    await updateMemberRole(null, fd({ userId: VALID_USER_ID, role: "admin" }));

    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action:       "member_role_updated",
        workspace_id: CTX.workspaceId,
        metadata:     expect.objectContaining({ role: "admin" }),
      })
    );
  });
});
