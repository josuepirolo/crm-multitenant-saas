"use server";

import { getWorkspaceContext, getScopedSupabaseClient } from "@/lib/guards";
import { SupabaseNicheRepository } from "@/repositories/niche.repository";
import { ListNicheTreeUseCase } from "@/usecases/NicheUseCases";
import { revalidatePath } from "next/cache";
import { publicError } from "@/lib/security/security-errors";

export async function listActiveNiches() {
  const ctx = await getWorkspaceContext("settings", "view");
  if ("error" in ctx) return { error: ctx.error, data: [] };
  const supabase = await getScopedSupabaseClient();
  try {
    const data = await new ListNicheTreeUseCase(new SupabaseNicheRepository(supabase)).execute(true);
    return { error: undefined, data };
  } catch {
    return { error: "Erro ao buscar nichos.", data: [] };
  }
}

export async function updateWorkspaceNiche(nicheId: string | null) {
  const ctx = await getWorkspaceContext("settings", "edit");
  if ("error" in ctx) return { error: ctx.error };

  const supabase = await getScopedSupabaseClient();
  try {
    // Valida que o nicho existe e está ativo (se não for null)
    if (nicheId) {
      const { data: niche } = await supabase
        .from("business_niches")
        .select("id, is_active")
        .eq("id", nicheId)
        .eq("is_active", true)
        .single();
      if (!niche) return { error: "Nicho inválido ou inativo." };
    }

    const { error } = await supabase
      .from("workspaces")
      .update({ business_niche_id: nicheId })
      .eq("id", ctx.workspaceId);

    if (error) throw new Error(error.message);
    revalidatePath("/settings");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao atualizar nicho da empresa.");
  }
}
