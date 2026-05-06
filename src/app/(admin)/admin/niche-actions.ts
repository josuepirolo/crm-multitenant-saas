"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/guards";
import { SupabaseNicheRepository } from "@/repositories/niche.repository";
import {
  ListNicheTreeUseCase,
  CreateNicheUseCase,
  UpdateNicheUseCase,
  ToggleNicheActiveUseCase,
  DeleteNicheUseCase,
} from "@/usecases/NicheUseCases";
import { publicError } from "@/lib/security/security-errors";

function makeRepo() {
  return new SupabaseNicheRepository(createAdminClient());
}

export async function listNicheTree(onlyActive = false) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado.", data: [] };
  try {
    const data = await new ListNicheTreeUseCase(makeRepo()).execute(onlyActive);
    return { error: undefined, data };
  } catch {
    return { error: "Erro ao buscar nichos.", data: [] };
  }
}

export async function createNiche(_: unknown, formData: FormData) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado." };
  try {
    const niche = await new CreateNicheUseCase(makeRepo()).execute({
      parent_id:   (formData.get("parent_id") as string) || null,
      name:        formData.get("name") as string,
      slug:        (formData.get("slug") as string) || "",
      description: (formData.get("description") as string) || undefined,
      sort_order:  Number(formData.get("sort_order") ?? 0),
    });
    return { error: undefined, niche };
  } catch (err) {
    return publicError(err, "Erro ao criar nicho.");
  }
}

export async function updateNiche(id: string, _: unknown, formData: FormData) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado." };
  try {
    const niche = await new UpdateNicheUseCase(makeRepo()).execute(id, {
      name:        (formData.get("name") as string) || undefined,
      slug:        (formData.get("slug") as string) || undefined,
      description: (formData.get("description") as string) || undefined,
      sort_order:  formData.has("sort_order") ? Number(formData.get("sort_order")) : undefined,
    });
    return { error: undefined, niche };
  } catch (err) {
    return publicError(err, "Erro ao atualizar nicho.");
  }
}

export async function toggleNicheActive(id: string, active: boolean) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado." };
  try {
    await new ToggleNicheActiveUseCase(makeRepo()).execute(id, active);
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao alterar status do nicho.");
  }
}

export async function deleteNiche(id: string) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado." };
  try {
    await new DeleteNicheUseCase(makeRepo()).execute(id);
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao remover nicho.");
  }
}
