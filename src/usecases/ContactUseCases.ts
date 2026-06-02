import type { IContactRepository, CreateContactDTO, UpdateContactDTO, ContactFilters } from "@/repositories/contact.repository";

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
