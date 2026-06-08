"use client";

import { useState } from "react";
import { Tag, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { appleEase } from "@/components/ui/motion";
import { cn } from "@/lib/utils";
import type { ContactSource } from "@/types";

interface ContactSourcesSheetProps {
  open: boolean;
  sources: ContactSource[];
  loading: boolean;
  creating: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onToggleActive: (id: string, isActive: boolean) => Promise<void>;
}

function SourceToggle({ active, onChange }: { active: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={() => onChange(!active)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
        active ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-block h-4.5 w-4.5 transform rounded-full bg-background shadow-sm transition-transform duration-200",
          active ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

export function ContactSourcesSheet({
  open, sources, loading, creating, onClose, onCreate, onRename, onToggleActive,
}: ContactSourcesSheetProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  async function handleCreate() {
    const name = newName.trim();
    if (name.length < 2) return;
    await onCreate(name);
    setNewName("");
  }

  function startEdit(source: ContactSource) {
    setEditingId(source.id);
    setEditingName(source.name);
  }

  async function commitEdit(source: ContactSource) {
    const name = editingName.trim();
    setEditingId(null);
    if (name.length >= 2 && name !== source.name) {
      await onRename(source.id, name);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <ModalOverlay onClick={onClose} />
          <motion.div
            key="sources-sheet"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.3, ease: appleEase }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-border/50 bg-card shadow-2xl shadow-black/20 flex flex-col"
          >
            <div className="flex items-start justify-between p-6 pb-4 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Tag size={16} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Gerenciar origens</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Canais de captação dos contatos</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-6 p-6 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Nova origem
                </p>
                <div className="flex gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
                    placeholder="Ex: Instagram, Loja Física..."
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCreate}
                    disabled={newName.trim().length < 2 || creating}
                    size="icon"
                    className="shrink-0"
                  >
                    <Plus size={15} />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Origens cadastradas
                </p>

                {loading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-11 rounded-xl bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : sources.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhuma origem cadastrada ainda. Crie a primeira acima.
                  </p>
                ) : (
                  sources.map((source) => (
                    <div
                      key={source.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-muted/40"
                    >
                      {editingId === source.id ? (
                        <Input
                          autoFocus
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => commitEdit(source)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(source);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="flex-1 h-8 text-sm"
                        />
                      ) : (
                        <button
                          onClick={() => startEdit(source)}
                          className={cn(
                            "flex-1 text-left text-sm truncate transition-colors",
                            source.is_active ? "text-foreground" : "text-muted-foreground line-through"
                          )}
                          title="Clique para renomear"
                        >
                          {source.name}
                        </button>
                      )}
                      <SourceToggle
                        active={source.is_active}
                        onChange={(next) => onToggleActive(source.id, next)}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
