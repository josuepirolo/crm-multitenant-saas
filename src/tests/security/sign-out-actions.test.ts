import { describe, it, expect, vi, beforeEach } from "vitest";

const cookieStore = new Map<string, string>();

const mocks = vi.hoisted(() => ({
  getCachedUser: vi.fn(),
  createAuditLog: vi.fn().mockResolvedValue(undefined),
  clearImpersonation: vi.fn().mockResolvedValue(undefined),
  redirect: vi.fn().mockImplementation((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${url}` });
  }),
  mockSupabase: {
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock("@/lib/supabase/cached-auth", () => ({ getCachedUser: mocks.getCachedUser }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mocks.mockSupabase),
}));
vi.mock("@/lib/audit/audit-log", () => ({
  createAuditLog: mocks.createAuditLog,
  AUDIT_ACTIONS: { SESSION_LOGOUT: "session_logout" },
  AUDIT_SID_COOKIE: "audit-sid",
}));
vi.mock("@/lib/security/session-policy", () => ({
  SESSION_COOKIE_STARTED: "sess-started",
  SESSION_COOKIE_ACTIVITY: "sess-activity",
  SESSION_COOKIE_PROFILE: "sess-profile",
}));
vi.mock("@/lib/security/client-ip", () => ({
  getClientIp: vi.fn().mockResolvedValue("127.0.0.1"),
  getUserAgent: vi.fn().mockResolvedValue("vitest"),
}));
vi.mock("@/lib/impersonation", () => ({
  clearImpersonation: mocks.clearImpersonation,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    delete: (k: string) => cookieStore.delete(k),
  }),
}));

import { signOut } from "@/app/(dashboard)/actions";

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.clear();
  mocks.getCachedUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("signOut", () => {
  it("limpa cookies de impersonação junto com a sessão", async () => {
    try {
      await signOut();
    } catch {
      /* redirect */
    }
    expect(mocks.mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(mocks.clearImpersonation).toHaveBeenCalled();
  });
});
