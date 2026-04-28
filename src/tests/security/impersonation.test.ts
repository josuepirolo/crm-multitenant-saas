import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const cookieStore = new Map<string, string>();

const mocks = vi.hoisted(() => ({
  requireSuperAdmin: vi.fn(),
  getClientIp:       vi.fn().mockResolvedValue("127.0.0.1"),
  getUserAgent:      vi.fn().mockResolvedValue("vitest"),
  createAuditLog:    vi.fn().mockResolvedValue(undefined),
  redirect:          vi.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${url}` });
  }),
  adminFrom: vi.fn(),
}));

vi.mock("@/lib/guards", () => ({ requireSuperAdmin: mocks.requireSuperAdmin }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({ from: mocks.adminFrom }),
}));
vi.mock("@/lib/security/client-ip", () => ({
  getClientIp: mocks.getClientIp,
  getUserAgent: mocks.getUserAgent,
}));
vi.mock("@/lib/audit/audit-log", () => ({
  createAuditLog: mocks.createAuditLog,
  AUDIT_ACTIONS: {
    IMPERSONATION_STARTED: "impersonation_started",
    IMPERSONATION_ENDED:   "impersonation_ended",
  },
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get:    (k: string) => cookieStore.has(k) ? { value: cookieStore.get(k) } : undefined,
    set:    (k: string, v: string) => cookieStore.set(k, v),
    delete: (k: string) => cookieStore.delete(k),
  }),
}));

import { startImpersonation, stopImpersonation } from "@/app/(admin)/admin/impersonation-actions";

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.clear();
  mocks.adminFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { name: "Empresa Teste" } }),
  });
});

// ─── startImpersonation ───────────────────────────────────────────────────────

describe("startImpersonation", () => {
  it("rejeita se não for superadmin", async () => {
    mocks.requireSuperAdmin.mockResolvedValue(null);
    await startImpersonation("ws-abc");
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("seta cookies e redireciona para /dashboard", async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ userId: "admin-uuid" });
    try { await startImpersonation("ws-abc"); } catch { /* redirect */ }
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("cria audit log IMPERSONATION_STARTED com workspace_id correto", async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ userId: "admin-uuid" });
    try { await startImpersonation("ws-abc"); } catch { /* redirect */ }
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action:   "impersonation_started",
        user_id:  "admin-uuid",
        metadata: expect.objectContaining({ target_workspace_id: "ws-abc" }),
      })
    );
  });

  it("não inicia se workspace não existir", async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ userId: "admin-uuid" });
    mocks.adminFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    });
    await startImpersonation("ws-inexistente");
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });
});

// ─── stopImpersonation ────────────────────────────────────────────────────────

describe("stopImpersonation", () => {
  it("rejeita se não for superadmin", async () => {
    mocks.requireSuperAdmin.mockResolvedValue(null);
    await stopImpersonation();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  it("limpa cookies e redireciona para /admin", async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ userId: "admin-uuid" });
    cookieStore.set("imp-wid", "ws-abc");
    cookieStore.set("imp-by",  "admin-uuid");
    cookieStore.set("imp-name", "Empresa Teste");
    try { await stopImpersonation(); } catch { /* redirect */ }
    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });

  it("cria audit log IMPERSONATION_ENDED quando havia contexto", async () => {
    mocks.requireSuperAdmin.mockResolvedValue({ userId: "admin-uuid" });
    cookieStore.set("imp-wid",  "ws-abc");
    cookieStore.set("imp-by",   "admin-uuid");
    cookieStore.set("imp-name", "Empresa Teste");
    try { await stopImpersonation(); } catch { /* redirect */ }
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action:   "impersonation_ended",
        user_id:  "admin-uuid",
        metadata: expect.objectContaining({ target_workspace_id: "ws-abc" }),
      })
    );
  });
});
