import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { getActiveWorkspaceContext } from "@/lib/workspace-context";
import { getImpersonationContext, clearImpersonation } from "@/lib/impersonation";
import { requireSuperAdmin } from "@/lib/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Verifica is_superadmin via anon key + RLS — sem service_role, zero overhead. */
async function checkIsSuperAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .single();
    return data?.is_superadmin === true;
  } catch {
    return false;
  }
}

async function resolveContext() {
  const [impersonation, isSuperAdmin] = await Promise.all([
    getImpersonationContext(),
    checkIsSuperAdmin(),
  ]);

  if (impersonation) {
    // Valida que o cookie é de um superadmin real — usa guards completo apenas aqui
    const sa = await requireSuperAdmin();
    if (!sa) {
      // Cookie forjado por usuário comum — limpa e segue fluxo normal
      await clearImpersonation();
      const { workspaces, currentWorkspaceId } = await getActiveWorkspaceContext();
      return { workspaces, currentWorkspaceId, impersonation: null, isSuperAdmin: false };
    }

    // service_role: superadmin precisa ver workspace inativo também
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
      isSuperAdmin: true,
    };
  }

  const { workspaces, currentWorkspaceId } = await getActiveWorkspaceContext();
  return { workspaces, currentWorkspaceId, impersonation: null, isSuperAdmin };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { workspaces, currentWorkspaceId, impersonation, isSuperAdmin } = await resolveContext();

  if (workspaces.length === 0) {
    redirect("/no-workspace");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar workspaces={workspaces} currentWorkspaceId={currentWorkspaceId!} isSuperAdmin={isSuperAdmin} />
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
