import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockSupabase = { auth: { getUser: vi.fn() } };
  const mockAdmin    = { from: vi.fn() };
  return {
    getWorkspaceContext: vi.fn(),
    requireSuperAdmin:   vi.fn(),
    revalidatePath:      vi.fn(),
    createClient:        vi.fn().mockResolvedValue(mockSupabase),
    createAdminClient:   vi.fn().mockReturnValue(mockAdmin),
    wsRepoUpdate:        vi.fn(),
    adminRepoUpdateProfile: vi.fn(),
    createAuditLog:      vi.fn().mockResolvedValue(undefined),
    getClientIp:         vi.fn().mockResolvedValue("127.0.0.1"),
    mockSupabase,
    mockAdmin,
  };
});

vi.mock("@/lib/guards", () => ({
  getWorkspaceContext: mocks.getWorkspaceContext,
  requireSuperAdmin:   mocks.requireSuperAdmin,
}));
vi.mock("next/cache",             () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server",  () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin",   () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/audit/audit-log",  () => ({
  createAuditLog: mocks.createAuditLog,
  AUDIT_ACTIONS: {
    WORKSPACE_UPDATED:         "workspace_updated",
    WORKSPACE_PROFILE_UPDATED: "workspace_profile_updated",
    MEMBER_INVITED:            "member_invited",
    MEMBER_ROLE_UPDATED:       "member_role_updated",
    MEMBER_DEACTIVATED:        "member_deactivated",
    ROLE_CREATED:              "role_created",
    ROLE_DELETED:              "role_deleted",
    ROLE_PERMISSIONS_SET:      "role_permissions_set",
    MEMBER_RBAC_ASSIGNED:      "member_rbac_assigned",
    IMPERSONATION_STARTED:     "impersonation_started",
    IMPERSONATION_ENDED:       "impersonation_ended",
    WORKSPACE_LOGO_UPDATED:    "workspace_logo_updated",
    USER_AVATAR_UPDATED:       "user_avatar_updated",
  },
}));
vi.mock("@/lib/security/client-ip",      () => ({ getClientIp: mocks.getClientIp }));
vi.mock("@/lib/security/security-errors", () => ({
  publicError: (_: unknown, msg: string) => ({ error: msg }),
}));
vi.mock("@/repositories/workspace.repository");
vi.mock("@/repositories/admin.repository");

import { SupabaseWorkspaceRepository } from "@/repositories/workspace.repository";
import { SupabaseAdminRepository }      from "@/repositories/admin.repository";
import { updateWorkspaceProfile }       from "@/app/(dashboard)/settings/actions";
import { updateWorkspaceProfileAdmin }  from "@/app/(admin)/admin/actions";

function fd(fields: Record<string, string>) {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => f.append(k, v));
  return f;
}

const CTX      = { workspaceId: "ws-aaa", userId: "user-aaa" };
const SA       = { userId: "superadmin-id" };
const WS_ID    = "ws-target-123";
const ERR_AUTH = { error: "Não autenticado." };
const ERR_PERM = { error: "Você não tem permissão para realizar esta ação." };

const PROFILE_DATA = {
  display_name: "Empresa XYZ",
  legal_name:   "Empresa XYZ Ltda",
  phone:        "(11) 99999-9999",
  email:        "contato@empresa.com",
  address_city:  "São Paulo",
  address_state: "SP",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue(mocks.mockSupabase);
  mocks.createAdminClient.mockReturnValue(mocks.mockAdmin);
  mocks.wsRepoUpdate.mockResolvedValue({ id: "ws-aaa", ...PROFILE_DATA });
  mocks.adminRepoUpdateProfile.mockResolvedValue(undefined);
  mocks.requireSuperAdmin.mockResolvedValue(SA);

  vi.mocked(SupabaseWorkspaceRepository).mockImplementation(function () {
    return { update: mocks.wsRepoUpdate } as never;
  });
  vi.mocked(SupabaseAdminRepository).mockImplementation(function () {
    return { updateWorkspaceProfile: mocks.adminRepoUpdateProfile } as never;
  });
});

// ─── updateWorkspaceProfile — autenticação / autorização ─────────────────────

describe("updateWorkspaceProfile — autenticação / autorização", () => {
  it("bloqueia sem autenticação", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    const result = await updateWorkspaceProfile(null, fd(PROFILE_DATA));
    expect(result).toMatchObject({ error: "Não autenticado." });
    expect(mocks.wsRepoUpdate).not.toHaveBeenCalled();
  });

  it("bloqueia sem permissão settings:edit", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_PERM);
    const result = await updateWorkspaceProfile(null, fd(PROFILE_DATA));
    expect((result as { error: string }).error).toContain("permissão");
    expect(mocks.wsRepoUpdate).not.toHaveBeenCalled();
  });

  it("workspace_id vem do contexto autenticado, nunca do FormData", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    // Mesmo que o client tente injetar um workspace_id diferente, é ignorado
    const maliciousData = { ...PROFILE_DATA, workspace_id: "outro-workspace-malicioso" };
    await updateWorkspaceProfile(null, fd(maliciousData));
    expect(mocks.wsRepoUpdate).toHaveBeenCalledWith(
      CTX.workspaceId,
      expect.not.objectContaining({ workspace_id: "outro-workspace-malicioso" })
    );
  });
});

