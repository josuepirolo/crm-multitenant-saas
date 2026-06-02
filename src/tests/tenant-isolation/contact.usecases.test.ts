import { describe, it, expect, vi } from "vitest";
import {
  GetContactsUseCase,
  CreateContactUseCase,
  UpdateContactUseCase,
  SoftDeleteContactUseCase,
} from "@/usecases/ContactUseCases";
import type { IContactRepository } from "@/repositories/contact.repository";
import type { Contact } from "@/types";

const WS_A = "workspace-aaa-111";
const WS_B = "workspace-bbb-222";

const makeContact = (ws = WS_A): Contact => ({
  id: "c-1",
  workspace_id: ws,
  name: "Contato Teste",
  phone: null,
  email: "t@test.com",
  document: null,
  company: null,
  status: "lead",
  avatar_url: null,
  notes: null,
  custom_fields: {},
  assigned_to: null,
  created_by: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

function makeRepoMock(): IContactRepository {
  return {
    findAll:      vi.fn().mockResolvedValue({ data: [makeContact()], total: 1 }),
    findById:     vi.fn().mockResolvedValue(makeContact()),
    create:       vi.fn().mockResolvedValue(makeContact()),
    update:       vi.fn().mockResolvedValue(makeContact()),
    softDelete:   vi.fn().mockResolvedValue(undefined),
    assign:       vi.fn().mockResolvedValue(makeContact()),
    listAccess:   vi.fn().mockResolvedValue([]),
    grantAccess:  vi.fn().mockResolvedValue(undefined),
    revokeAccess: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── GetContactsUseCase ───────────────────────────────────────────────────────

describe("GetContactsUseCase — propagação de workspace_id", () => {
  it("repassa workspace_id para o repositório", async () => {
    const repo = makeRepoMock();
    const uc = new GetContactsUseCase(repo);

    await uc.execute(WS_A, {}, 0, 20);

    expect(repo.findAll).toHaveBeenCalledWith(WS_A, {}, 0, 20);
  });

  it("workspace_id diferente não vaza para outro usecase", async () => {
    const repo = makeRepoMock();
    const uc = new GetContactsUseCase(repo);

    await uc.execute(WS_B, {}, 0, 20);

    expect(repo.findAll).toHaveBeenCalledWith(WS_B, {}, 0, 20);
    expect(repo.findAll).not.toHaveBeenCalledWith(WS_A, expect.anything(), expect.anything(), expect.anything());
  });
});

// ─── CreateContactUseCase ─────────────────────────────────────────────────────

describe("CreateContactUseCase — workspace_id no payload", () => {
  it("repassa workspace_id do DTO ao repositório", async () => {
    const repo = makeRepoMock();
    const uc = new CreateContactUseCase(repo);

    await uc.execute({ workspace_id: WS_A, name: "Novo" });

    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ workspace_id: WS_A }));
  });

  it("lança erro de email duplicado sem vazar dados do tenant", async () => {
    const repo = makeRepoMock();
    (repo.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("idx_contacts_unique_email violates unique constraint")
    );
    const uc = new CreateContactUseCase(repo);

    await expect(uc.execute({ workspace_id: WS_A, name: "João" })).rejects.toThrow(
      "Já existe um contato com esse e-mail"
    );
  });

  it("lança erro de telefone duplicado sem vazar dados do tenant", async () => {
    const repo = makeRepoMock();
    (repo.create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("idx_contacts_unique_phone violates unique constraint")
    );
    const uc = new CreateContactUseCase(repo);

    await expect(uc.execute({ workspace_id: WS_A, name: "Maria" })).rejects.toThrow(
      "Já existe um contato com esse telefone"
    );
  });
});

// ─── UpdateContactUseCase ─────────────────────────────────────────────────────

describe("UpdateContactUseCase — workspace_id obrigatório", () => {
  it("repassa workspace_id ao update do repositório", async () => {
    const repo = makeRepoMock();
    const uc = new UpdateContactUseCase(repo);

    await uc.execute(WS_A, "c-1", { name: "Atualizado" });

    expect(repo.update).toHaveBeenCalledWith(WS_A, "c-1", { name: "Atualizado" });
  });

  it("workspace B não pode atualizar contato de workspace A", async () => {
    const repo = makeRepoMock();
    (repo.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("No rows found or permission denied")
    );
    const uc = new UpdateContactUseCase(repo);

    await expect(uc.execute(WS_B, "c-1", { name: "Hack" })).rejects.toThrow();
  });
});

// ─── SoftDeleteContactUseCase ─────────────────────────────────────────────────

describe("SoftDeleteContactUseCase — workspace_id obrigatório", () => {
  it("repassa workspace_id ao softDelete do repositório", async () => {
    const repo = makeRepoMock();
    const uc = new SoftDeleteContactUseCase(repo);

    await uc.execute(WS_A, "c-1");

    expect(repo.softDelete).toHaveBeenCalledWith(WS_A, "c-1");
  });

  it("workspace B não pode deletar contato de workspace A", async () => {
    const repo = makeRepoMock();
    (repo.softDelete as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("permission denied")
    );
    const uc = new SoftDeleteContactUseCase(repo);

    await expect(uc.execute(WS_B, "c-1")).rejects.toThrow();
  });
});
