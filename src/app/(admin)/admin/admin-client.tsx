"use client";

import { useAdminViewModel } from "@/viewmodels/useAdminViewModel";
import { AdminStatsCards } from "@/components/admin/admin-stats-cards";
import { WorkspacesTable } from "@/components/admin/workspaces-table";
import { WorkspaceDetailPanel } from "@/components/admin/workspace-detail-panel";

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
        />
      </div>

      <WorkspaceDetailPanel
        workspace={vm.selectedWorkspace}
        members={vm.detailMembers}
        loading={vm.detailLoading}
        onClose={() => vm.setSelectedWorkspace(null)}
      />
    </div>
  );
}
