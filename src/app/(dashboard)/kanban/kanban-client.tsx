"use client";

import { KanbanSkeleton } from "@/components/kanban/KanbanSkeleton";
import { KanbanBoard } from "@/components/kanban/KanbanBoard";
import { useKanbanViewModel } from "@/viewmodels/useKanbanViewModel";

export function KanbanClient() {
  const vm = useKanbanViewModel();

  if (vm.loading) return <KanbanSkeleton />;

  if (vm.error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-sm rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-5 text-center space-y-2">
          <p className="text-sm font-medium text-destructive">Erro ao carregar</p>
          <p className="text-xs text-muted-foreground">{vm.error}</p>
        </div>
      </div>
    );
  }

  return <KanbanBoard {...vm} />;
}