// ─── updateWorkspaceProfile — validação e sanitização ────────────────────────

describe("updateWorkspaceProfile — validação", () => {
  it("rejeita e-mail inválido", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const result = await updateWorkspaceProfile(null, fd({ email: "nao-e-email" }));
    expect((result as { error: string }).error).toContain("E-mail inválido");
    expect(mocks.wsRepoUpdate).not.toHaveBeenCalled();
  });

  it("converte strings vazias em null (não persiste string vazia)", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    await updateWorkspaceProfile(null, fd({ display_name: "", legal_name: "XYZ" }));
    expect(mocks.wsRepoUpdate).toHaveBeenCalledWith(
      CTX.workspaceId,
      expect.objectContaining({ display_name: null, legal_name: "XYZ" })
    );
  });

  it("trunca display_name acima do limite (schema rejeita >100 chars)", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const long = "A".repeat(101);
    const result = await updateWorkspaceProfile(null, fd({ display_name: long }));
    expect((result as { error?: string }).error).toBeDefined();
    expect(mocks.wsRepoUpdate).not.toHaveBeenCalled();
  });

  it("aceita campos opcionais ausentes", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const result = await updateWorkspaceProfile(null, fd({ display_name: "Nome" }));
    expect((result as { error?: string }).error).toBeUndefined();
    expect(mocks.wsRepoUpdate).toHaveBeenCalled();
  });
});

// ─── updateWorkspaceProfile — auditoria ──────────────────────────────────────

describe("updateWorkspaceProfile — auditoria", () => {
  it("registra WORKSPACE_PROFILE_UPDATED com workspace_id e user_id do contexto", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    await updateWorkspaceProfile(null, fd(PROFILE_DATA));
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action:       "workspace_profile_updated",
        workspace_id: CTX.workspaceId,
        user_id:      CTX.userId,
      })
    );
  });

  it("metadata contém lista de campos atualizados", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    await updateWorkspaceProfile(null, fd({ display_name: "Novo", phone: "11 99999" }));
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ updated_fields: expect.any(Array) }),
      })
    );
  });

  it("não registra auditoria quando guard falha", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    await updateWorkspaceProfile(null, fd(PROFILE_DATA));
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });
});

// ─── updateWorkspaceProfileAdmin — guard superadmin ──────────────────────────

describe("updateWorkspaceProfileAdmin — guard superadmin", () => {
  it("bloqueia usuário comum (não superadmin)", async () => {
    mocks.requireSuperAdmin.mockResolvedValue(null);
    const result = await updateWorkspaceProfileAdmin(WS_ID, null, fd(PROFILE_DATA));
    expect(result).toMatchObject({ error: "Acesso negado." });
    expect(mocks.adminRepoUpdateProfile).not.toHaveBeenCalled();
  });

  it("executa update quando superadmin válido", async () => {
    const result = await updateWorkspaceProfileAdmin(WS_ID, null, fd(PROFILE_DATA));
    expect((result as { error?: string }).error).toBeUndefined();
    expect(mocks.adminRepoUpdateProfile).toHaveBeenCalled();
  });

  it("workspace_id vem do argumento da função, nunca do FormData", async () => {
    // FormData não deve ter peso sobre qual workspace é editado
    await updateWorkspaceProfileAdmin(WS_ID, null, fd({ ...PROFILE_DATA }));
    expect(mocks.adminRepoUpdateProfile).toHaveBeenCalledWith(
      WS_ID,
      expect.any(Object)
    );
  });

  it("converte strings vazias em null (mesmo no fluxo admin)", async () => {
    await updateWorkspaceProfileAdmin(WS_ID, null, fd({ display_name: "", legal_name: "XYZ" }));
    expect(mocks.adminRepoUpdateProfile).toHaveBeenCalledWith(
      WS_ID,
      expect.objectContaining({ display_name: null, legal_name: "XYZ" })
    );
  });
});

// ─── updateWorkspaceProfileAdmin — auditoria ─────────────────────────────────

describe("updateWorkspaceProfileAdmin — auditoria", () => {
  it("registra WORKSPACE_PROFILE_UPDATED com source admin", async () => {
    await updateWorkspaceProfileAdmin(WS_ID, null, fd(PROFILE_DATA));
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action:       "workspace_profile_updated",
        workspace_id: WS_ID,
        user_id:      SA.userId,
        metadata:     expect.objectContaining({ source: "admin" }),
      })
    );
  });

  it("não registra auditoria quando não é superadmin", async () => {
    mocks.requireSuperAdmin.mockResolvedValue(null);
    await updateWorkspaceProfileAdmin(WS_ID, null, fd(PROFILE_DATA));
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });
});
