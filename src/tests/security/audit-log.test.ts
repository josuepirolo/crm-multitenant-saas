import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const insertFn = vi.fn().mockResolvedValue({ error: null });
  const fromFn   = vi.fn().mockReturnValue({ insert: insertFn });
  const mockAdmin = { from: fromFn };
  const cookiesGet = vi.fn().mockReturnValue(undefined);
  const cookiesStore = { get: cookiesGet };
  return {
    createAdminClient: vi.fn().mockReturnValue(mockAdmin),
    mockAdmin, insertFn, fromFn,
    cookiesGet, cookiesStore,
  };
});

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue(mocks.cookiesStore),
}));

import { createAuditLog, AUDIT_ACTIONS, buildFingerprint } from "@/lib/audit/audit-log";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createAdminClient.mockReturnValue(mocks.mockAdmin);
  mocks.mockAdmin.from.mockReturnValue({ insert: mocks.insertFn });
  mocks.insertFn.mockResolvedValue({ error: null });
});

// ─── inserção correta ─────────────────────────────────────────────────────────

describe("createAuditLog — inserção", () => {
  it("chama admin.from('audit_logs').insert com os campos corretos", async () => {
    await createAuditLog({
      action:       AUDIT_ACTIONS.LOGIN_SUCCESS,
      user_id:      "user-abc",
      ip_address:   "1.2.3.4",
      user_agent:   "vitest",
    });

    expect(mocks.mockAdmin.from).toHaveBeenCalledWith("audit_logs");
    expect(mocks.insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        action:     "login_success",
        user_id:    "user-abc",
        ip_address: "1.2.3.4",
        metadata:   {},
      })
    );
  });

  it("inclui workspace_id quando fornecido", async () => {
    await createAuditLog({
      action:       AUDIT_ACTIONS.WORKSPACE_UPDATED,
      workspace_id: "ws-xyz",
      user_id:      "user-abc",
      entity_type:  "workspace",
      entity_id:    "ws-xyz",
    });

    expect(mocks.insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_id: "ws-xyz", entity_type: "workspace" })
    );
  });

  it("inclui metadata limpo quando fornecido", async () => {
    await createAuditLog({
      action:   AUDIT_ACTIONS.MEMBER_INVITED,
      metadata: { role: "sales", count: 1 },
    });

    expect(mocks.insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { role: "sales", count: 1 } })
    );
  });
});

// ─── sanitização de metadata ──────────────────────────────────────────────────

describe("createAuditLog — sanitizeMetadata", () => {
  it("remove chaves com 'password'", async () => {
    await createAuditLog({
      action:   AUDIT_ACTIONS.LOGIN_FAILURE,
      metadata: { password: "secreta", reason: "invalid" },
    });

    const inserted = mocks.insertFn.mock.calls[0][0];
    expect(inserted.metadata).not.toHaveProperty("password");
    expect(inserted.metadata).toHaveProperty("reason", "invalid");
  });

  it("remove chaves com 'token'", async () => {
    await createAuditLog({
      action:   AUDIT_ACTIONS.LOGIN_FAILURE,
      metadata: { token: "abc123", context: "login" },
    });

    const inserted = mocks.insertFn.mock.calls[0][0];
    expect(inserted.metadata).not.toHaveProperty("token");
    expect(inserted.metadata).toHaveProperty("context", "login");
  });

  it("remove chaves com 'secret', 'key', 'auth'", async () => {
    await createAuditLog({
      action:   AUDIT_ACTIONS.RATE_LIMIT_TRIGGERED,
      metadata: { secret: "x", apiKey: "y", authToken: "z", context: "login" },
    });

    const inserted = mocks.insertFn.mock.calls[0][0];
    expect(Object.keys(inserted.metadata)).toEqual(["context"]);
  });
});

// ─── resiliência ──────────────────────────────────────────────────────────────

describe("createAuditLog — resiliência", () => {
  it("não lança exceção quando admin.insert falha", async () => {
    mocks.insertFn.mockRejectedValue(new Error("DB connection failed"));

    await expect(
      createAuditLog({ action: AUDIT_ACTIONS.LOGIN_SUCCESS })
    ).resolves.toBeUndefined();
  });

  it("não lança exceção quando createAdminClient lança", async () => {
    mocks.createAdminClient.mockImplementation(() => {
      throw new Error("Admin client error");
    });

    await expect(
      createAuditLog({ action: AUDIT_ACTIONS.LOGIN_FAILURE })
    ).resolves.toBeUndefined();
  });
});

// ─── fingerprint ─────────────────────────────────────────────────────────────

