import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testes de proteção das Server Actions.
 * Verifica que as actions rejeitam acesso sem sessão / tenant errado.
 *
 * vi.hoisted() é obrigatório: vi.mock() é hoistado antes das const, então
 * variáveis declaradas no corpo do módulo não existem quando o factory executa.
 */

// ─── mocks hoistados (executam antes de qualquer import) ─────────────────────

const mocks = vi.hoisted(() => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  };
  const mockAdmin = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { name: "Empresa A" }, error: null }),
    }),
  };
  return {
    getWorkspaceContext: vi.fn(),
    getCurrentWorkspaceId: vi.fn(),
    revalidatePath: vi.fn(),
    softDelete: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findAll: vi.fn(),
    createClient: vi.fn().mockResolvedValue(mockSupabase),
    createAdminClient: vi.fn().mockReturnValue(mockAdmin),
    mockSupabase,
    mockAdmin,
  };
});

vi.mock("@/lib/guards", () => ({
  getWorkspaceContext: mocks.getWorkspaceContext,
  getCurrentWorkspaceId: mocks.getCurrentWorkspaceId,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/repositories/contact.repository", () => ({
  // Vitest v4: mockImplementation de construtor exige function, não arrow
  SupabaseContactRepository: vi.fn().mockImplementation(function () {
    return {
      findAll: mocks.findAll,
      findById: vi.fn().mockResolvedValue(null),
      create: mocks.create,
      update: mocks.update,
      softDelete: mocks.softDelete,
    };
  }),
}));

// ─── imports das actions (após mocks) ────────────────────────────────────────

import {
  createContact,
  updateContact,
  deleteContact,
  getContacts,
} from "@/app/(dashboard)/contacts/actions";

const WS_A = "workspace-aaa";
const USER_A = "user-aaa";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Re-setup após clearAllMocks (clear apaga call history mas não implementações
  // de mocks criados em vi.hoisted — são resetados para vi.fn() sem impl)
  mocks.softDelete.mockResolvedValue(undefined);
  mocks.create.mockResolvedValue({ id: "c1", workspace_id: WS_A });
  mocks.update.mockResolvedValue({ id: "c1", workspace_id: WS_A });
  mocks.findAll.mockResolvedValue({ data: [], total: 0 });
  mocks.createClient.mockResolvedValue(mocks.mockSupabase);
  mocks.createAdminClient.mockReturnValue(mocks.mockAdmin);
});

// ─── createContact ────────────────────────────────────────────────────────────

describe("createContact — proteção de acesso", () => {
  it("retorna erro quando não há sessão", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ error: "Não autenticado." });

    const result = await createContact(null, makeFormData({ name: "Test" }));

    expect(result).toEqual({ error: "Não autenticado." });
  });

  it("retorna erro quando workspace não pertence ao usuário", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ error: "Workspace não encontrado." });

    const result = await createContact(null, makeFormData({ name: "Test" }));

    expect(result).toEqual({ error: "Workspace não encontrado." });
  });

  it("retorna erro quando usuário não tem permissão de criação", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ error: "Você não tem permissão para realizar esta ação." });

    const result = await createContact(null, makeFormData({ name: "Test" }));

    expect((result as { error: string }).error).toContain("permissão");
  });

  it("não chama repositório se guard retornar erro", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ error: "Não autenticado." });

    await createContact(null, makeFormData({ name: "Test" }));

    expect(mocks.create).not.toHaveBeenCalled();
  });
});

// ─── updateContact ────────────────────────────────────────────────────────────

describe("updateContact — proteção de acesso", () => {
  it("retorna erro quando não há sessão", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ error: "Não autenticado." });

    const result = await updateContact(null, makeFormData({ id: "c1", name: "Novo" }));

    expect(result).toEqual({ error: "Não autenticado." });
  });

  it("retorna erro quando id não é fornecido (antes do guard)", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ workspaceId: WS_A, userId: USER_A });

    const result = await updateContact(null, makeFormData({ name: "Sem id" }));

    expect((result as { error: string }).error).toBeDefined();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("não chama repositório se guard retornar erro", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ error: "Não autenticado." });

    await updateContact(null, makeFormData({ id: "c1", name: "Test" }));

    expect(mocks.update).not.toHaveBeenCalled();
  });
});

// ─── deleteContact ────────────────────────────────────────────────────────────

describe("deleteContact — proteção de acesso", () => {
  it("retorna erro quando não há sessão", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ error: "Não autenticado." });

    const result = await deleteContact("c1");

    expect(result).toEqual({ error: "Não autenticado." });
  });

  it("retorna erro quando usuário não tem permissão de delete", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ error: "Você não tem permissão para realizar esta ação." });

    const result = await deleteContact("c1");

    expect((result as { error: string }).error).toContain("permissão");
  });

  it("não chama repositório se guard retornar erro", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ error: "Não autenticado." });

    await deleteContact("c1");

    expect(mocks.softDelete).not.toHaveBeenCalled();
  });

  it("executa softDelete quando contexto é válido", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ workspaceId: WS_A, userId: USER_A });

    const result = await deleteContact("c1");

    expect(mocks.softDelete).toHaveBeenCalledWith(WS_A, "c1");
    expect((result as { error: string | undefined }).error).toBeUndefined();
  });

  it("workspaceId do softDelete vem do contexto autenticado, nunca do parâmetro livre", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ workspaceId: WS_A, userId: USER_A });

    await deleteContact("c1");

    const [calledWsId, calledId] = mocks.softDelete.mock.calls[0];
    expect(calledWsId).toBe(WS_A);
    expect(calledId).toBe("c1");
  });
});

// ─── getContacts ──────────────────────────────────────────────────────────────

describe("getContacts — sem workspace retorna vazio seguro", () => {
  it("retorna erro e lista vazia quando getWorkspaceContext retorna erro", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ error: "Não autenticado" });

    const result = await getContacts({}, 0, 20);

    expect(result.error).toBeDefined();
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(mocks.findAll).not.toHaveBeenCalled();
  });

  it("chama findAll com workspaceId derivado do servidor", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ workspaceId: WS_A, userId: USER_A });

    await getContacts({}, 0, 20);

    expect(mocks.findAll).toHaveBeenCalledWith(WS_A, {}, 0, 20);
  });

  it("workspaceId nunca vem de parâmetro externo — sempre do guard", async () => {
    mocks.getWorkspaceContext.mockResolvedValue({ workspaceId: WS_A, userId: USER_A });

    await getContacts({}, 0, 20);

    const [wsArg] = mocks.findAll.mock.calls[0];
    expect(wsArg).toBe(WS_A);
  });
});
