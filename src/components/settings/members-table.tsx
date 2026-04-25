"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Shield, UserX } from "lucide-react";
import { updateMemberRole, deactivateMember } from "@/app/(dashboard)/settings/actions";
import { ROLE_LABELS, ROLE_COLORS, ASSIGNABLE_ROLES } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { MemberRole, WorkspaceMemberWithProfile } from "@/types";

interface MembersTableProps {
  members: WorkspaceMemberWithProfile[];
  currentUserId: string | null;
  canManage: boolean;
  onRoleUpdated: (userId: string, role: MemberRole) => void;
  onDeactivated: (userId: string) => void;
}

function MembersTableSkeleton() {
  return (
    <div className="divide-y divide-border/50">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4">
          <div className="h-9 w-9 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-48 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function MemberRow({
  member, currentUserId, canManage, onRoleUpdated, onDeactivated,
}: {
  member: WorkspaceMemberWithProfile;
  currentUserId: string | null;
  canManage: boolean;
  onRoleUpdated: (userId: string, role: MemberRole) => void;
  onDeactivated: (userId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingRole, setChangingRole] = useState(false);
  const isSelf = member.user_id === currentUserId;
  const isOwner = member.role === "owner";
  const canAct = canManage && !isSelf && !isOwner;

  const name  = member.profiles?.name ?? "Sem nome";
  const email = member.profiles?.email ?? "—";
  const initials = name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

  async function handleRoleChange(role: MemberRole) {
    setChangingRole(true);
    setMenuOpen(false);
    const formData = new FormData();
    formData.append("userId", member.user_id);
    formData.append("role", role);

    const resultPromise = updateMemberRole(null, formData).then((r) => {
      if (r.error) throw new Error(r.error);
      return r;
    });

    toast.promise(resultPromise, {
      loading: "Atualizando função...",
      success: "Função atualizada!",
      error:   (err: Error) => err.message,
    });

    try {
      await resultPromise;
      onRoleUpdated(member.user_id, role);
    } catch { /* handled by toast */ }
    finally { setChangingRole(false); }
  }

  async function handleDeactivate() {
    setMenuOpen(false);
    const formData = new FormData();
    formData.append("userId", member.user_id);

    const resultPromise = deactivateMember(formData).then((r) => {
      if (r.error) throw new Error(r.error);
      return r;
    });

    toast.promise(resultPromise, {
      loading: "Removendo membro...",
      success: "Membro removido.",
      error:   (err: Error) => err.message,
    });

    try {
      await resultPromise;
      onDeactivated(member.user_id);
    } catch { /* handled by toast */ }
  }

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name} {isSelf && <span className="text-muted-foreground font-normal">(você)</span>}</p>
        <p className="text-xs text-muted-foreground truncate">{email}</p>
      </div>

      <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", ROLE_COLORS[member.role])}>
        {ROLE_LABELS[member.role]}
      </span>

      {canAct && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            disabled={changingRole}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <MoreHorizontal size={15} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-border/50 bg-card shadow-lg shadow-black/10 overflow-hidden">
                <div className="p-1">
                  <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Alterar função</p>
                  {ASSIGNABLE_ROLES.filter((r) => r !== member.role).map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRoleChange(r)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      <Shield size={13} className="text-muted-foreground" />
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                  <div className="my-1 border-t border-border/50" />
                  <button
                    onClick={handleDeactivate}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <UserX size={13} />
                    Remover do workspace
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function MembersTable({ members, currentUserId, canManage, onRoleUpdated, onDeactivated }: MembersTableProps) {
  if (!members.length) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">Nenhum membro encontrado.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {members.map((m) => (
        <MemberRow
          key={m.id}
          member={m}
          currentUserId={currentUserId}
          canManage={canManage}
          onRoleUpdated={onRoleUpdated}
          onDeactivated={onDeactivated}
        />
      ))}
    </div>
  );
}

export { MembersTableSkeleton };
