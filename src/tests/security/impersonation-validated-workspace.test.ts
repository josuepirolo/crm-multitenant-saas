import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testes de `getValidatedImpersonatedWorkspaceId` (src/lib/impersonation.ts).
 *
 * Esta função é a barreira de segurança usada por getCurrentWorkspaceId,
 * getWorkspaceContext e getUserRole para resolver o tenant correto durante
 * impersonação — só retorna o workspace impersonado se o cookie pertencer
 * ao usuário autenticado E ele for confirmado superadmin no banco.
 */

const cookieStore = new Map<string, string>();

const mocks = vi.hoisted(() => ({
  adminSingle: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: (k: string) => (cookieStore.has(k) ? { value: cookieStore.get(k) } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: mocks.adminSingle,
    }),
  }),
}));

import { getValidatedImpersonatedWorkspaceId } from "@/lib/impersonation";

const COOKIE_WID = "imp-wid";
const COOKIE_BY = "imp-by";
const COOKIE_NAME = "imp-name";

describe("getValidatedImpersonatedWorkspaceId", () => {
  beforeEach(() => {
    cookieStore.clear();
    mocks.adminSingle.mockReset();
  });

  it("retorna null quando não há cookie de impersonação", async () => {
    expect(await getValidatedImpersonatedWorkspaceId("user-1")).toBeNull();
    expect(mocks.adminSingle).not.toHaveBeenCalled();
  });

  it("retorna null quando o cookie pertence a outro usuário (cookie órfão/forjado)", async () => {
    cookieStore.set(COOKIE_WID, "ws-lekazis");
    cookieStore.set(COOKIE_BY, "admin-real");
    cookieStore.set(COOKIE_NAME, "Lekazis");

    expect(await getValidatedImpersonatedWorkspaceId("user-diferente")).toBeNull();
    expect(mocks.adminSingle).not.toHaveBeenCalled();
  });

  it("retorna null quando o usuário não é superadmin confirmado no banco", async () => {
    cookieStore.set(COOKIE_WID, "ws-lekazis");
    cookieStore.set(COOKIE_BY, "user-1");
    cookieStore.set(COOKIE_NAME, "Lekazis");
    mocks.adminSingle.mockResolvedValue({ data: { is_superadmin: false } });

    expect(await getValidatedImpersonatedWorkspaceId("user-1")).toBeNull();
  });

  it("retorna null quando is_superadmin está ausente/nulo no perfil", async () => {
    cookieStore.set(COOKIE_WID, "ws-lekazis");
    cookieStore.set(COOKIE_BY, "user-1");
    cookieStore.set(COOKIE_NAME, "Lekazis");
    mocks.adminSingle.mockResolvedValue({ data: { is_superadmin: null } });

    expect(await getValidatedImpersonatedWorkspaceId("user-1")).toBeNull();
  });

  it("retorna o workspaceId impersonado quando cookie válido + superadmin confirmado", async () => {
    cookieStore.set(COOKIE_WID, "ws-lekazis");
    cookieStore.set(COOKIE_BY, "user-1");
    cookieStore.set(COOKIE_NAME, "Lekazis");
    mocks.adminSingle.mockResolvedValue({ data: { is_superadmin: true } });

    expect(await getValidatedImpersonatedWorkspaceId("user-1")).toBe("ws-lekazis");
  });
});
