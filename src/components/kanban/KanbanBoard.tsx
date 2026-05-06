"use client";

import { DndContext, DragOverlay, closestCorners } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { KanbanEmptyState } from "@/components/kanban/KanbanEmptyState";
import { DealCard } from "@/components/kanban/DealCard";
import { DealDialog } from "@/components/kanban/DealDialog";
import type { useKanbanViewModel } from "@/viewmodels/useKanbanViewModel";

type VM = ReturnType<typeof useKanbanViewModel>;

export function KanbanBoard(vm: VM) {
  const {
    pipeline, stages, dealsByStage, activeDeal,
    canCreate, canEdit, canDelete, isAdmin,
    sensors, handleDragStart, handleDragEnd,
    dialogOpen, editingDeal, dialogStageId,
    openCreate, openEdit, closeDialog,
    contacts,
    handleSaveDeal, handleCloseDeal, handleArchiveDeal, handleCreatePipeline,
  } = vm;

  if (!pipeline) {
    return (
      <KanbanEmptyState
        isAdmin={isAdmin}
        onCreatePipeline={handleCreatePipeline}
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      {/* Board header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Negociações</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{pipeline.name}</p>
        </div>
        {canCreate && (
          <Button onClick={() => openCreate()} className="rounded-xl gap-1.5">
            <Plus size={15} />
            Nova Negociação
          </Button>
        )}
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Horizontal scroll container — mobile: 280px min per column (KC-07) */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
          {stages.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={dealsByStage.get(stage.id) ?? []}
              canCreate={canCreate}
              canEdit={canEdit}
              canDelete={canDelete}
              onAddDeal={stageId => openCreate(stageId)}
              onEditDeal={openEdit}
              onCloseDeal={handleCloseDeal}
              onArchiveDeal={handleArchiveDeal}
            />
          ))}
        </div>

        {/* Drag overlay — renders a clone of the active card */}
        <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.25,0.46,0.45,0.94)" }}>
          {activeDeal && (
            <DealCard
              deal={activeDeal}
              isDragOverlay
              canEdit={false}
              canDelete={false}
              onEdit={() => {}}
              onClose={async () => {}}
              onArchive={async () => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* Deal dialog */}
      {pipeline && (
        <DealDialog
          open={dialogOpen}
          deal={editingDeal}
          stageId={dialogStageId}
          pipelineId={pipeline.id}
          stages={stages}
          contacts={contacts}
          onClose={closeDialog}
          onSave={handleSaveDeal}
        />
      )}
    </div>
  );
}
