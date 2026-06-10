import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/guards";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { SessionTimer } from "@/components/ui/session-timer";
import {
  SESSION_COOKIE_STARTED, SESSION_COOKIE_ACTIVITY, SESSION_COOKIE_PROFILE,
  resolveSessionLimits, computeSessionExpiry,
} from "@/lib/security/session-policy";
import { Toaster } from "sonner";
import { ShieldCheck, LayoutDashboard } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) notFound();

  // Calcula expiry de sessão server-side para o SessionTimer (admin = 15min inatividade)
  const cookieStore = await cookies();
  const sessionExpiry = computeSessionExpiry(
    cookieStore.get(SESSION_COOKIE_STARTED)?.value,
    cookieStore.get(SESSION_COOKIE_ACTIVITY)?.value,
    resolveSessionLimits(cookieStore.get(SESSION_COOKIE_PROFILE)?.value),
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Banner de ambiente administrativo */}
        <div className="flex items-center justify-between gap-3 bg-primary/5 border-b border-primary/20 px-5 py-2.5 shrink-0">
          <div className="flex items-center gap-2 text-sm text-primary font-medium">
            <ShieldCheck size={15} className="shrink-0" />
            <span>Ambiente de administração do SaaS — ações aqui afetam empresas e usuários globalmente</span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-lg border border-primary/30 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors shrink-0"
          >
            <LayoutDashboard size={12} />
            Ir para o CRM
          </Link>
        </div>

        <main className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>
      {/* Timer de sessão — só renderiza se os cookies de expiração existirem */}
      {sessionExpiry.effectiveExpiresAt && sessionExpiry.absoluteExpiresAt && (
        <SessionTimer
          inactivityExpiresAt={sessionExpiry.inactivityExpiresAt!}
          absoluteExpiresAt={sessionExpiry.absoluteExpiresAt}
        />
      )}
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
