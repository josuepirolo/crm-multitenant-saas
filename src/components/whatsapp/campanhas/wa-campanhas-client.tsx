"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Plus, RefreshCw, Play, Pause, RotateCcw, X } from "lucide-react";
import { WaInstanceSelector } from "@/components/whatsapp/wa-instance-selector";
import { WaCreateCampaignDialog } from "./wa-create-campaign-dialog";
import { useWaCampanhasViewModel } from "@/viewmodels/useWaCampanhasViewModel";
import type { WaCampaign, WaInstanceWithTenant } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WaCampanhasClientProps {
  instances: WaInstanceWithTenant[];
}

const STATUS_CONFIG: Record<
  WaCampaign["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft:     { label: "Rascunho",  variant: "secondary" },
  scheduled: { label: "Agendada",  variant: "outline" },
  sending:   { label: "Enviando",  variant: "default" },
  paused:    { label: "Pausada",   variant: "outline" },
  completed: { label: "Concluída", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  failed:    { label: "Com falha", variant: "destructive" },
};

export function WaCampanhasClient({ instances }: WaCampanhasClientProps) {
  const vm = useWaCampanhasViewModel(instances);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    if (vm.selectedInstance && vm.state.status === "idle") {
      vm.load();
    }
  }, [vm.selectedInstance]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!instances.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card px-6 py-14 text-center">
        <Megaphone size={28} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhuma integração WhatsApp configurada neste workspace.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WaInstanceSelector
          instances={instances}
          selected={vm.selectedInstance}
          onSelect={vm.handleSelectInstance}
          disabled={vm.isPending}
        />
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={vm.load}
            disabled={vm.isPending || !vm.selectedInstance}
          >
            <RefreshCw size={14} className={vm.isPending ? "animate-spin" : ""} />
            <span className="ml-1.5 hidden sm:inline">Atualizar</span>
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!vm.selectedInstance || vm.isPending}>
            <Plus size={14} className="mr-1.5" />
            Nova campanha
          </Button>
        </div>
      </div>

      {!vm.selectedInstance && (
        <p className="text-sm text-muted-foreground">Selecione uma instância para ver as campanhas.</p>
      )}

      {vm.state.status === "loading" && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {vm.state.status === "error" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {vm.state.message}
        </div>
      )}

      {vm.state.status === "loaded" && vm.state.items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card px-6 py-14 text-center">
          <Megaphone size={28} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma campanha encontrada.</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} className="mr-1.5" />
            Criar primeira campanha
          </Button>
        </div>
      )}

      {vm.state.status === "loaded" && vm.state.items.length > 0 && (
        <div className="flex flex-col gap-2">
          {vm.state.items.map((c) => (
            <CampaignRow
              key={c.campaign_id}
              campaign={c}
              onLifecycle={(action) => vm.handleLifecycle(c.campaign_id, action)}
            />
          ))}
          {vm.state.total > vm.state.items.length && (
            <p className="pt-1 text-center text-xs text-muted-foreground">
              Mostrando {vm.state.items.length} de {vm.state.total}
            </p>
          )}
        </div>
      )}

      <WaCreateCampaignDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={vm.handleCreateCampaign}
      />
    </div>
  );
}

type LifecycleAction = "launch" | "pause" | "resume" | "cancel";

function CampaignRow({
  campaign: c,
  onLifecycle,
}: {
  campaign: WaCampaign;
  onLifecycle: (a: LifecycleAction) => void;
}) {
  const cfg = STATUS_CONFIG[c.status] ?? { label: c.status, variant: "secondary" as const };
  const progress =
    c.recipient_count > 0 && c.sent_count !== undefined
      ? Math.round((c.sent_count / c.recipient_count) * 100)
      : null;

  const canLaunch  = c.status === "draft" || c.status === "scheduled";
  const canPause   = c.status === "sending";
  const canResume  = c.status === "paused";
  const canCancel  = canLaunch || canPause || canResume;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Megaphone size={16} />
      </div>

      <div className="flex flex-1 min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{c.name}</span>
          <Badge variant={cfg.variant} className="h-4 px-1.5 text-[10px]">
            {cfg.label}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span>{c.type}</span>
          <span>{c.recipient_count} destinatário(s)</span>
          {c.sent_count !== undefined && <span>{c.sent_count} enviado(s)</span>}
          {c.failed_count !== undefined && c.failed_count > 0 && (
            <span className="text-destructive">{c.failed_count} falha(s)</span>
          )}
          {c.created_at && (
            <span>
              {formatDistanceToNow(new Date(c.created_at), { locale: ptBR, addSuffix: true })}
            </span>
          )}
        </div>
        {progress !== null && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Ações de ciclo de vida como botões inline */}
      <div className="flex shrink-0 items-center gap-1">
        {canLaunch && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Disparar campanha"
            onClick={() => onLifecycle("launch")}
          >
            <Play size={13} />
          </Button>
        )}
        {canPause && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Pausar campanha"
            onClick={() => onLifecycle("pause")}
          >
            <Pause size={13} />
          </Button>
        )}
        {canResume && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Retomar campanha"
            onClick={() => onLifecycle("resume")}
          >
            <RotateCcw size={13} />
          </Button>
        )}
        {canCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            title="Cancelar campanha"
            onClick={() => onLifecycle("cancel")}
          >
            <X size={13} />
          </Button>
        )}
      </div>
    </div>
  );
}
