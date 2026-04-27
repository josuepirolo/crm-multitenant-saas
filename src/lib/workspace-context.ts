import { createClient } from "@/lib/supabase/server";

export interface ActiveWorkspace {
  id: string;
  name: string;
  slug: string;
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { workspaces: [], currentWorkspaceId: null };

  const [workspacesResult, profileResult] = await Promise.all([
    supabase.from("workspaces").select("id, name, slug").order("name"),
    supabase.from("profiles").select("current_workspace_id").eq("id", user.id).single(),
  ]);

  const workspaces = (workspacesResult.data ?? []) as ActiveWorkspace[];
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
