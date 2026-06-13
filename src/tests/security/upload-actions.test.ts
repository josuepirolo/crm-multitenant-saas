import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockStorageBucket = {
    upload:         vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl:   vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.example.com/ws/logo.jpg" } }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: "https://signed.example.com/u/avatar.jpg" }, error: null }),
  };
  const mockDbChain = {
    update: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockResolvedValue({ error: null }),
  };
  const mockSupabase = {
    auth:    { getUser: vi.fn() },
    storage: { from: vi.fn().mockReturnValue(mockStorageBucket) },
    from:    vi.fn().mockReturnValue(mockDbChain),
  };
  return {
    getWorkspaceContext: vi.fn(),
    getScopedSupabaseClient: vi.fn().mockResolvedValue(mockSupabase),
    revalidatePath:      vi.fn(),
    createClient:        vi.fn().mockResolvedValue(mockSupabase),
    wsRepoUpdate:        vi.fn(),
    createAuditLog:      vi.fn().mockResolvedValue(undefined),
    getClientIp:         vi.fn().mockResolvedValue("127.0.0.1"),
    mockSupabase,
    mockStorageBucket,
    mockDbChain,
  };
});

vi.mock("@/lib/guards",           () => ({ getWorkspaceContext: mocks.getWorkspaceContext, getScopedSupabaseClient: mocks.getScopedSupabaseClient }));
vi.mock("next/cache",             () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/server",  () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/audit/audit-log",  () => ({
  createAuditLog: mocks.createAuditLog,
  AUDIT_ACTIONS: {
    WORKSPACE_LOGO_UPDATED: "workspace_logo_updated",
    USER_AVATAR_UPDATED:    "user_avatar_updated",
  },
}));
vi.mock("@/lib/security/client-ip",     () => ({ getClientIp: mocks.getClientIp }));
vi.mock("@/lib/security/security-errors", () => ({
  publicError: (_: unknown, msg: string) => ({ error: msg }),
}));
vi.mock("@/repositories/workspace.repository");

import { SupabaseWorkspaceRepository } from "@/repositories/workspace.repository";
import { uploadWorkspaceLogo, uploadUserAvatar } from "@/app/(dashboard)/settings/upload-actions";

// ─── Magic bytes helpers ───────────────────────────────────────────────────────

const JPEG_BYTES  = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01];
const PNG_BYTES   = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];
const WEBP_BYTES  = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];
const HTML_BYTES  = [0x3C, 0x21, 0x44, 0x4F, 0x43, 0x54, 0x59, 0x50, 0x45, 0x20, 0x68, 0x74];

function makeFile(bytes: number[], name: string, type: string, size?: number): File {
  const content = new Uint8Array(size ?? bytes.length);
  bytes.forEach((b, i) => { content[i] = b; });
  return new File([content], name, { type });
}

const makeJpeg  = (name = "logo.jpg")  => makeFile(JPEG_BYTES,  name, "image/jpeg");
const makePng   = (name = "logo.png")  => makeFile(PNG_BYTES,   name, "image/png");
const makeWebp  = (name = "logo.webp") => makeFile(WEBP_BYTES,  name, "image/webp");
const makeEvil  = ()                   => makeFile(HTML_BYTES,  "evil.jpg",  "image/jpeg");
const makeLarge = (mb: number)         => makeFile(JPEG_BYTES,  "big.jpg",   "image/jpeg", mb * 1024 * 1024 + 1);

function fd(file?: File): FormData {
  const f = new FormData();
  if (file) f.append("file", file);
  return f;
}

