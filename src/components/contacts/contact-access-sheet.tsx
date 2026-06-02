"use client";

import { useState } from "react";
import { Shield, Trash2, UserPlus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { appleEase } from "@/components/ui/motion";
import type { Contact, ContactAccess, WorkspaceMemberWithProfile } from "@/types";

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

interface ContactAccessSheetProps {
  open: boolean;
  contact: Contact | null;
  grants: ContactAccess[];
  members: WorkspaceMemberWithProfile[];
  onClose: () => void;
  onGrant: (contactId: string, userId: string) => Promise<void>;
  onRevoke: (contactId: string, userId: string) => Promise<void>;
}

export function ContactAccessSheet({
  open, contact, grants, members, onClose, onGrant, onRevoke,
}: ContactAccessSheetProps) {
  const [addingUser, setAddingUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!contact) return null;

  const grantedUserIds = new Set(grants.map((g) => g.user_id));
  const available = members.filter(
    (m) => !grantedUserIds.has(m.user_id) && m.user_id !== contact.assigned_to
  );

  async function handleGrant() {
    if (!addingUser || !contact) return;
    setLoading(true);
    await onGrant(contact.id, addingUser);
    setAddingUser(null);
    setLoading(false);
  }

  function getMemberInfo(userId: string) {
    const m = members.find((m) => m.user_id === userId);
    return {
      name: m?.profiles?.name ?? m?.profiles?.email ?? "Membro",
      avatar: m?.profiles?.avatar_url ?? null,
    };
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <ModalOverlay onClick={onClose} />
          <motion.div
            key="access-sheet"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.3, ease: appleEase }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-border/50 bg-card shadow-2xl shadow-black/20 flex flex-col"
          >
            <div className="flex items-start justify-between p-6 pb-4 border-b border-border/40">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Shield size={16} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Gerenciar acesso</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{contact.name}</p>
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
              {grants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum acesso compartilhado.
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Com acesso compartilhado
                  </p>
                  {grants.map((g) => {
                    const { name, avatar } = getMemberInfo(g.user_id);
                    return (
                      <div
                        key={g.user_id}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-muted/40"
                      >
                        {avatar ? (
                          <img src={avatar} alt={name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                            {getInitials(name)}
                          </div>
                        )}
                        <span className="flex-1 text-sm truncate">{name}</span>
                        <button
                          onClick={() => onRevoke(contact.id, g.user_id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg"
                          title="Remover acesso"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {available.length > 0 && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Adicionar acesso
                  </p>
                  <div className="flex gap-2">
                    <Select value={addingUser} onValueChange={(v) => setAddingUser(v)}>
                      <SelectTrigger className="flex-1 text-sm">
                        <SelectValue placeholder="Selecionar membro..." />
                      </SelectTrigger>
                      <SelectContent>
                        {available.map((m) => {
                          const name = m.profiles?.name ?? m.profiles?.email ?? "Membro";
                          return (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {name}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleGrant}
                      disabled={!addingUser || loading}
                      size="icon"
                      className="shrink-0"
                    >
                      <UserPlus size={15} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
