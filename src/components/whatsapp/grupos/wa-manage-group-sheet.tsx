"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { appleEase } from "@/components/ui/motion";
import { X, Users, Pencil, FileText, UserPlus, UserMinus, ShieldCheck } from "lucide-react";
import type { WaConversation, WaGroupMetadata } from "@/types";

interface WaManageGroupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: WaConversation;
  onGetMetadata: (groupId: string) => Promise<WaGroupMetadata | null>;
  onRename: (groupId: string, name: string) => Promise<boolean>;
  onUpdateDescription: (groupId: string, desc: string) => Promise<boolean>;
  onAddParticipants: (groupId: string, phones: string[]) => Promise<boolean>;
  onRemoveParticipant: (groupId: string, phone: string) => Promise<boolean>;
}

function parsePhones(raw: string): string[] {
  return raw
    .split(/[\n,;]/)
    .map((p) => p.trim().replace(/\D/g, ""))
    .filter((p) => p.length >= 10 && p.length <= 15);
}

type Participant = { phone: string; isAdmin: boolean };

function extractParticipants(result: Record<string, unknown>): Participant[] {
  const raw = result?.participants;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is Participant => typeof p === "object" && p !== null && typeof (p as Participant).phone === "string"
  );
}

export function WaManageGroupSheet({
  open,
  onOpenChange,
  group,
  onGetMetadata,
  onRename,
  onUpdateDescription,
  onAddParticipants,
  onRemoveParticipant,
}: WaManageGroupSheetProps) {
  const groupId = group.group_provider_id ?? "";
  const displayName = group.group_name ?? group.contact.display_name;

  const [name, setName] = useState(displayName);
  const [desc, setDesc] = useState("");
  const [addPhonesRaw, setAddPhonesRaw] = useState("");
  const [removePhone, setRemovePhone] = useState("");

  const [savingName, setSavingName] = useState(false);
  const [savingDesc, setSavingDesc] = useState(false);
  const [addingPart, setAddingPart] = useState(false);
  const [removingPart, setRemovingPart] = useState(false);

  const [metadata, setMetadata] = useState<WaGroupMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);

  // Carrega metadata ao abrir e reseta estado ao fechar
  useEffect(() => {
    if (!open || !groupId) {
      setMetadata(null);
      setMetadataLoading(false);
      setName(displayName);
      setDesc("");
      return;
    }
    setMetadataLoading(true);
    onGetMetadata(groupId).then((m) => {
      setMetadata(m);
      setMetadataLoading(false);
    });
  }, [open, groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pré-preenche campos editáveis quando metadata chega
  useEffect(() => {
    if (!metadata) return;
    setName((metadata.result?.name as string | undefined) ?? displayName);
    setDesc((metadata.result?.description as string | undefined) ?? "");
  }, [metadata]); // eslint-disable-line react-hooks/exhaustive-deps

  const participants = metadata ? extractParticipants(metadata.result) : [];

  const parsedAddPhones = parsePhones(addPhonesRaw);
  const parsedRemovePhone = removePhone.trim().replace(/\D/g, "");

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !groupId) return;
    setSavingName(true);
    await onRename(groupId, name.trim());
    setSavingName(false);
  }

  async function handleDesc(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) return;
    setSavingDesc(true);
    await onUpdateDescription(groupId, desc);
    setSavingDesc(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!parsedAddPhones.length || !groupId) return;
    setAddingPart(true);
    const ok = await onAddParticipants(groupId, parsedAddPhones);
    if (ok) setAddPhonesRaw("");
    setAddingPart(false);
  }

  async function handleRemove(e: React.FormEvent) {
    e.preventDefault();
    if (parsedRemovePhone.length < 10 || !groupId) return;
    setRemovingPart(true);
    const ok = await onRemoveParticipant(groupId, parsedRemovePhone);
    if (ok) setRemovePhone("");
    setRemovingPart(false);
  }

  if (typeof document === "undefined") return null;
  if (!groupId) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-end">
          <ModalOverlay onClick={() => onOpenChange(false)} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Gerenciar grupo"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.25, ease: appleEase }}
            className="relative z-50 flex h-full w-full max-w-sm flex-col border-l border-border/60 bg-card shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-4 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Users size={15} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold truncate">Gerenciar grupo</h2>
                  <p className="text-xs text-muted-foreground truncate">{displayName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scroll body */}
            <div className="flex flex-col gap-5 overflow-y-auto p-5">

              {/* Renomear */}
              <section>
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Pencil size={12} />
                  Renomear
                </div>
                <form onSubmit={handleRename} className="flex flex-col gap-2">
                  <Label htmlFor="mg-name" className="sr-only">Nome do grupo</Label>
                  <Input
                    id="mg-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    placeholder="Nome do grupo"
                    disabled={savingName || metadataLoading}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingName || metadataLoading || !name.trim() || name.trim() === displayName}
                  >
                    {savingName ? "Salvando…" : "Salvar nome"}
                  </Button>
                </form>
              </section>

              <div className="border-t border-border/40" />

              {/* Descrição */}
              <section>
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <FileText size={12} />
                  Descrição
                </div>
                {metadataLoading ? (
                  <Skeleton className="h-20 w-full rounded-xl" />
                ) : (
                  <form onSubmit={handleDesc} className="flex flex-col gap-2">
                    <textarea
                      value={desc}
                      onChange={(e) => setDesc(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Descrição do grupo (opcional)"
                      disabled={savingDesc}
                      className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                    />
                    <Button type="submit" size="sm" disabled={savingDesc}>
                      {savingDesc ? "Salvando…" : "Salvar descrição"}
                    </Button>
                  </form>
                )}
              </section>

              <div className="border-t border-border/40" />

              {/* Participantes atuais */}
              <section>
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <Users size={12} />
                  Participantes
                  {!metadataLoading && participants.length > 0 && (
                    <span className="ml-auto font-normal normal-case tracking-normal">
                      {participants.length}
                    </span>
                  )}
                </div>
                {metadataLoading ? (
                  <div className="flex flex-col gap-1.5">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-8 w-full rounded-lg" />
                    ))}
                  </div>
                ) : participants.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum participante carregado.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {participants.map((p) => (
                      <li
                        key={p.phone}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-accent/40"
                      >
                        <span className="font-mono text-xs text-foreground">{p.phone}</span>
                        {p.isAdmin && (
                          <span className="flex items-center gap-1 text-[10px] text-primary">
                            <ShieldCheck size={11} />
                            Admin
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="border-t border-border/40" />

              {/* Adicionar participantes */}
              <section>
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <UserPlus size={12} />
                  Adicionar participantes
                </div>
                <form onSubmit={handleAdd} className="flex flex-col gap-2">
                  <textarea
                    value={addPhonesRaw}
                    onChange={(e) => setAddPhonesRaw(e.target.value)}
                    rows={3}
                    placeholder={"5544999990000\n5511888880000"}
                    disabled={addingPart}
                    className="w-full resize-none rounded-xl border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  />
                  {parsedAddPhones.length > 0 && (
                    <p className="text-xs text-muted-foreground">{parsedAddPhones.length} número(s) válido(s)</p>
                  )}
                  <Button
                    type="submit"
                    size="sm"
                    disabled={addingPart || parsedAddPhones.length === 0}
                  >
                    <UserPlus size={13} className="mr-1.5" />
                    {addingPart ? "Adicionando…" : "Adicionar"}
                  </Button>
                </form>
              </section>

              <div className="border-t border-border/40" />

              {/* Remover participante */}
              <section>
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <UserMinus size={12} />
                  Remover participante
                </div>
                <form onSubmit={handleRemove} className="flex flex-col gap-2">
                  <Input
                    value={removePhone}
                    onChange={(e) => setRemovePhone(e.target.value)}
                    placeholder="5544999990000"
                    disabled={removingPart}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={removingPart || parsedRemovePhone.length < 10}
                  >
                    <UserMinus size={13} className="mr-1.5" />
                    {removingPart ? "Removendo…" : "Remover"}
                  </Button>
                </form>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
