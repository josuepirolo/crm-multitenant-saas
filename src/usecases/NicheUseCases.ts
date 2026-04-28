import type { INicheRepository, CreateNicheDTO, UpdateNicheDTO } from "@/repositories/niche.repository";
import { buildNicheTree } from "@/repositories/niche.repository";
import type { BusinessNiche } from "@/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export class ListNicheTreeUseCase {
  constructor(private readonly repo: INicheRepository) {}
  async execute(onlyActive = true): Promise<BusinessNiche[]> {
    const flat = onlyActive ? await this.repo.listActive() : await this.repo.listAll();
    return buildNicheTree(flat);
  }
}

export class CreateNicheUseCase {
  constructor(private readonly repo: INicheRepository) {}
  async execute(data: CreateNicheDTO): Promise<BusinessNiche> {
    if (!data.name.trim()) throw new Error("Nome do nicho é obrigatório.");
    const slug = data.slug?.trim() || slugify(data.name);
    return this.repo.create({ ...data, name: data.name.trim(), slug });
  }
}

export class UpdateNicheUseCase {
  constructor(private readonly repo: INicheRepository) {}
  async execute(id: string, data: UpdateNicheDTO): Promise<BusinessNiche> {
    if (data.name !== undefined && !data.name.trim()) throw new Error("Nome não pode ser vazio.");
    const slug = data.slug?.trim() || (data.name ? slugify(data.name) : undefined);
    return this.repo.update(id, { ...data, ...(slug ? { slug } : {}) });
  }
}

export class ToggleNicheActiveUseCase {
  constructor(private readonly repo: INicheRepository) {}
  async execute(id: string, active: boolean): Promise<void> {
    return this.repo.setActive(id, active);
  }
}

export class DeleteNicheUseCase {
  constructor(private readonly repo: INicheRepository) {}
  async execute(id: string): Promise<void> {
    const inUse = await this.repo.isUsedByWorkspace(id);
    if (inUse) throw new Error("Este nicho está sendo usado por uma ou mais empresas e não pode ser removido.");
    // O ON DELETE RESTRICT no parent_id impede excluir pai com filhos no banco.
    // Aqui levamos o erro do banco até a camada pública.
    await this.repo.setActive(id, false); // soft delete: desativa em vez de excluir fisicamente
  }
}
