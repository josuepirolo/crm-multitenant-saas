"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { getImpersonationContext } from "@/lib/impersonation";
import { requireSuperAdmin } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { publicError } from "@/lib/security/security-errors";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setNicheOnboarding(nicheId: string) {
  if (!UUID_RE.test(nicheId)) return { error: "Nicho inválido." };

  const { data: { user } } = await getCachedUser();
  if (!user) return { error: "Não autenticado." };

  const impersonation = await getImpersonationContext();
  let workspaceId: string;

  if (impersonation) {
    const sa = await requireSuperAdmin();
    if (!sa) return { error: "Não autorizado." };
    workspaceId = impersonation.workspaceId;
  } else {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_workspace_id")
      .eq("id", user.id)
      .single();
    if (!profile?.current_workspace_id) return { error: "Workspace não encontrado." };
    workspaceId = profile.current_workspace_id;
  }

  try {
    const supabase = await createClient();
    const { data: niche } = await supabase
      .from("business_niches")
      .select("id")
      .eq("id", nicheId)
      .eq("is_active", true)
      .single();
    if (!niche) return { error: "Nicho inválido ou inativo." };

    const admin = createAdminClient();
    const { error } = await admin
      .from("workspaces")
      .update({ business_niche_id: nicheId })
      .eq("id", workspaceId);

    if (error) throw new Error(error.message);
    revalidatePath("/dashboard");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao salvar segmento da empresa.");
  }
}
