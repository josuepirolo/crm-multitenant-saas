import type { IWorkspaceRepository, UpdateWorkspaceDTO } from "@/repositories/workspace.repository";
import type { Workspace } from "@/types";

type ProfileFields = Omit<UpdateWorkspaceDTO, "name">;

export class UpdateWorkspaceProfileUseCase {
  constructor(private readonly repo: IWorkspaceRepository) {}

  async execute(id: string, data: ProfileFields): Promise<Workspace> {
    return this.repo.update(id, data);
  }
}
