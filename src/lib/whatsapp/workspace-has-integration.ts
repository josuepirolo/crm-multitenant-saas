import { getCurrentWorkspaceId, getScopedSupabaseClient } from "@/lib/guards";
import { SupabaseWorkspaceIntegrationRepository } from "@/repositories/workspace-integration.repository";

/** Workspace tem ≥1 vínculo WhatsApp em workspace_integrations (ADR-008). */
export async function workspaceHasWhatsAppIntegration(): Promise<boolean> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return false;

  try {
    const client = await getScopedSupabaseClient();
    const repo = new SupabaseWorkspaceIntegrationRepository(client);
    const links = await repo.listWaTenantLinksByWorkspace(workspaceId);
    return links.length > 0;
  } catch {
    return false;
  }
}
