"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { listActiveNiches, updateWorkspaceNiche } from "@/app/(dashboard)/settings/niche-actions";
import type { BusinessNiche, Workspace } from "@/types";

interface Props {
  workspace: Workspace;
  canEdit: boolean;
  onUpdated: (w: Workspace) => void;
}

// listActiveNiches() retorna árvore — precisamos de lista plana para filtrar por parent_id
function flattenTree(nodes: BusinessNiche[]): BusinessNiche[] {
  return nodes.flatMap((n) => [n, ...flattenTree(n.children ?? [])]);
}

const LEVEL_LABELS = ["Categoria principal", "Subcategoria", "Segmento final"];
const LEVEL_HINTS = [
  "Área de negócio — ex: Automotivo, Moda, Varejo",
  "Especialização — ex: Moda Feminina, Auto Peças",
  "Segmento específico — ex: Roupas Plus Size",
];
const LEVEL_PLACEHOLDERS = [
  "Selecione a categoria...",
  "Selecione a subcategoria...",
  "Selecione o segmento...",
];

export function WorkspaceNicheForm({ workspace, canEdit, onUpdated }: Props) {
  const [flat, setFlat] = useState<BusinessNiche[]>([]);
  const [loadingNiches, setLoadingNiches] = useState(true);
  const [isPending, startTransition] = useTransition();
  // Caminho de seleção — selectedPath[0] = nível 1, [1] = nível 2, [2] = nível 3
  const [selectedPath, setSelectedPath] = useState<string[]>([]);

  useEffect(() => {
    listActiveNiches().then(({ data }) => {
      const flattened = flattenTree(data as BusinessNiche[]);
      setFlat(flattened);
      setLoadingNiches(false);

      if (workspace.business_niche_id) {
        // Reconstrói o caminho de seleção partindo do nó salvo subindo até a raiz
        const path: string[] = [];
        let node = flattened.find((n) => n.id === workspace.business_niche_id);
        while (node) {
          path.unshift(node.id);
          node = node.parent_id ? flattened.find((n) => n.id === node!.parent_id) : undefined;
        }
        setSelectedPath(path);
      }
    });
  }, [workspace.business_niche_id]);

  // Nivveis: raiz → filhos do selecionado → filhos do filho
  const levels: BusinessNiche[][] = [];
  levels.push(flat.filter((n) => !n.parent_id));
  for (let i = 0; i < selectedPath.length; i++) {
    const kids = flat.filter((n) => n.parent_id === selectedPath[i]);
    if (kids.length > 0) levels.push(kids);
    else break;
  }

  function handleLevelChange(levelIdx: number, id: string) {
    setSelectedPath((prev) => {
      const next = prev.slice(0, levelIdx);
      next.push(id);
      return next;
    });
  }

  // O nó efetivo a salvar é o último selecionado no caminho
  const effectiveId = selectedPath[selectedPath.length - 1] ?? "";
  const effectiveName = flat.find((n) => n.id === effectiveId)?.name ?? "";
  const isDirty = effectiveId !== (workspace.business_niche_id ?? "");

  function handleSave() {
    if (!effectiveId) return;
    startTransition(async () => {
      const promise = updateWorkspaceNiche(effectiveId).then((r) => {
        if (r.error) throw new Error(r.error);
        return r;
      });
      toast.promise(promise, {
        loading: "Salvando...",
        success: "Segmento atualizado!",
        error: (err: Error) => err.message,
      });
      try {
        await promise;
        onUpdated({ ...workspace, business_niche_id: effectiveId });
      } catch { /* handled by toast */ }
    });
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold">Segmento de negócio</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Define a área de atuação da empresa e personaliza o CRM
        </p>
      </div>

      {loadingNiches ? (
        <div className="space-y-3 max-w-md">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4 max-w-md">
          {levels.map((options, levelIdx) => {
            const selectedId = selectedPath[levelIdx] ?? "";
            const selectedName = flat.find((n) => n.id === selectedId)?.name;
            const groupLabel = levelIdx > 0
              ? flat.find((n) => n.id === selectedPath[levelIdx - 1])?.name
              : undefined;

            return (
              <div key={levelIdx} className="space-y-1.5">
                <Label>{LEVEL_LABELS[levelIdx] ?? `Nível ${levelIdx + 1}`}</Label>
                <p className="text-xs text-muted-foreground">
                  {LEVEL_HINTS[levelIdx] ?? ""}
                </p>
                <Select
                  value={selectedId}
                  onValueChange={(v) => handleLevelChange(levelIdx, v ?? "")}
                  disabled={!canEdit}
                >
                  <SelectTrigger className="h-10 rounded-xl border-border/60">
                    <SelectValue>
                      {selectedName ?? (
                        <span className="text-muted-foreground">
                          {LEVEL_PLACEHOLDERS[levelIdx] ?? "Selecione..."}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {groupLabel ? (
                      <SelectGroup>
                        <SelectLabel className="text-xs text-muted-foreground">
                          {groupLabel}
                        </SelectLabel>
                        {options.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ) : (
                      options.map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            );
          })}

          {/* Breadcrumb do segmento salvo */}
          {effectiveId && (
            <div className="rounded-xl bg-muted/50 border border-border/50 px-4 py-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Segmento selecionado
              </p>
              <p className="text-sm font-semibold">
                {selectedPath
                  .map((id) => flat.find((n) => n.id === id)?.name)
                  .filter(Boolean)
                  .join(" › ")}
              </p>
              <p className="text-xs text-muted-foreground">
                O segmento final salvo será: <strong>{effectiveName}</strong>
              </p>
            </div>
          )}

          {canEdit && (
            <Button
              onClick={handleSave}
              disabled={!effectiveId || !isDirty || isPending}
              className="rounded-xl"
            >
              {isPending ? "Salvando..." : "Salvar segmento"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
