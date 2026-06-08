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
  const { data: { user }, error: userError } = await getCachedUser();
  if (!user) {
    if (userError) {
      console.error("[getActiveWorkspaceContext] getUser() falhou:", { message: userError.message, status: userError.status });
    }
    return { workspaces: [], currentWorkspaceId: null };
  }

  const supabase = await createClient();

  const [workspacesResult, profileResult] = await Promise.all([
    supabase.from("workspaces").select("id, name, slug, business_niches(slug)").order("name"),
    supabase.from("profiles").select("current_workspace_id").eq("id", user.id).single(),
  ]);

  // Diagnóstico: queries RLS-filtradas que retornam vazio/erro ficavam mascaradas
  // como "sem workspace ativo" sem nenhum log — mesmo anti-padrão que escondeu os
  // bugs de captcha e AAL2. Loga sempre que houver erro OU lista vazia, para
  // distinguir "usuário realmente sem workspace" de "sessão/JWT inválido na query".
  if (workspacesResult.error || profileResult.error || (workspacesResult.data?.length ?? 0) === 0) {
    console.error("[getActiveWorkspaceContext] resultado inesperado:", {
      userId: user.id,
      workspacesError: workspacesResult.error ? { message: workspacesResult.error.message, code: workspacesResult.error.code } : null,
      workspacesCount: workspacesResult.data?.length ?? null,
      profileError: profileResult.error ? { message: profileResult.error.message, code: profileResult.error.code } : null,
      profileCurrentWorkspaceId: profileResult.data?.current_workspace_id ?? null,
    });
  }

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
