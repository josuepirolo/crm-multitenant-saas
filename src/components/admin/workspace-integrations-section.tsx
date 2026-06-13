"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Plus, X, Pencil, Check, Smartphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { IntegrationStatus } from "@/types";
import { useWorkspaceIntegrationsViewModel } from "@/viewmodels/useWorkspaceIntegrationsViewModel";

const STATUS_LABELS: Record<IntegrationStatus, string> = {
  active: "Ativa",
  pending: "Pendente",
  inactive: "Inativa",
};

const STATUS_STYLES: Record<IntegrationStatus, string> = {
  active:   "bg-primary/10 text-primary ring-primary/20",
  pending:  "bg-warning/10 text-warning ring-warning/20",
  inactive: "bg-muted text-muted-foreground ring-border",
};

const STATUS_OPTIONS: IntegrationStatus[] = ["pending", "active", "inactive"];

interface WorkspaceIntegrationsSectionProps {
  workspaceId: string;
}

export function WorkspaceIntegrationsSection({ workspaceId }: WorkspaceIntegrationsSectionProps) {
  const [open, setOpen] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editStatus, setEditStatus] = useState<IntegrationStatus>("pending");
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);

  const [formTenantId, setFormTenantId] = useState("");
  const [formProviderId, setFormProviderId] = useState("");
  const [formLabel, setFormLabel] = useState("");
  const [formStatus, setFormStatus] = useState<IntegrationStatus>("pending");

  const vm = useWorkspaceIntegrationsViewModel(workspaceId);

  useEffect(() => {
    if (open && !vm.loaded && !vm.loading) vm.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vm.loaded, vm.loading]);

  function startEdit(id: string, label: string | null, status: IntegrationStatus) {
    setEditingId(id);
    setEditLabel(label ?? "");
    setEditStatus(status);
  }

  async function saveEdit(id: string) {
    await vm.updateIntegration(id, { label: editLabel, status: editStatus });
    setEditingId(null);
  }

  async function handleRemove(id: string) {
    await vm.unlinkWaTenant(id);
    setConfirmingRemoveId(null);
  }

  async function handleLinkSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!formTenantId || !formProviderId) return;

    const fd = new FormData();
    fd.append("wa_tenant_id", formTenantId);
    fd.append("provider_id", formProviderId);
    fd.append("integration_type", "whatsapp");
    fd.append("label", formLabel);
    fd.append("status", formStatus);

    const ok = await vm.linkWaTenant(fd);
    if (ok) {
      setShowLinkForm(false);
      setFormTenantId("");
      setFormProviderId("");
      setFormLabel("");
      setFormStatus("pending");
    }
  }

  function providerName(id: string | null) {
    return vm.providers.find((p) => p.id === id)?.name ?? id ?? "—";
  }

  return (
    <div className="border-t border-border/50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Integrações WhatsApp</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="px-5 pb-4 space-y-3">
          {vm.loading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border/50 p-3">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : vm.integrations.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma instância WhatsApp vinculada.</p>
          ) : (
            <div className="space-y-2">
              {vm.integrations.map((integration) => (
                <div key={integration.id} className="rounded-xl border border-border/50 p-3 space-y-2">
                  {editingId === integration.id ? (
                    <div className="space-y-2">
                      <input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="Nome da instância (ex.: Vendas SP)"
                        maxLength={60}
                        className="w-full h-7 rounded-lg border border-border/60 bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <Select value={editStatus} onValueChange={(v) => setEditStatus(v as IntegrationStatus)}>
                        <SelectTrigger size="sm" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(integration.id)}
                          className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                          <Check size={11} />
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 h-7 rounded-lg border border-border/60 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Smartphone size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {integration.label || integration.wa_tenant_display_name || integration.wa_tenant_name || "Sem nome"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {providerName(integration.provider_id)} · {integration.wa_instance_count} instância{integration.wa_instance_count === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge className={STATUS_STYLES[integration.status]}>
                            {STATUS_LABELS[integration.status]}
                          </Badge>
                          <button
                            onClick={() => startEdit(integration.id, integration.label, integration.status)}
                            className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          >
                            <Pencil size={11} />
                          </button>
                        </div>
                      </div>

                      {confirmingRemoveId === integration.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground flex-1">Remover este vínculo?</span>
                          <button
                            onClick={() => handleRemove(integration.id)}
                            className="h-6 px-2 rounded-md bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
                          >
                            Remover
                          </button>
                          <button
                            onClick={() => setConfirmingRemoveId(null)}
                            className="h-6 px-2 rounded-md border border-border/60 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmingRemoveId(integration.id)}
                          className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
                        >
                          <X size={11} />
                          Remover vínculo
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {!vm.loading && (
            !showLinkForm ? (
              vm.loaded && vm.availableTenants.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma instância disponível para vincular.</p>
              ) : (
                <button
                  onClick={() => setShowLinkForm(true)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus size={11} />
                  Vincular instância
                </button>
              )
            ) : (
              <form onSubmit={handleLinkSubmit} className="space-y-2 rounded-xl border border-border/50 p-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Instância WA</label>
                  <Select value={formTenantId} onValueChange={(v) => setFormTenantId(v ?? "")}>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.availableTenants.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {(t.display_name || t.name)} ({t.slug})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Provider</label>
                  <Select value={formProviderId} onValueChange={(v) => setFormProviderId(v ?? "")}>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Nome da instância (opcional)</label>
                  <input
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="Ex.: Vendas SP"
                    maxLength={60}
                    className="w-full h-7 rounded-lg border border-border/60 bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select value={formStatus} onValueChange={(v) => setFormStatus(v as IntegrationStatus)}>
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={vm.linking || !formTenantId || !formProviderId}
                    className="flex-1 flex items-center justify-center gap-1.5 h-7 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {vm.linking ? "Vinculando..." : "Vincular"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLinkForm(false)}
                    className="flex-1 h-7 rounded-lg border border-border/60 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )
          )}
        </div>
      )}
    </div>
  );
}
