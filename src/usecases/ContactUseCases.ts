import type { IContactRepository, CreateContactDTO, UpdateContactDTO, ContactFilters } from "@/repositories/contact.repository";
import type { IContactSourceRepository } from "@/repositories/contact-source.repository";
import type { ContactImportRow, ContactImportResult } from "@/types";

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function normalizeSourceName(value: string): string {
  return value.toLowerCase().trim().normalize("NFD").replace(DIACRITICS_REGEX, "");
}

export class GetContactsUseCase {
  constructor(private readonly repo: IContactRepository) {}
  execute(workspaceId: string, filters: ContactFilters, page: number, pageSize: number) {
    return this.repo.findAll(workspaceId, filters, page, pageSize);
  }
}

export class CreateContactUseCase {
  constructor(private readonly repo: IContactRepository) {}
  async execute(data: CreateContactDTO) {
    try {
      return await this.repo.create(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("idx_contacts_unique_email") || msg.includes("unique_email")) {
        throw new Error("Já existe um contato com esse e-mail neste workspace.");
      }
      if (msg.includes("idx_contacts_unique_phone") || msg.includes("unique_phone")) {
        throw new Error("Já existe um contato com esse telefone neste workspace.");
      }
      throw err;
    }
  }
}

export class UpdateContactUseCase {
  constructor(private readonly repo: IContactRepository) {}
  execute(workspaceId: string, id: string, data: UpdateContactDTO) {
    return this.repo.update(workspaceId, id, data);
  }
}

export class SoftDeleteContactUseCase {
  constructor(private readonly repo: IContactRepository) {}
  execute(workspaceId: string, id: string) {
    return this.repo.softDelete(workspaceId, id);
  }
}

export class AssignContactUseCase {
  constructor(private readonly repo: IContactRepository) {}
  execute(workspaceId: string, contactId: string, userId: string | null) {
    return this.repo.assign(workspaceId, contactId, userId);
  }
}

export class GrantContactAccessUseCase {
  constructor(private readonly repo: IContactRepository) {}
  execute(contactId: string, userId: string, grantedBy: string) {
    return this.repo.grantAccess(contactId, userId, grantedBy);
  }
}

export class RevokeContactAccessUseCase {
  constructor(private readonly repo: IContactRepository) {}
  execute(contactId: string, userId: string) {
    return this.repo.revokeAccess(contactId, userId);
  }
}

export class ListContactAccessUseCase {
  constructor(private readonly repo: IContactRepository) {}
  execute(contactId: string) {
    return this.repo.listAccess(contactId);
  }
}

// ─── importação em massa ─────────────────────────────────────────────────────
const IMPORT_BATCH_SIZE = 50;

function isUniqueViolation(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("idx_contacts_unique_phone") ||
    msg.includes("unique_phone") ||
    msg.includes("idx_contacts_unique_email") ||
    msg.includes("unique_email") ||
    msg.includes("idx_contacts_unique_document") ||
    msg.includes("unique_document") ||
    msg.startsWith("Já existe um contato")
  );
}

/**
 * Orquestra a criação em lote reaproveitando o mesmo `IContactRepository.create`
 * do cadastro individual — sem novo método de repositório. Linhas já chegam
 * pré-validadas pelo `contactSchema` (ver `parseContactImportFile`); aqui só
 * resta persistir em lotes e agregar um relatório, sem derrubar o lote inteiro
 * por causa de uma linha com problema.
 */
export class ImportContactsUseCase {
  constructor(
    private readonly repo: IContactRepository,
    private readonly sourceRepo: IContactSourceRepository
  ) {}

  async execute(workspaceId: string, userId: string, rows: ContactImportRow[], fallbackSourceId?: string | null): Promise<ContactImportResult> {
    const result: ContactImportResult = { total: rows.length, created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      if (row.status === "invalid") {
        result.skipped += 1;
        result.errors.push({ row: row.row, message: row.errors?.[0] ?? "Linha inválida." });
      } else if (row.status === "duplicate") {
        result.skipped += 1;
      }
    }

    const importable = rows.filter((row) => row.status === "valid");

    const sources = await this.sourceRepo.findAll(workspaceId, { onlyActive: true });
    const sourceByName = new Map(sources.map((s) => [normalizeSourceName(s.name), s.id]));
    const resolveSourceId = (rawName?: string): string | null => {
      if (rawName) return sourceByName.get(normalizeSourceName(rawName)) ?? fallbackSourceId ?? null;
      return fallbackSourceId ?? null;
    };

    for (let i = 0; i < importable.length; i += IMPORT_BATCH_SIZE) {
      const batch = importable.slice(i, i + IMPORT_BATCH_SIZE);
      const settled = await Promise.allSettled(
        batch.map((row) => {
          const dto: CreateContactDTO = {
            workspace_id: workspaceId,
            created_by: userId,
            name: row.data.name ?? "",
            phone: row.data.phone,
            email: row.data.email,
            document: row.data.document,
            company: row.data.company,
            status: row.data.status,
            notes: row.data.notes,
            source_id: resolveSourceId(row.data.source),
          };
          return this.repo.create(dto);
        })
      );

      settled.forEach((outcome, index) => {
        if (outcome.status === "fulfilled") {
          result.created += 1;
          return;
        }
        result.skipped += 1;
        if (!isUniqueViolation(outcome.reason)) {
          result.errors.push({ row: batch[index].row, message: "Erro ao criar este contato. Tente novamente." });
        }
      });
    }

    return result;
  }
}
