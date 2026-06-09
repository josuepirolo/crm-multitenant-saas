import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/cached-auth";
import { getCurrentWorkspaceId } from "@/lib/guards";
import { SupabaseDashboardRepository } from "@/repositories/dashboard.repository";
import { GetDashboardStatsUseCase } from "@/usecases/GetDashboardStatsUseCase";
import { MetricCard } from "@/components/dashboard/metric-card";
import { LeadsChart } from "@/components/dashboard/leads-chart";
import { ContactsByStateCard } from "@/components/dashboard/contacts-by-state-card";
import { RecentContactsTable } from "@/components/dashboard/recent-contacts-table";
import { Users } from "lucide-react";
import { redirect } from "next/navigation";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  const { data: { user } } = await getCachedUser();
  if (!user) redirect("/login");

  const workspaceId = await getCurrentWorkspaceId();
  const supabase = await createClient();
  if (!workspaceId) redirect("/login");

  const firstName = (user.user_metadata?.name as string | undefined)?.split(" ")[0] ?? "usuário";

  const repo = new SupabaseDashboardRepository(supabase);
  const useCase = new GetDashboardStatsUseCase(repo);
  const { stats, leadsByDay, contactsByState, recentContacts } = await useCase.execute(workspaceId);

  const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground capitalize">{today}</p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          title="Total de Contatos"
          value={stats.totalLeads.toLocaleString("pt-BR")}
          subtitle={`${stats.totalLeadsThisMonth} este mês`}
          icon={Users}
          accent="primary"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeadsChart data={leadsByDay} />
        </div>
        <div>
          <ContactsByStateCard data={contactsByState} />
        </div>
      </div>

      {/* Tabela recente */}
      <RecentContactsTable contacts={recentContacts} />

    </div>
  );
}
