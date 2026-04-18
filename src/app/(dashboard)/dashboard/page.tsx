import { createClient } from "@/lib/supabase/server";
import { SupabaseDashboardRepository } from "@/repositories/dashboard.repository";
import { GetDashboardStatsUseCase } from "@/usecases/GetDashboardStatsUseCase";
import { MetricCard } from "@/components/dashboard/metric-card";
import { LeadsChart } from "@/components/dashboard/leads-chart";
import { DealsChart } from "@/components/dashboard/deals-chart";
import { RecentContactsTable } from "@/components/dashboard/recent-contacts-table";
import { Users, DollarSign, MessageSquare, TrendingUp } from "lucide-react";
import { redirect } from "next/navigation";

function formatCurrency(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}K`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, current_workspace_id")
    .eq("id", user.id)
    .single();

  const workspaceId = profile?.current_workspace_id;
  if (!workspaceId) redirect("/login");

  const repo = new SupabaseDashboardRepository(supabase);
  const useCase = new GetDashboardStatsUseCase(repo);
  const { stats, leadsByDay, dealsByStatus, recentContacts, conversionRate } = await useCase.execute(workspaceId);

  const firstName = profile?.name?.split(" ")[0] ?? "usuário";
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total de Leads"
          value={stats.totalLeads.toLocaleString("pt-BR")}
          subtitle={`${stats.totalLeadsThisMonth} este mês`}
          icon={Users}
          accent="primary"
        />
        <MetricCard
          title="Negociações em aberto"
          value={formatCurrency(stats.openDealsValue)}
          subtitle={`${stats.openDealsCount} negociações`}
          icon={DollarSign}
          accent="green"
        />
        <MetricCard
          title="Conversas ativas"
          value={stats.openConversations.toLocaleString("pt-BR")}
          subtitle="Aguardando resposta"
          icon={MessageSquare}
          accent="amber"
        />
        <MetricCard
          title="Taxa de conversão"
          value={`${conversionRate}%`}
          subtitle={`${stats.wonDealsCount} deals ganhos`}
          icon={TrendingUp}
          accent="purple"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeadsChart data={leadsByDay} />
        </div>
        <div>
          <DealsChart data={dealsByStatus} />
        </div>
      </div>

      {/* Tabela recente */}
      <RecentContactsTable contacts={recentContacts} />

    </div>
  );
}
