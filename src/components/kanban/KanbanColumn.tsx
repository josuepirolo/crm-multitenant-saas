"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { DealCard } from "@/components/kanban/DealCard";
import type { Stage } from "@/types";
import type { DealWithContact } from "@/repositories/deal.repository";

interface KanbanColumnProps {
  stage: Stage;
  deals: DealWithContact[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onAddDeal: (stageId: string) => void;
  onEditDeal: (deal: DealWithContact) => void;
  onCloseDeal: (dealId: string, status: "won" | "lost") => Promise<void>;
  onArchiveDeal: (dealId: string) => Promise<void>;
}

export function KanbanColumn({
  stage, deals,
  canCreate, canEdit, canDelete,
  onAddDeal, onEditDeal, onCloseDeal, onArchiveDeal,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const dealIds = deals.map(d => d.id);

  const totalValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const hasValue   = deals.some(d => d.value != null && d.value > 0);

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: stage.color }}
        />
        <span className="text-sm font-semibold truncate flex-1">{stage.name}</span>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 shrink-0">
          {deals.length}
        </span>
      </div>

      {/* Value summary */}
      {hasValue && (
        <p className="px-1 text-xs text-muted-foreground">
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalValue)}
        </p>
      )}

      {/* Cards droppable area */}
      <div
        ref={setNodeRef}
        className={[
          "flex flex-1 flex-col gap-2 rounded-2xl p-2 min-h-24 transition-colors duration-150",
          isOver ? "bg-primary/5 ring-2 ring-primary/20" : "bg-muted/40",
        ].join(" ")}
      >
        <SortableContext items={dealIds} strategy={verticalListSortingStrategy}>
          {deals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={onEditDeal}
              onClose={onCloseDeal}
              onArchive={onArchiveDeal}
            />
          ))}
        </SortableContext>

        {deals.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-6">
            <p className="text-xs text-muted-foreground">Nenhuma negociação</p>
          </div>
        )}
      </div>

      {/* Add deal button */}
      {canCreate && (
        <button
          type="button"
          onClick={() => onAddDeal(stage.id)}
          className="flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground hover:bg-muted/60"
        >
          <Plus size={14} />
          Adicionar negociação
        </button>
      )}
    </div>
  );
}
