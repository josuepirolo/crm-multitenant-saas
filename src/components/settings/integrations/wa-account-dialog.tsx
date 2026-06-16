"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { X, RefreshCw, UserCircle, ShieldCheck, Upload, Link2, Info } from "lucide-react";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Skeleton } from "@/components/ui/skeleton";
import { appleEase } from "@/components/ui/motion";
import { useWaAccountViewModel } from "@/viewmodels/useWaAccountViewModel";
import { WaPrivacySection } from "./wa-privacy-section";
import type { WaInstanceWithTenant } from "@/types";

interface WaAccountDialogProps {
  instance: WaInstanceWithTenant;
  canManage: boolean;
  onClose: () => void;
}

export function WaAccountDialog({ instance, canManage, onClose }: WaAccountDialogProps) {
  const vm = useWaAccountViewModel(instance);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pictureUrl, setPictureUrl] = useState("");
  const [showUrl, setShowUrl] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (vm.profile) {
      setName(vm.profile.name ?? "");
      setDescription(vm.profile.description ?? "");
    }
  }, [vm.profile]);

  const title = instance.integration_label || instance.name || "Conta WhatsApp";
  const nameDirty = vm.profile != null && name.trim() !== (vm.profile.name ?? "").trim();
  const descDirty = vm.profile != null && description.trim() !== (vm.profile.description ?? "").trim();

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) vm.uploadPicture(file);
    e.target.value = "";
  }

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
                {!vm.profile?.synced_at && !vm.privacy?.synced_at && (
                  <div className="flex items-start gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2.5">
                    <Info size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      O WhatsApp (Z-API) não permite ler o perfil/privacidade já configurados no número.
                      Aqui aparece apenas o que for definido por este painel — defina os valores para configurá-los.
                    </p>
                  </div>
                )}

                {/* Perfil */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <UserCircle size={16} className="text-muted-foreground" />
                    Perfil do número
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="h-20 w-20 overflow-hidden rounded-full border border-border/60 bg-muted/50">
                      {vm.profile?.picture_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={vm.profile.picture_url} alt="Foto do perfil" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <UserCircle size={32} />
                        </div>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-2">
                        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickFile} />
                        <button
                          onClick={() => fileRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                        >
                          <Upload size={12} />
                          Enviar foto
                        </button>
                        <button
                          onClick={() => setShowUrl((v) => !v)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Link2 size={12} />
                          URL
                        </button>
                      </div>
                    )}
                    {canManage && showUrl && (
                      <div className="flex w-full gap-2">
                        <input
                          value={pictureUrl}
                          onChange={(e) => setPictureUrl(e.target.value)}
                          placeholder="https://…/foto.jpg"
                          className="h-8 flex-1 rounded-lg border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          onClick={() => pictureUrl.trim() && vm.savePictureUrl(pictureUrl.trim()).then((ok) => ok && setShowUrl(false))}
                          disabled={!pictureUrl.trim()}
                          className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                        >
                          Aplicar
                        </button>
                      </div>
                    )}
                  </div>

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

                {/* Privacidade */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldCheck size={16} className="text-muted-foreground" />
                    Privacidade
                  </div>
                  {vm.privacy ? (
                    <WaPrivacySection
                      privacy={vm.privacy}
                      canManage={canManage}
                      onSaveVisibility={vm.saveVisibility}
                      onSaveGroupAdd={vm.saveGroupAdd}
                      onSaveReadReceipts={vm.saveReadReceipts}
                      onSaveMessagesDuration={vm.saveMessagesDuration}
                      loadDisallowed={vm.loadDisallowed}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">Configurações de privacidade indisponíveis.</p>
                  )}
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