describe("buildFingerprint", () => {
  it("retorna string de 24 chars", () => {
    const fp = buildFingerprint("1.2.3.4", "Mozilla/5.0");
    expect(fp).toHaveLength(24);
  });

  it("é estável para os mesmos inputs", () => {
    const a = buildFingerprint("1.2.3.4", "Mozilla/5.0");
    const b = buildFingerprint("1.2.3.4", "Mozilla/5.0");
    expect(a).toBe(b);
  });

  it("muda quando user_agent muda", () => {
    const a = buildFingerprint("1.2.3.4", "Mozilla/5.0");
    const b = buildFingerprint("1.2.3.4", "curl/7.0");
    expect(a).not.toBe(b);
  });

  it("muda quando IP muda (diferente /24)", () => {
    const a = buildFingerprint("1.2.3.4", "Mozilla/5.0");
    const b = buildFingerprint("5.6.7.8", "Mozilla/5.0");
    expect(a).not.toBe(b);
  });

  it("não contém o IP em claro", () => {
    const fp = buildFingerprint("1.2.3.4", "Mozilla/5.0");
    expect(fp).not.toContain("1.2.3");
  });

  it("não contém o user_agent em claro", () => {
    const fp = buildFingerprint("1.2.3.4", "Mozilla/5.0");
    expect(fp).not.toContain("Mozilla");
  });

  it("IPs no mesmo /24 geram mesmo fingerprint", () => {
    const a = buildFingerprint("1.2.3.1", "Mozilla/5.0");
    const b = buildFingerprint("1.2.3.99", "Mozilla/5.0");
    expect(a).toBe(b);
  });

  it("trata IP 'unknown' sem lançar erro", () => {
    expect(() => buildFingerprint("unknown", "Mozilla/5.0")).not.toThrow();
  });
});

// ─── session_id + fingerprint no audit ───────────────────────────────────────

describe("createAuditLog — session_id e fingerprint", () => {
  it("inclui fingerprint calculado automaticamente a partir de ip + ua", async () => {
    await createAuditLog({
      action:     AUDIT_ACTIONS.LOGIN_SUCCESS,
      ip_address: "1.2.3.4",
      user_agent: "Mozilla/5.0",
    });

    const inserted = mocks.insertFn.mock.calls[0][0];
    expect(inserted.fingerprint).toBeDefined();
    expect(typeof inserted.fingerprint).toBe("string");
    expect(inserted.fingerprint).toHaveLength(24);
  });

  it("inclui session_id do cookie quando disponível", async () => {
    mocks.cookiesGet.mockReturnValue({ value: "test-session-uuid" });

    await createAuditLog({ action: AUDIT_ACTIONS.LOGIN_SUCCESS });

    const inserted = mocks.insertFn.mock.calls[0][0];
    expect(inserted.session_id).toBe("test-session-uuid");
  });

  it("session_id é null quando cookie não existe", async () => {
    mocks.cookiesGet.mockReturnValue(undefined);

    await createAuditLog({ action: AUDIT_ACTIONS.LOGIN_SUCCESS });

    const inserted = mocks.insertFn.mock.calls[0][0];
    expect(inserted.session_id).toBeNull();
  });

  it("session_id fornecido manualmente tem prioridade sobre cookie", async () => {
    mocks.cookiesGet.mockReturnValue({ value: "cookie-session" });

    await createAuditLog({
      action:     AUDIT_ACTIONS.LOGIN_SUCCESS,
      session_id: "manual-session",
    });

    const inserted = mocks.insertFn.mock.calls[0][0];
    expect(inserted.session_id).toBe("manual-session");
  });

  it("fingerprint não é calculado sem ip_address nem user_agent", async () => {
    await createAuditLog({ action: AUDIT_ACTIONS.WORKSPACE_UPDATED });

    const inserted = mocks.insertFn.mock.calls[0][0];
    expect(inserted.fingerprint).toBeUndefined();
  });
});

// ─── AUDIT_ACTIONS constantes ─────────────────────────────────────────────────

describe("AUDIT_ACTIONS — valores corretos", () => {
  it("LOGIN_SUCCESS é 'login_success'", () => {
    expect(AUDIT_ACTIONS.LOGIN_SUCCESS).toBe("login_success");
  });
  it("RATE_LIMIT_TRIGGERED é 'rate_limit_triggered'", () => {
    expect(AUDIT_ACTIONS.RATE_LIMIT_TRIGGERED).toBe("rate_limit_triggered");
  });
  it("todos os valores são strings não-vazias", () => {
    for (const [k, v] of Object.entries(AUDIT_ACTIONS)) {
      expect(typeof v, `${k} deve ser string`).toBe("string");
      expect(v.length, `${k} não pode ser vazio`).toBeGreaterThan(0);
    }
  });
});
