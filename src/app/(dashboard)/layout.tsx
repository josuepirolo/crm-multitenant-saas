import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { MfaBanner } from "@/components/ui/mfa-banner";
import { SessionTimer } from "@/components/ui/session-timer";
import { NicheSetupWall } from "@/components/dashboard/niche-setup-wall";
import {
  SESSION_COOKIE_STARTED, SESSION_COOKIE_ACTIVITY, SESSION_COOKIE_PROFILE,
  resolveSessionLimits, computeSessionExpiry,
} from "@/lib/security/session-policy";
import { getActiveWorkspaceContext } from "@/lib/workspace-context";
import { getNicheThemeClass } from "@/lib/themes/niche-themes";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { AreaTracker } from "@/components/dashboard/area-tracker";
import { getImpersonationContext, clearImpersonation } from "@/lib/impersonation";
import { requireSuperAdmin } from "@/lib/guards";
// eslint-disable-next-line no-restricted-imports -- checkIsSuperAdmin é self-lookup (auth.uid()), não do workspace
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { workspaceHasWhatsAppIntegration } from "@/lib/whatsapp/workspace-has-integration";
import type { BusinessNiche } from "@/types";

// Verifica is_superadmin via anon key + RLS — sem service_role, zero overhead.
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
      .select("id, name, slug, business_niches(slug)")
      .eq("id", impersonation.workspaceId)
      .single();

    return {
      workspaces: ws ? [{
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        nicheSlug: ((ws.business_niches as unknown) as { slug: string } | null)?.slug ?? null,
      }] : [],
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

  // Admin/owner sem 2FA → obriga a configurar antes de acessar qualquer rota.
  // O flag é gravado no login (auth/actions.ts) via cookie para evitar DB em toda requisição.
  const cookieStore = await cookies();
  if (!impersonation && cookieStore.get("require-mfa-setup")?.value === "1") {
    redirect("/mfa/setup");
  }

  // Calcula expiry de sessão server-side para passar ao SessionTimer (sem expor cookies ao client)
  const sessionExpiry = computeSessionExpiry(
    cookieStore.get(SESSION_COOKIE_STARTED)?.value,
    cookieStore.get(SESSION_COOKIE_ACTIVITY)?.value,
    resolveSessionLimits(cookieStore.get(SESSION_COOKIE_PROFILE)?.value),
  );

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
  const themeClass = getNicheThemeClass(currentWorkspace?.nicheSlug);
  const hasWhatsApp = await workspaceHasWhatsAppIntegration();

  // Workspace sem nicho definido — obriga configuração (superadmin dispensado)
  if (!currentWorkspace?.nicheSlug && !isSuperAdmin) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("business_niches")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .order("name");
    const niches: BusinessNiche[] = (data ?? []) as BusinessNiche[];

    return (
      <div className="relative overflow-hidden">
        {impersonation && (
          <div className="fixed top-0 left-0 right-0 z-50">
            <ImpersonationBanner workspaceName={impersonation.workspaceName} />
          </div>
        )}
        <NicheSetupWall niches={niches} />
        <Toaster position="bottom-right" richColors />
      </div>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden bg-background${themeClass ? ` ${themeClass}` : ''}`}>
      <Sidebar
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspaceId!}
        isSuperAdmin={isSuperAdmin}
        hasWhatsApp={hasWhatsApp}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        {impersonation && (
          <ImpersonationBanner workspaceName={impersonation.workspaceName} />
        )}
        <main className="flex flex-1 flex-col overflow-y-auto pt-14 md:pt-0 w-full max-w-[1920px] mx-auto">
          {/* Banner de recomendação de 2FA para usuários não-admin */}
          <MfaBanner />
          {children}
        </main>
        {/* Timer de sessão — só renderiza se os cookies de expiração existirem */}
        {sessionExpiry.effectiveExpiresAt && sessionExpiry.absoluteExpiresAt && (
          <SessionTimer
            inactivityExpiresAt={sessionExpiry.inactivityExpiresAt!}
            absoluteExpiresAt={sessionExpiry.absoluteExpiresAt}
          />
        )}
      </div>
      <AreaTracker />
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
