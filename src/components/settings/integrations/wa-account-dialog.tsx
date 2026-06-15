"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { X, RefreshCw, UserCircle, ShieldCheck } from "lucide-react";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { appleEase } from "@/components/ui/motion";
import { useWaAccountViewModel } from "@/viewmodels/useWaAccountViewModel";
import type { WaInstanceWithTenant, WaPrivacyControl } from "@/types";

const VIS_LABEL: Record<string, string> = {
  ALL: "Todos",
  NONE: "Ninguém",
  CONTACT_BLACKLIST: "Exceto alguns contatos",
};
const RR_LABEL: Record<string, string> = { enable: "Ativado", disable: "Desativado" };
const DUR_LABEL: Record<string, string> = {
  days90: "90 dias",
  days7: "7 dias",
  hours24: "24 horas",
  disable: "Desativado",
};

function visText(c: WaPrivacyControl | undefined): string {
  if (!c) return "—";
  const v = c.visualizationType ?? c.type;
  return v ? VIS_LABEL[v] ?? v : "—";
}

interface WaAccountDialogProps {
  instance: WaInstanceWithTenant;
  canManage: boolean;
  onClose: () => void;
}

export function WaAccountDialog({ instance, canManage, onClose }: WaAccountDialogProps) {
  const vm = useWaAccountViewModel(instance);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (vm.profile) {
      setName(vm.profile.name ?? "");
      setDescription(vm.profile.description ?? "");
    }
  }, [vm.profile]);

  const title = instance.integration_label || instance.name || "Conta WhatsApp";
  const nameDirty = vm.profile != null && name.trim() !== (vm.profile.name ?? "").trim();
  const descDirty = vm.profile != null && description.trim() !== (vm.profile.description ?? "").trim();

  const dialog = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <ModalOverlay onClick={onClose} />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Perfil e privacidade — ${title}`}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.3, ease: appleEase }}
          className="relative z-50 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border/50 p-5">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold tracking-tight">Perfil &amp; Privacidade</h3>
              <p className="truncate text-sm text-muted-foreground">{title}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          <div className="overflow-y-auto p-5">
            {vm.loading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            ) : vm.error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                <p className="text-sm text-destructive">{vm.error}</p>
                <button
                  onClick={vm.reload}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-destructive transition-colors hover:text-destructive/80"
                >
                  <RefreshCw size={12} />
                  Tentar novamente
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Perfil */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <UserCircle size={16} className="text-muted-foreground" />
                    Perfil do número
                  </div>

                  {vm.profile?.picture_url && (
                    <div className="flex justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={vm.profile.picture_url}
                        alt="Foto do perfil"
                        className="h-20 w-20 rounded-full border border-border/60 object-cover"
                      />
                    </div>
                  )}

                  <Field label="Nome">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!canManage}
                      maxLength={100}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                    />
                    {canManage && nameDirty && (
                      <SaveButton onClick={() => vm.saveProfileField("name", name.trim())} />
                    )}
                  </Field>

                  <Field label="Descrição">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={!canManage}
                      rows={3}
                      maxLength={500}
                      className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                    />
                    {canManage && descDirty && (
                      <SaveButton onClick={() => vm.saveProfileField("description", description.trim())} />
                    )}
                  </Field>
                </section>

                {/* Privacidade (somente leitura nesta versão) */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck size={16} className="text-muted-foreground" />
                    Privacidade
                  </div>
                  {vm.privacy ? (
                    <dl className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/50">
                      <Row label="Visto por último" value={visText(vm.privacy.last_seen)} />
                      <Row label="Foto do perfil" value={visText(vm.privacy.photo)} />
                      <Row label="Recados (descrição)" value={visText(vm.privacy.description)} />
                      <Row label="Online" value={visText(vm.privacy.online)} />
                      <Row label="Adicionar a grupos" value={visText(vm.privacy.group_add)} />
                      <Row label="Confirmações de leitura" value={RR_LABEL[vm.privacy.read_receipts] ?? vm.privacy.read_receipts} />
                      <Row label="Mensagens temporárias" value={DUR_LABEL[vm.privacy.messages_duration] ?? vm.privacy.messages_duration} />
                    </dl>
                  ) : (
                    <p className="text-xs text-muted-foreground">Configurações de privacidade indisponíveis.</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    A edição de privacidade será habilitada em breve.
                  </p>
                </section>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(dialog, document.body);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SaveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-1.5 inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
    >
      Salvar
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}