const CTX      = { workspaceId: "ws-aaa", userId: "user-aaa" };
const AUTH_USER = { id: "user-bbb" };
const ERR_AUTH  = { error: "Não autenticado." };
const ERR_PERM  = { error: "Você não tem permissão para realizar esta ação." };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue(mocks.mockSupabase);
  mocks.mockStorageBucket.upload.mockResolvedValue({ error: null });
  mocks.mockStorageBucket.getPublicUrl.mockReturnValue({ data: { publicUrl: "https://cdn.example.com/logo.jpg" } });
  mocks.mockStorageBucket.createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://signed.url/avatar.jpg" }, error: null });
  mocks.mockDbChain.eq.mockResolvedValue({ error: null });
  mocks.mockSupabase.auth.getUser.mockResolvedValue({ data: { user: AUTH_USER } });
  mocks.wsRepoUpdate.mockResolvedValue({ id: "ws-aaa", logo_url: "https://cdn.example.com/logo.jpg" });
  vi.mocked(SupabaseWorkspaceRepository).mockImplementation(function () {
    return { update: mocks.wsRepoUpdate } as never;
  });
});

// ─── uploadWorkspaceLogo — autenticação / autorização ─────────────────────────

describe("uploadWorkspaceLogo — autenticação / autorização", () => {
  it("bloqueia sem autenticação", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    const result = await uploadWorkspaceLogo(null, fd(makeJpeg()));
    expect(result).toMatchObject({ error: "Não autenticado." });
    expect(mocks.mockStorageBucket.upload).not.toHaveBeenCalled();
  });

  it("bloqueia sem permissão settings:edit", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_PERM);
    const result = await uploadWorkspaceLogo(null, fd(makeJpeg()));
    expect((result as { error: string }).error).toContain("permissão");
    expect(mocks.mockStorageBucket.upload).not.toHaveBeenCalled();
  });

  it("workspace_id do storage path vem do contexto, nunca do client", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    await uploadWorkspaceLogo(null, fd(makeJpeg()));
    const uploadCall = mocks.mockStorageBucket.upload.mock.calls[0];
    expect(uploadCall[0]).toContain(CTX.workspaceId);
    expect(uploadCall[0]).not.toContain("user-injected");
  });
});

// ─── uploadWorkspaceLogo — validação de arquivo ───────────────────────────────

describe("uploadWorkspaceLogo — validação de arquivo", () => {
  it("rejeita formData sem arquivo", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const result = await uploadWorkspaceLogo(null, new FormData());
    expect((result as { error: string }).error).toBeDefined();
    expect(mocks.mockStorageBucket.upload).not.toHaveBeenCalled();
  });

  it("rejeita MIME inválido (image/gif)", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const gif = makeFile([0x47, 0x49, 0x46], "img.gif", "image/gif");
    const result = await uploadWorkspaceLogo(null, fd(gif));
    expect((result as { error: string }).error).toContain("Formato inválido");
    expect(mocks.mockStorageBucket.upload).not.toHaveBeenCalled();
  });

  it("rejeita arquivo acima de 5 MB", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const result = await uploadWorkspaceLogo(null, fd(makeLarge(6)));
    expect((result as { error: string }).error).toContain("grande");
    expect(mocks.mockStorageBucket.upload).not.toHaveBeenCalled();
  });

  it("rejeita arquivo com MIME image/jpeg mas bytes de HTML (magic bytes inválidos)", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const result = await uploadWorkspaceLogo(null, fd(makeEvil()));
    expect((result as { error: string }).error).toBe("Arquivo inválido.");
    expect(mocks.mockStorageBucket.upload).not.toHaveBeenCalled();
  });

  it("aceita JPEG com magic bytes corretos", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const result = await uploadWorkspaceLogo(null, fd(makeJpeg()));
    expect((result as { error?: string }).error).toBeUndefined();
    expect(mocks.mockStorageBucket.upload).toHaveBeenCalledOnce();
  });

  it("aceita PNG com magic bytes corretos", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const result = await uploadWorkspaceLogo(null, fd(makePng()));
    expect((result as { error?: string }).error).toBeUndefined();
  });

  it("aceita WebP com magic bytes corretos", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    const result = await uploadWorkspaceLogo(null, fd(makeWebp()));
    expect((result as { error?: string }).error).toBeUndefined();
  });
});

// ─── uploadWorkspaceLogo — auditoria ─────────────────────────────────────────

