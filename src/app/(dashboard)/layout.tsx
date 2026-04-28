import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { getActiveWorkspaceContext } from "@/lib/workspace-context";
import { getImpersonationContext, clearImpersonation } from "@/lib/impersonation";
import { requireSuperAdmin } from "@/lib/guards";
import { createAdminClient } from "@/lib/supabase/admin";

async function resolveContext() {
  const impersonation = await getImpersonationContext();

  if (impersonation) {
    // Verifica superadmin no servidor — nunca confiar só no cookie
    const sa = await requireSuperAdmin();
    if (!sa) {
      // Cookie foi forjado por usuário comum — limpa e segue fluxo normal
      await clearImpersonation();
      const { workspaces, currentWorkspaceId } = await getActiveWorkspaceContext();
      return { workspaces, currentWorkspaceId, impersonation: null };
    }

    // service_role aqui é correto: superadmin precisa ver workspace inativo também
    const admin = createAdminClient();
    const { data: ws } = await admin
      .from("workspaces")
      .select("id, name, slug")
      .eq("id", impersonation.workspaceId)
      .single();

    return {
      workspaces: ws ? [{ id: ws.id, name: ws.name, slug: ws.slug }] : [],
      currentWorkspaceId: impersonation.workspaceId,
      impersonation,
    };
  }

  const { workspaces, currentWorkspaceId } = await getActiveWorkspaceContext();
  return { workspaces, currentWorkspaceId, impersonation: null };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspaces, currentWorkspaceId, impersonation } = await resolveContext();

  if (workspaces.length === 0) {
    redirect("/no-workspace");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar workspaces={workspaces} currentWorkspaceId={currentWorkspaceId!} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {impersonation && (
          <ImpersonationBanner workspaceName={impersonation.workspaceName} />
        )}
        <main className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
