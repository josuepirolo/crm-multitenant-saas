import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testes de segurança do BFF do backend WhatsApp (ADR-006).
 * Cobre BFF-02..BFF-11 do harness settings-integrations.
 */

const mocks = vi.hoisted(() => {
  const mockClient = {};
  return {
    getWorkspaceContext: vi.fn(),
    getScopedSupabaseClient: vi.fn().mockResolvedValue(mockClient),
    getUserAccessToken: vi.fn(),
    createAuditLog: vi.fn().mockResolvedValue(undefined),
    getClientIp: vi.fn().mockResolvedValue("127.0.0.1"),
    // repo wa-management
    listInstances: vi.fn(),
    getStatus: vi.fn(),
    getQrCode: vi.fn(),
    restart: vi.fn(),
    disconnect: vi.fn(),
    // repo workspace-integration
    listWaTenantLinksByWorkspace: vi.fn(),
    mockClient,
  };
});

vi.mock("@/lib/guards", () => ({
  getWorkspaceContext: mocks.getWorkspaceContext,
  getScopedSupabaseClient: mocks.getScopedSupabaseClient,
}));
// Partial mock: mantém as classes de erro reais; só sobrescreve getUserAccessToken.
vi.mock("@/lib/wa-backend/client", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/wa-backend/client")>();
  return { ...actual, getUserAccessToken: mocks.getUserAccessToken };
});
vi.mock("@/lib/audit/audit-log", () => ({
  createAuditLog: mocks.createAuditLog,
  AUDIT_ACTIONS: {
    WA_INSTANCE_RESTARTED:    "wa_instance_restarted",
    WA_INSTANCE_DISCONNECTED: "wa_instance_disconnected",
  },
}));
vi.mock("@/lib/security/client-ip", () => ({ getClientIp: mocks.getClientIp }));
vi.mock("@/repositories/wa-management.repository");
vi.mock("@/repositories/workspace-integration.repository");

import { WaBackendManagementRepository } from "@/repositories/wa-management.repository";
import { SupabaseWorkspaceIntegrationRepository } from "@/repositories/workspace-integration.repository";
import {
  WaBackendHttpError,
  WaBackendNotConfiguredError,
  WaBackendUnreachableError,
} from "@/lib/wa-backend/client";
import {
  listWorkspaceWaInstances,
  getWaInstanceStatus,
  getWaInstanceQrCode,
  restartWaInstance,
  disconnectWaInstance,
} from "@/app/(dashboard)/settings/integrations-actions";

const CTX = { workspaceId: "ws-aaa", userId: "user-aaa" };
const ERR_PERM = { error: "Você não tem permissão para realizar esta ação." };
const TENANT = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_TENANT = "550e8400-e29b-41d4-a716-44665544ffff";
const INSTANCE = "550e8400-e29b-41d4-a716-446655440111";
const TOKEN = "jwt-user-token";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getScopedSupabaseClient.mockResolvedValue(mocks.mockClient);
  mocks.getUserAccessToken.mockResolvedValue(TOKEN);
  mocks.getClientIp.mockResolvedValue("127.0.0.1");
  mocks.createAuditLog.mockResolvedValue(undefined);
  mocks.listWaTenantLinksByWorkspace.mockResolvedValue([{ wa_tenant_id: TENANT, label: "Vendas" }]);
  mocks.listInstances.mockResolvedValue([]);

  vi.mocked(WaBackendManagementRepository).mockImplementation(function () {
    return {
      listInstances: mocks.listInstances,
      getStatus: mocks.getStatus,
      getQrCode: mocks.getQrCode,
      restart: mocks.restart,
      disconnect: mocks.disconnect,
    } as never;
  });
  vi.mocked(SupabaseWorkspaceIntegrationRepository).mockImplementation(function () {
    return { listWaTenantLinksByWorkspace: mocks.listWaTenantLinksByWorkspace } as never;
  });
});

// ── BFF-05/06: gate de RBAC (settings:view leitura / settings:edit mutação) ──

describe("gate de permissão (settings)", () => {
  it("BFF-05: leitura usa settings:view e bloqueia sem permissão", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_PERM);
    const r = await listWorkspaceWaInstances();
    expect(mocks.getWorkspaceContext).toHaveBeenCalledWith("settings", "view");
    expect(r.error).toContain("permissão");
    expect(r.instances).toHaveLength(0);
    expect(mocks.listInstances).not.toHaveBeenCalled();
  });

  it("BFF-06: mutação usa settings:edit e bloqueia sem permissão (sem auditoria)", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_PERM);
    const r = await restartWaInstance(TENANT, INSTANCE);
    expect(mocks.getWorkspaceContext).toHaveBeenCalledWith("settings", "edit");
    expect(r.error).toContain("permissão");
    expect(mocks.restart).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });
});

// ── BFF-02: repassa o JWT do próprio usuário ─────────────────────────────────

