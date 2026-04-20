import type { IWorkspaceRepository, UpdateWorkspaceDTO } from "@/repositories/workspace.repository";
import type { Workspace } from "@/types";

export class UpdateWorkspaceUseCase {
  constructor(private readonly repo: IWorkspaceRepository) {}

  async execute(id: string, data: UpdateWorkspaceDTO): Promise<Workspace> {
    if (!data.name?.trim()) throw new Error("Nome do workspace é obrigatório.");
    return this.repo.update(id, { name: data.name.trim() });
  }
}
