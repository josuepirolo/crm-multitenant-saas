import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/cached-auth";

export interface ActiveWorkspace {
  id: string;
  name: string;
  slug: string;
  nicheSlug?: string | null;
}

export interface WorkspaceContext {
  workspaces: ActiveWorkspace[];
  currentWorkspaceId: string | null;
}

/**
 * Retorna os workspaces ativos do usuário autenticado e o workspace atual.
 * Auto-corrige current_workspace_id se apontar para workspace inativo ou inexistente.
 * Usa anon key + RLS — my_workspace_ids() já filtra is_active = true.
 */
export async function getActiveWorkspaceContext(): Promise<WorkspaceContext> {
  const { data: { user } } = await getCachedUser();
  if (!user) return { workspaces: [], currentWorkspaceId: null };

  const supabase = await createClient();

  const [workspacesResult, profileResult] = await Promise.all([
    supabase.from("workspaces").select("id, name, slug, business_niches(slug)").order("name"),
    supabase.from("profiles").select("current_workspace_id").eq("id", user.id).single(),
  ]);

  const workspaces: ActiveWorkspace[] = (workspacesResult.data ?? []).map((w: any) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    nicheSlug: (w.business_niches as { slug: string } | null)?.slug ?? null,
  }));
  let currentWorkspaceId = profileResult.data?.current_workspace_id ?? null;

  // Auto-corrige: se current_workspace_id não está na lista de ativos, troca para o primeiro ativo
  const isCurrentValid = workspaces.some(w => w.id === currentWorkspaceId);
  if (!isCurrentValid) {
    currentWorkspaceId = workspaces[0]?.id ?? null;
    if (currentWorkspaceId) {
      await supabase
        .from("profiles")
        .update({ current_workspace_id: currentWorkspaceId })
        .eq("id", user.id);
    }
  }

  return { workspaces, currentWorkspaceId };
}
