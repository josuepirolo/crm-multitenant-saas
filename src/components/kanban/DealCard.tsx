"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DollarSign, CalendarDays, User, Trophy, ThumbsDown, Archive } from "lucide-react";
import { toast } from "sonner";
import type { DealWithContact } from "@/repositories/deal.repository";

interface DealCardProps {
  deal: DealWithContact;
  isDragOverlay?: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (deal: DealWithContact) => void;
  onClose: (dealId: string, status: "won" | "lost") => Promise<void>;
  onArchive: (dealId: string) => Promise<void>;
}

export function DealCard({
  deal, isDragOverlay = false,
  canEdit, canDelete,
  onEdit, onClose, onArchive,
}: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: deal.id, disabled: !canEdit });

  const style = isDragOverlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  function handleClose(status: "won" | "lost") {
    const label = status === "won" ? "Ganho" : "Perdido";
    toast.promise(onClose(deal.id, status), {
      loading: `Marcando como ${label}...`,
      success: `Negociação marcada como ${label}!`,
      error: (e) => e?.message ?? `Erro ao marcar como ${label}.`,
    });
  }

  function handleArchive() {
    toast.promise(onArchive(deal.id), {
      loading: "Arquivando...",
      success: "Negociação arquivada.",
      error: (e) => e?.message ?? "Erro ao arquivar.",
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => canEdit && !isDragging && onEdit(deal)}
      className={[
        "group relative rounded-xl border border-border bg-card p-4 text-left",
        "shadow-sm transition-shadow duration-150 select-none",
        canEdit ? "cursor-grab active:cursor-grabbing hover:shadow-md" : "cursor-default",
        isDragging && !isDragOverlay ? "opacity-40 ring-2 ring-primary/30" : "",
        isDragOverlay ? "shadow-xl ring-2 ring-primary/20 rotate-1" : "",
      ].join(" ")}
    >
      {/* Title */}
      <p className="text-sm font-medium leading-snug line-clamp-2 pr-8">{deal.title}</p>

      {/* Meta */}
      <div className="mt-2.5 flex flex-col gap-1">
        {deal.contact && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User size={11} />
            <span className="truncate">{deal.contact.name}</span>
          </div>
        )}
        {deal.value != null && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <DollarSign size={11} />
            <span>{formatCurrency(deal.value)}</span>
          </div>
        )}
        {deal.expected_close_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays size={11} />
            <span>{formatDate(deal.expected_close_date)}</span>
          </div>
        )}
      </div>

      {/* Actions (appear on hover, not during drag) */}
      {!isDragOverlay && (canEdit || canDelete) && (
        <div
          className="absolute right-2 top-2 hidden gap-0.5 group-hover:flex"
          onClick={e => e.stopPropagation()}
        >
          {canEdit && (
            <>
              <ActionBtn
                title="Marcar como Ganho"
                onClick={() => handleClose("won")}
                className="text-emerald-600 hover:bg-emerald-500/10"
              >
                <Trophy size={12} />
              </ActionBtn>
              <ActionBtn
                title="Marcar como Perdido"
                onClick={() => handleClose("lost")}
                className="text-rose-500 hover:bg-rose-500/10"
              >
                <ThumbsDown size={12} />
              </ActionBtn>
            </>
          )}
          {canDelete && (
            <ActionBtn
              title="Arquivar"
              onClick={handleArchive}
              className="text-muted-foreground hover:bg-muted"
            >
              <Archive size={12} />
            </ActionBtn>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  children, title, onClick, className,
}: { children: React.ReactNode; title: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={[
        "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
