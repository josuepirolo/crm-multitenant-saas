import type { IContactSourceRepository, CreateContactSourceDTO } from "@/repositories/contact-source.repository";

export class ListContactSourcesUseCase {
  constructor(private readonly repo: IContactSourceRepository) {}
  execute(workspaceId: string, options?: { onlyActive?: boolean }) {
    return this.repo.findAll(workspaceId, options);
  }
}

export class CreateContactSourceUseCase {
  constructor(private readonly repo: IContactSourceRepository) {}
  async execute(data: CreateContactSourceDTO) {
    try {
      return await this.repo.create(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("contact_sources_workspace_id_name_key") || msg.includes("duplicate key")) {
        throw new Error("Já existe uma origem com esse nome neste workspace.");
      }
      throw err;
    }
  }
}

export class RenameContactSourceUseCase {
  constructor(private readonly repo: IContactSourceRepository) {}
  async execute(workspaceId: string, id: string, name: string) {
    try {
      return await this.repo.rename(workspaceId, id, name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("contact_sources_workspace_id_name_key") || msg.includes("duplicate key")) {
        throw new Error("Já existe uma origem com esse nome neste workspace.");
      }
      throw err;
    }
  }
}

export class SetContactSourceActiveUseCase {
  constructor(private readonly repo: IContactSourceRepository) {}
  execute(workspaceId: string, id: string, isActive: boolean) {
    return this.repo.setActive(workspaceId, id, isActive);
  }
}
