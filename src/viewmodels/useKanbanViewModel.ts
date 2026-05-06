"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { type DragStartEvent, type DragEndEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  getKanbanDataAction,
  getContactsForSelectAction,
  createDealAction,
  updateDealAction,
  moveDealAction,
  closeDealAction,
  archiveDealAction,
  createDefaultPipelineAction,
} from "@/app/(dashboard)/kanban/actions";
import { usePermissions } from "@/viewmodels/usePermissions";
import type { Pipeline, Stage } from "@/types";
import type { DealWithContact, ContactForSelect } from "@/repositories/deal.repository";
import type { CreateDealInput, UpdateDealInput } from "@/lib/validations/deal";

export function useKanbanViewModel() {
  const [pipeline, setPipeline]   = useState<Pipeline | null>(null);
  const [stages, setStages]       = useState<Stage[]>([]);
  const [deals, setDeals]         = useState<DealWithContact[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [editingDeal, setEditingDeal]     = useState<DealWithContact | null>(null);
  const [dialogStageId, setDialogStageId] = useState<string | null>(null);

  // Contacts for dialog — lazy-loaded once
  const [contacts, setContacts]       = useState<ContactForSelect[]>([]);
  const contactsLoaded = useRef(false);

  // DnD
  const [activeId, setActiveId] = useState<string | null>(null);

  const { can, isAdmin } = usePermissions(workspaceId);
  const canCreate = can("deals", "create");
  const canEdit   = can("deals", "edit");
  const canDelete = can("deals", "delete");

  // ── initial load ─────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getKanbanDataAction();
      if ("error" in result) { setError(result.error); return; }
      setPipeline(result.pipeline);
      setStages(result.stages);
      setDeals(result.deals);
      setWorkspaceId(result.workspaceId);
    } catch {
      setError("Erro ao carregar o funil de vendas.");
    } finally {
      setLoading(false);
    }
  }, []);

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    load();
  }, [load]);

  // ── derived state ─────────────────────────────────────────────────────────────

  const dealsByStage = useMemo(() => {
    const map = new Map<string, DealWithContact[]>();
    for (const stage of stages) map.set(stage.id, []);
    for (const deal of deals) {
      const col = map.get(deal.stage_id);
      if (col) col.push(deal);
    }
    return map;
  }, [deals, stages]);

  const activeDeal = useMemo(
    () => deals.find(d => d.id === activeId) ?? null,
    [deals, activeId],
  );

  // ── DnD ──────────────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (!over || !canEdit) return;

    const draggedId = active.id as string;
    const overId    = over.id as string;
    const dragged   = deals.find(d => d.id === draggedId);
    if (!dragged) return;

    // Determine target stage
    const targetStageId =
      stages.find(s => s.id === overId)?.id ??
      deals.find(d => d.id === overId)?.stage_id ??
      dragged.stage_id;

    // Compute new position (midpoint insertion)
    const targetDeals = (dealsByStage.get(targetStageId) ?? [])
      .filter(d => d.id !== draggedId)
      .sort((a, b) => a.position - b.position);

    let newPosition: number;
    const overDeal = targetDeals.find(d => d.id === overId);

    if (!overDeal || stages.find(s => s.id === overId)) {
      // Dropped on column or empty area → end of column
      newPosition = (targetDeals[targetDeals.length - 1]?.position ?? 0) + 1000;
    } else {
      const overIdx = targetDeals.findIndex(d => d.id === overId);
      const prev    = targetDeals[overIdx - 1]?.position ?? 0;
      const next    = targetDeals[overIdx]?.position ?? prev + 2000;
      newPosition   = Math.floor((prev + next) / 2);
      if (newPosition <= prev) newPosition = prev + 500;
    }

    // No-op guard
    if (targetStageId === dragged.stage_id && newPosition === dragged.position) return;

    // Optimistic update
    const snapshot = [...deals];
    setDeals(prev =>
      prev.map(d => d.id === draggedId ? { ...d, stage_id: targetStageId, position: newPosition } : d),
    );

    moveDealAction({ deal_id: draggedId, stage_id: targetStageId, position: newPosition })
      .then(r => {
        if (r && "error" in r && r.error) {
          toast.error(r.error);
          setDeals(snapshot);
        }
      })
      .catch(() => {
        toast.error("Erro ao mover negociação. Tente novamente.");
        setDeals(snapshot);
      });
  }

  // ── dialog ────────────────────────────────────────────────────────────────────

  function openCreate(stageId?: string) {
    setEditingDeal(null);
    setDialogStageId(stageId ?? stages[0]?.id ?? null);
    setDialogOpen(true);
    loadContacts();
  }

  function openEdit(deal: DealWithContact) {
    setEditingDeal(deal);
    setDialogStageId(deal.stage_id);
    setDialogOpen(true);
    loadContacts();
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingDeal(null);
    setDialogStageId(null);
  }

  function loadContacts() {
    if (contactsLoaded.current) return;
    contactsLoaded.current = true;
    getContactsForSelectAction().then(r => {
      if ("contacts" in r) setContacts(r.contacts);
    });
  }

  // ── mutations ─────────────────────────────────────────────────────────────────

  async function handleSaveDeal(input: CreateDealInput | UpdateDealInput) {
    if (editingDeal) {
      const result = await updateDealAction({ ...input as UpdateDealInput, deal_id: editingDeal.id });
      if ("error" in result && result.error) throw new Error(result.error);
      if ("deal" in result) {
        setDeals(prev => prev.map(d => d.id === result.deal.id ? result.deal : d));
      }
    } else {
      const result = await createDealAction(input as CreateDealInput);
      if ("error" in result && result.error) throw new Error(result.error);
      if ("deal" in result) {
        setDeals(prev => [...prev, result.deal]);
      }
    }
    closeDialog();
  }

  async function handleCloseDeal(dealId: string, status: "won" | "lost") {
    const result = await closeDealAction({ deal_id: dealId, status });
    if ("error" in result && result.error) throw new Error(result.error);
    setDeals(prev => prev.filter(d => d.id !== dealId));
  }

  async function handleArchiveDeal(dealId: string) {
    const result = await archiveDealAction(dealId);
    if ("error" in result && result.error) throw new Error(result.error);
    setDeals(prev => prev.filter(d => d.id !== dealId));
  }

  async function handleCreatePipeline() {
    const result = await createDefaultPipelineAction();
    if ("error" in result && result.error) throw new Error(result.error);
    if ("pipeline" in result) {
      setPipeline(result.pipeline);
      setStages(result.stages);
    }
  }

  return {
    // data
    pipeline, stages, deals, dealsByStage, workspaceId,
    // state
    loading, error,
    // permissions
    canCreate, canEdit, canDelete, isAdmin,
    // dnd
    activeId, activeDeal, sensors, handleDragStart, handleDragEnd,
    // dialog
    dialogOpen, editingDeal, dialogStageId,
    openCreate, openEdit, closeDialog,
    contacts,
    // mutations
    handleSaveDeal, handleCloseDeal, handleArchiveDeal, handleCreatePipeline,
  };
}
