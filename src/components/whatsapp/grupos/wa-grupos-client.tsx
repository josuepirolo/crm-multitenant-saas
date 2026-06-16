"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, RefreshCw, MessageSquare } from "lucide-react";
import { WaInstanceSelector } from "@/components/whatsapp/wa-instance-selector";
import { WaCreateGroupDialog } from "./wa-create-group-dialog";
import { useWaGruposViewModel } from "@/viewmodels/useWaGruposViewModel";
import type { WaInstanceWithTenant } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WaGruposClientProps {
  instances: WaInstanceWithTenant[];
}

export function WaGruposClient({ instances }: WaGruposClientProps) {
  const vm = useWaGruposViewModel(instances);
  const [createOpen, setCreateOpen] = useState(false);

  // Auto-load quando instância já selecionada (caso de instância única)
  useEffect(() => {
    if (vm.selectedInstance && vm.state.status === "idle") {
      vm.load();
    }
  }, [vm.selectedInstance]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!instances.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card px-6 py-14 text-center">
        <MessageSquare size={28} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nenhuma integração WhatsApp configurada neste workspace.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho + seletor de instância */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <WaInstanceSelector
          instances={instances}
          selected={vm.selectedInstance}
          onSelect={vm.handleSelectInstance}
          disabled={vm.isPending}
        />
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={vm.load} disabled={vm.isPending || !vm.selectedInstance}>
            <RefreshCw size={14} className={vm.isPending ? "animate-spin" : ""} />
            <span className="ml-1.5 hidden sm:inline">Atualizar</span>
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            disabled={!vm.selectedInstance || vm.isPending}
          >
            <Plus size={14} className="mr-1.5" />
            Novo grupo
          </Button>
        </div>
      </div>

      {/* Prompt de seleção */}
      {!vm.selectedInstance && (
        <p className="text-sm text-muted-foreground">Selecione uma instância para ver os grupos.</p>
      )}

      {/* Skeleton */}
      {vm.state.status === "loading" && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Erro */}
      {vm.state.status === "error" && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {vm.state.message}
        </div>
      )}

      {/* Lista vazia */}
      {vm.state.status === "loaded" && vm.state.groups.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card px-6 py-14 text-center">
          <Users size={28} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum grupo encontrado nesta instância.</p>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} className="mr-1.5" />
            Criar primeiro grupo
          </Button>
        </div>
      )}

      {/* Lista de grupos */}
      {vm.state.status === "loaded" && vm.state.groups.length > 0 && (
        <div className="flex flex-col gap-2">
          {vm.state.groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-accent/40 transition-colors"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users size={16} />
              </div>
              <div className="flex flex-1 min-w-0 flex-col">
                <span className="text-sm font-medium truncate">
                  {group.group_name ?? group.contact.display_name}
                </span>
                {group.last_message_preview && (
                  <span className="text-xs text-muted-foreground truncate">{group.last_message_preview}</span>
                )}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {group.last_message_at && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(group.last_message_at), { locale: ptBR, addSuffix: true })}
                  </span>
                )}
                {group.unread_count > 0 && (
                  <Badge className="h-5 px-1.5 text-xs">{group.unread_count}</Badge>
                )}
                {group.status !== "open" && (
                  <Badge variant="outline" className="text-[10px]">{group.status}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <WaCreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={vm.handleCreateGroup}
      />
    </div>
  );
}
