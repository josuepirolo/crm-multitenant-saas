import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const mockSupabase = {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      signOut: vi.fn().mockResolvedValue({}),
    },
  };
  const mockAdmin = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    }),
  };
  return {
    createClient: vi.fn().mockResolvedValue(mockSupabase),
    createAdminClient: vi.fn().mockReturnValue(mockAdmin),
    redirect: vi.fn().mockImplementation((url: string) => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${url}` });
    }),
    workspaceCreate: vi.fn().mockResolvedValue({ id: "ws-1" }),
    mockSupabase,
    mockAdmin,
  };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

vi.mock("@/repositories/workspace.repository", () => ({
  SupabaseWorkspaceRepository: vi.fn().mockImplementation(function () {
    return { create: mocks.workspaceCreate };
  }),
}));

vi.mock("@/lib/utils/slug", () => ({ uniqueSlug: vi.fn().mockReturnValue("empresa-a") }));

import { signIn, signUp, requestPasswordReset, updatePassword } from "@/app/(auth)/actions";

function fd(fields: Record<string, string>) {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => f.append(k, v));
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue(mocks.mockSupabase);
  mocks.createAdminClient.mockReturnValue(mocks.mockAdmin);
  mocks.mockSupabase.auth.signOut.mockResolvedValue({});
  mocks.workspaceCreate.mockResolvedValue({ id: "ws-1" });
  mocks.redirect.mockImplementation((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${url}` });
  });
});

// ─── signIn ───────────────────────────────────────────────────────────────────

describe("signIn — erros genéricos (não revelam existência de conta)", () => {
  it("retorna mensagem genérica quando credenciais inválidas", async () => {
    mocks.mockSupabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });

    const result = await signIn(null, fd({ email: "a@b.com", password: "wrongpass" }));

    expect((result as { error: string }).error).toBe("E-mail ou senha inválidos");
    expect((result as { error: string }).error).not.toContain("credential");
    expect((result as { error: string }).error).not.toContain("password");
  });

  it("retorna erro de validação sem chamar Supabase quando email inválido", async () => {
    const result = await signIn(null, fd({ email: "nao-e-email", password: "123" }));
    expect((result as { error: string }).error).toBeDefined();
    expect(mocks.mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("retorna mensagem de confirmação sem revelar que e-mail existe", async () => {
    mocks.mockSupabase.auth.signInWithPassword.mockResolvedValue({
      error: { message: "Email not confirmed" },
    });

    const result = await signIn(null, fd({ email: "a@b.com", password: "pass123" }));

    expect((result as { error: string }).error).toContain("Confirme seu e-mail");
    expect((result as { error: string }).error).not.toContain("a@b.com");
  });
});

// ─── signUp ───────────────────────────────────────────────────────────────────

describe("signUp — adminClient usado APENAS para criar workspace", () => {
  it("não chama createAdminClient antes de criar o usuário", async () => {
    mocks.mockSupabase.auth.signUp.mockResolvedValue({ error: { message: "already registered" }, data: {} });

    await signUp(null, fd({
      name: "João",
      workspaceName: "Empresa A",
      email: "joao@a.com",
      password: "Abc123!@#",
      confirmPassword: "Abc123!@#",
    }));

    // AdminClient não deve ser chamado quando signUp falha (antes de criar workspace)
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("createAdminClient é chamado apenas após signUp bem-sucedido (para workspace)", async () => {
    mocks.mockSupabase.auth.signUp.mockResolvedValue({
      error: null,
      data: { user: { id: "u-new" }, session: { access_token: "tok" } },
    });

    try {
      await signUp(null, fd({
        name: "Maria",
        workspaceName: "Empresa B",
        email: "maria@b.com",
        password: "Abc123!@#",
        confirmPassword: "Abc123!@#",
      }));
    } catch {
      // redirect lança exceção no mock — esperado
    }

    expect(mocks.createAdminClient).toHaveBeenCalledTimes(1);
    expect(mocks.workspaceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ owner_id: "u-new" })
    );
  });

  it("retorna erro genérico quando e-mail já registrado sem revelar dados internos", async () => {
    mocks.mockSupabase.auth.signUp.mockResolvedValue({
      error: { message: "User already registered" },
      data: {},
    });

    const result = await signUp(null, fd({
      name: "Test",
      workspaceName: "WS",
      email: "dup@b.com",
      password: "Abc123!@#",
      confirmPassword: "Abc123!@#",
    }));

    expect((result as { error: string }).error).toContain("já está cadastrado");
    expect((result as { error: string }).error).not.toContain("User already registered");
  });
});

// ─── requestPasswordReset ─────────────────────────────────────────────────────

describe("requestPasswordReset — não revela existência de conta", () => {
  it("retorna success:true independente do e-mail existir", async () => {
    mocks.mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

    const result = await requestPasswordReset(null, fd({ email: "qualquer@x.com" }));

    expect((result as { success: boolean }).success).toBe(true);
    expect((result as unknown as { error?: string }).error).toBeUndefined();
  });

  it("retorna erro genérico sem revelar se e-mail é válido", async () => {
    mocks.mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
      error: { message: "User not found" },
    });

    const result = await requestPasswordReset(null, fd({ email: "ghost@x.com" }));

    expect((result as { error: string }).error).not.toContain("User not found");
    expect((result as { error: string }).error).not.toContain("ghost@x.com");
  });

  it("retorna validação de schema sem chamar Supabase quando email inválido", async () => {
    const result = await requestPasswordReset(null, fd({ email: "invalido" }));
    expect((result as { error: string }).error).toBeDefined();
    expect(mocks.mockSupabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

// ─── updatePassword ───────────────────────────────────────────────────────────

describe("updatePassword — encerra sessão de recovery após atualizar senha", () => {
  it("chama signOut após updateUser bem-sucedido", async () => {
    mocks.mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    try {
      await updatePassword(null, fd({ password: "NovaSenha1!", confirmPassword: "NovaSenha1!" }));
    } catch {
      // redirect lança exceção — esperado
    }

    expect(mocks.mockSupabase.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("redireciona para /login?reset=1 (não para /dashboard) após reset", async () => {
    mocks.mockSupabase.auth.updateUser.mockResolvedValue({ error: null });

    let redirectTarget = "";
    mocks.redirect.mockImplementation((url: string) => {
      redirectTarget = url;
      throw new Error("NEXT_REDIRECT");
    });

    try {
      await updatePassword(null, fd({ password: "NovaSenha1!", confirmPassword: "NovaSenha1!" }));
    } catch {
      // esperado
    }

    expect(redirectTarget).toBe("/login?reset=1");
    expect(redirectTarget).not.toBe("/dashboard");
  });

  it("não chama signOut quando updateUser falha", async () => {
    mocks.mockSupabase.auth.updateUser.mockResolvedValue({
      error: { message: "Token expired" },
    });

    const result = await updatePassword(null, fd({ password: "NovaSenha1!", confirmPassword: "NovaSenha1!" }));

    expect(mocks.mockSupabase.auth.signOut).not.toHaveBeenCalled();
    expect((result as { error: string }).error).toBeDefined();
  });

  it("retorna erro genérico quando link expirado — não vaza detalhe interno", async () => {
    mocks.mockSupabase.auth.updateUser.mockResolvedValue({
      error: { message: "JWT expired" },
    });

    const result = await updatePassword(null, fd({ password: "NovaSenha1!", confirmPassword: "NovaSenha1!" }));

    expect((result as { error: string }).error).not.toContain("JWT");
    expect((result as { error: string }).error).toContain("link");
  });
});
