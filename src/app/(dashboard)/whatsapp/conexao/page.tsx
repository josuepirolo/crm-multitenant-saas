import { getWorkspaceContext } from "@/lib/guards";
import { getUserRole } from "@/lib/user-role";
import { getImpersonationContext } from "@/lib/impersonation";
import { IntegrationsTab } from "@/components/settings/integrations/integrations-tab";
import type { MemberRole } from "@/types";

export default async function WhatsAppConexaoPage() {
  const ctx = await getWorkspaceContext("settings", "view");
  if ("error" in ctx) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Você não tem permissão para ver a conexão WhatsApp deste workspace.
      </div>
    );
  }

  const impersonation = await getImpersonationContext();
  const userRole: MemberRole | null = impersonation
    ? "owner"
    : await getUserRole(ctx.workspaceId);

  return <IntegrationsTab userRole={userRole} />;
}
