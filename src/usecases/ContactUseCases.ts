import type { IContactRepository, CreateContactDTO, UpdateContactDTO, ContactFilters } from "@/repositories/contact.repository";

export class GetContactsUseCase {
  constructor(private readonly repo: IContactRepository) {}
  execute(workspaceId: string, filters: ContactFilters, page: number, pageSize: number) {
    return this.repo.findAll(workspaceId, filters, page, pageSize);
  }
}

export class CreateContactUseCase {
  constructor(private readonly repo: IContactRepository) {}
  execute(data: CreateContactDTO) {
    return this.repo.create(data);
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