describe("uploadWorkspaceLogo — auditoria", () => {
  it("registra WORKSPACE_LOGO_UPDATED com workspace_id do contexto", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(CTX);
    await uploadWorkspaceLogo(null, fd(makeJpeg()));
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action:       "workspace_logo_updated",
        workspace_id: CTX.workspaceId,
        user_id:      CTX.userId,
      })
    );
  });

  it("não registra auditoria quando guard falha", async () => {
    mocks.getWorkspaceContext.mockResolvedValue(ERR_AUTH);
    await uploadWorkspaceLogo(null, fd(makeJpeg()));
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });
});

// ─── uploadUserAvatar — autenticação ─────────────────────────────────────────

describe("uploadUserAvatar — autenticação", () => {
  it("bloqueia quando não há sessão", async () => {
    mocks.mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await uploadUserAvatar(null, fd(makeJpeg()));
    expect((result as { error: string }).error).toBe("Não autenticado.");
    expect(mocks.mockStorageBucket.upload).not.toHaveBeenCalled();
  });

  it("user_id no path vem do auth, nunca do client", async () => {
    await uploadUserAvatar(null, fd(makeJpeg()));
    const uploadCall = mocks.mockStorageBucket.upload.mock.calls[0];
    expect(uploadCall[0]).toContain(AUTH_USER.id);
    expect(uploadCall[0]).not.toContain("injected-id");
  });
});

// ─── uploadUserAvatar — validação de arquivo ─────────────────────────────────

describe("uploadUserAvatar — validação de arquivo", () => {
  it("rejeita MIME inválido", async () => {
    const gif = makeFile([0x47, 0x49, 0x46], "img.gif", "image/gif");
    const result = await uploadUserAvatar(null, fd(gif));
    expect((result as { error: string }).error).toContain("Formato inválido");
  });

  it("rejeita avatar acima de 2 MB", async () => {
    const result = await uploadUserAvatar(null, fd(makeLarge(3)));
    expect((result as { error: string }).error).toContain("grande");
  });

  it("rejeita arquivo com MIME jpeg mas magic bytes inválidos", async () => {
    const result = await uploadUserAvatar(null, fd(makeEvil()));
    expect((result as { error: string }).error).toBe("Arquivo inválido.");
    expect(mocks.mockStorageBucket.upload).not.toHaveBeenCalled();
  });

  it("aceita JPEG válido (magic bytes corretos)", async () => {
    const result = await uploadUserAvatar(null, fd(makeJpeg("avatar.jpg")));
    expect((result as { error?: string }).error).toBeUndefined();
  });

  it("não usa URL pública para avatar (bucket privado — signed URL)", async () => {
    await uploadUserAvatar(null, fd(makeJpeg("avatar.jpg")));
    expect(mocks.mockStorageBucket.createSignedUrl).toHaveBeenCalled();
    expect(mocks.mockStorageBucket.getPublicUrl).not.toHaveBeenCalled();
  });
});

// ─── uploadUserAvatar — isolamento cross-user ────────────────────────────────

describe("uploadUserAvatar — isolamento cross-user", () => {
  it("path nunca contém user_id de outro usuário", async () => {
    const otherUserId = "other-user-999";
    await uploadUserAvatar(null, fd(makeJpeg()));
    const uploadCall = mocks.mockStorageBucket.upload.mock.calls[0];
    expect(uploadCall[0]).not.toContain(otherUserId);
    expect(uploadCall[0]).toContain(AUTH_USER.id);
  });
});

// ─── uploadUserAvatar — auditoria ────────────────────────────────────────────

describe("uploadUserAvatar — auditoria", () => {
  it("registra USER_AVATAR_UPDATED com user_id do auth", async () => {
    await uploadUserAvatar(null, fd(makeJpeg()));
    expect(mocks.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action:  "user_avatar_updated",
        user_id: AUTH_USER.id,
      })
    );
  });

  it("não registra auditoria quando não autenticado", async () => {
    mocks.mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    await uploadUserAvatar(null, fd(makeJpeg()));
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });
});
