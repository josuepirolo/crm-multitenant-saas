"use client";

import { Kanban, Plus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface KanbanEmptyStateProps {
  isAdmin: boolean;
  onCreatePipeline: () => Promise<void>;
}

export function KanbanEmptyState({ isAdmin, onCreatePipeline }: KanbanEmptyStateProps) {
  async function handleCreate() {
    toast.promise(onCreatePipeline(), {
      loading: "Criando funil...",
      success: "Funil criado com sucesso!",
      error: (err) => err?.message ?? "Erro ao criar funil.",
    });
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Kanban className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h2 className="text-lg font-semibold">Configure seu funil de vendas</h2>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Crie o funil padrão com etapas de Qualificação, Proposta e Fechamento para começar a gerenciar negociações."
            : "Aguardando configuração do funil pelo administrador."}
        </p>
      </div>
      {isAdmin ? (
        <Button onClick={handleCreate} className="rounded-xl gap-1.5">
          <Plus size={15} />
          Criar Funil
        </Button>
      ) : (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Lock size={14} />
          Apenas administradores podem criar o funil
        </div>
      )}
    </div>
  );
}
