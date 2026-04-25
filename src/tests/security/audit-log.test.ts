import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const insertFn = vi.fn().mockResolvedValue({ error: null });
  const fromFn   = vi.fn().mockReturnValue({ insert: insertFn });
  const mockAdmin = { from: fromFn };
  return { createAdminClient: vi.fn().mockReturnValue(mockAdmin), mockAdmin, insertFn, fromFn };
});

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));

import { createAuditLog, AUDIT_ACTIONS } from "@/lib/audit/audit-log";

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
