"use client";

import { useAdminViewModel, type AdminTab } from "@/viewmodels/useAdminViewModel";
import { AdminStatsCards } from "@/components/admin/admin-stats-cards";
import { WorkspacesTable } from "@/components/admin/workspaces-table";
import { WorkspaceDetailPanel } from "@/components/admin/workspace-detail-panel";
import { cn } from "@/lib/utils";

const TABS: { key: AdminTab; label: string }[] = [
  { key: "active",   label: "Ativos" },
  { key: "inactive", label: "Inativos" },
];

export function AdminClient() {
  const vm = useAdminViewModel();

  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto min-w-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Métricas globais da plataforma</p>
        </div>

        <AdminStatsCards stats={vm.stats} loading={vm.statsLoading} />

        {vm.fetchError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {vm.fetchError}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-muted/30 p-1 self-start">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => vm.switchTab(tab.key)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150",
                vm.activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <WorkspacesTable
          workspaces={vm.workspaces}
          total={vm.total}
          page={vm.page}
          pageSize={vm.pageSize}
          loading={vm.loading}
          search={vm.search}
          onSearchChange={vm.updateSearch}
          onPageChange={vm.setPage}
          onSelectWorkspace={vm.openWorkspaceDetail}
          selectedId={vm.selectedWorkspace?.id}
          activeTab={vm.activeTab}
        />
      </div>

      <WorkspaceDetailPanel
        workspace={vm.selectedWorkspace}
        members={vm.detailMembers}
        loading={vm.detailLoading}
        onClose={() => vm.setSelectedWorkspace(null)}
        onUpdateName={vm.handleUpdateWorkspaceName}
        onSetActive={vm.handleSetWorkspaceActive}
        onChangeMemberRole={vm.handleChangeMemberRole}
      />
    </div>
  );
}