describe("repasse do JWT do usuário", () => {
  it("BFF-02: status chama o repo com o access_token do usuário", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.getStatus.mockResolvedValue({ instance_id: INSTANCE, status: "connected", connected: true });
    await getWaInstanceStatus(TENANT, INSTANCE);
    expect(mocks.getStatus).toHaveBeenCalledWith(INSTANCE, TOKEN);
  });

  it("sem sessão (token nulo) → erro de acesso, sem chamar o backend", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.getUserAccessToken.mockResolvedValue(null);
    const r = await getWaInstanceStatus(TENANT, INSTANCE);
    expect(r.error).toBe("Sua conta não tem acesso a esta instância WhatsApp. Fale com o suporte.");
    expect(mocks.getStatus).not.toHaveBeenCalled();
  });
});

// ── BFF-04: anti-IDOR (tenant tem de pertencer ao workspace) ─────────────────

describe("anti-IDOR — binding tenant→workspace", () => {
  it("BFF-04: tenant fora do workspace é bloqueado antes de chamar o backend", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const r = await getWaInstanceStatus(OTHER_TENANT, INSTANCE);
    expect(r.error).toContain("não tem acesso");
    expect(mocks.getStatus).not.toHaveBeenCalled();
  });

  it("ids não-UUID são rejeitados", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const r = await getWaInstanceStatus("not-a-uuid", INSTANCE);
    expect(r.error).toBe("Requisição inválida.");
    expect(mocks.getStatus).not.toHaveBeenCalled();
  });
});

// ── BFF-07/08/09: tradução de erros do backend ───────────────────────────────

describe("tradução de erros do backend WA", () => {
  it("BFF-07: 403 do backend → mensagem amigável de acesso", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.getStatus.mockRejectedValue(new WaBackendHttpError(403));
    const r = await getWaInstanceStatus(TENANT, INSTANCE);
    expect(r.error).toContain("não tem acesso");
  });

  it("BFF-08: 409 no QR → alreadyConnected, sem qrcode", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.getQrCode.mockResolvedValue({ alreadyConnected: true });
    const r = await getWaInstanceQrCode(TENANT, INSTANCE);
    expect(r.alreadyConnected).toBe(true);
    expect(r.qrcode).toBeUndefined();
    expect(r.error).toBeUndefined();
  });

  it("BFF-09: timeout/inacessível → serviço indisponível", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.getStatus.mockRejectedValue(new WaBackendUnreachableError());
    const r = await getWaInstanceStatus(TENANT, INSTANCE);
    expect(r.error).toContain("indisponível");
  });

  it("BFF-03: backend não configurado → mensagem de não configurado", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.getStatus.mockRejectedValue(new WaBackendNotConfiguredError());
    const r = await getWaInstanceStatus(TENANT, INSTANCE);
    expect(r.error).toContain("não está configurada");
  });

  it("5xx genérico não vaza detalhe interno", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.getStatus.mockRejectedValue(new WaBackendHttpError(502));
    const r = await getWaInstanceStatus(TENANT, INSTANCE);
    expect(r.error).toBe("Serviço de WhatsApp indisponível no momento. Tente novamente.");
  });
});

// ── BFF-11: auditoria de mutação ─────────────────────────────────────────────

describe("auditoria de mutação", () => {
  it("BFF-11: restart bem-sucedido gera audit log sem dado sensível", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.restart.mockResolvedValue(undefined);
    const r = await restartWaInstance(TENANT, INSTANCE);
    expect(r.error).toBeUndefined();
    expect(mocks.restart).toHaveBeenCalledWith(INSTANCE, TOKEN);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "wa_instance_restarted",
        workspace_id: CTX.workspaceId,
        user_id: CTX.userId,
        entity_type: "wa_instance",
        entity_id: INSTANCE,
        metadata: expect.objectContaining({ tenant_id: TENANT, source: "user" }),
      })
    );
    const audited = mocks.createAuditLog.mock.calls[0][0];
    expect(JSON.stringify(audited)).not.toContain(TOKEN);
  });

  it("disconnect gera audit log com a ação correta", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.disconnect.mockResolvedValue(undefined);
    await disconnectWaInstance(TENANT, INSTANCE);
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "wa_instance_disconnected", entity_id: INSTANCE })
    );
  });

  it("falha do backend na mutação não audita", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.restart.mockRejectedValue(new WaBackendHttpError(502));
    const r = await restartWaInstance(TENANT, INSTANCE);
    expect(r.error).toContain("indisponível");
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });
});

// ── listagem agrega instâncias dos tenants do workspace ──────────────────────

describe("listagem de instâncias", () => {
  it("agrega instâncias e ata tenant_id + label do vínculo", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.listInstances.mockResolvedValue([
      { instance_id: INSTANCE, name: "Vendas", status: "connected", provider_id: "zapi" },
    ]);
    const r = await listWorkspaceWaInstances();
    expect(r.error).toBeUndefined();
    expect(r.instances).toHaveLength(1);
    expect(r.instances[0]).toMatchObject({
      instance_id: INSTANCE,
      tenant_id: TENANT,
      integration_label: "Vendas",
    });
    expect(mocks.listInstances).toHaveBeenCalledWith(TENANT, TOKEN);
  });

  it("workspace sem vínculos retorna lista vazia sem chamar o backend", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    mocks.listWaTenantLinksByWorkspace.mockResolvedValue([]);
    const r = await listWorkspaceWaInstances();
    expect(r.instances).toHaveLength(0);
    expect(mocks.listInstances).not.toHaveBeenCalled();
  });
});
