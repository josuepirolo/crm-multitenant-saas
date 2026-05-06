"use client";

import { useRef, useState, useTransition } from "react";
import { Building2, Users, Plus, UserCircle, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WorkspaceProfileForm } from "./workspace-profile-form";
import { WorkspaceNicheForm } from "./workspace-niche-form";
import { TwoFactorSection } from "./two-factor-section";
import { MembersTable, MembersTableSkeleton } from "./members-table";
import { InviteMemberModal } from "./invite-member-modal";
import { uploadUserAvatar } from "@/app/(dashboard)/settings/upload-actions";
import { cn } from "@/lib/utils";
import { can } from "@/lib/permissions";
import type { MemberRole, Workspace, WorkspaceMemberWithProfile } from "@/types";

const TABS = [
  { id: "general", label: "Empresa",    icon: Building2 },
  { id: "members", label: "Membros",    icon: Users },
  { id: "profile", label: "Meu Perfil", icon: UserCircle },
] as const;

type TabId = typeof TABS[number]["id"];

interface SettingsTabsProps {
  workspace: Workspace;
  members: WorkspaceMemberWithProfile[];
  currentUserId: string | null;
  userRole: MemberRole | null;
  loading: boolean;
  inviteOpen: boolean;
  setInviteOpen: (v: boolean) => void;
  onWorkspaceUpdated: (w: Workspace) => void;
  onMemberInvited: () => void;
  onMemberRoleUpdated: (userId: string, role: MemberRole) => void;
  onMemberDeactivated: (userId: string) => void;
}

function UserAvatarSection({
  currentAvatarUrl,
  name,
  email,
}: {
  currentAvatarUrl: string | null;
  name: string | null;
  email: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
  const [isUploading, startUpload] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);

    startUpload(async () => {
      const fd = new FormData();
      fd.append("file", file);

      const promise = uploadUserAvatar(null, fd).then((r) => {
        if (r.error) throw new Error(r.error);
        return r;
      });

      toast.promise(promise, {
        loading: "Enviando...",
        success: "Avatar atualizado!",
        error:   (err: Error) => err.message,
      });

      try {
        await promise;
      } catch {
        URL.revokeObjectURL(url);
        setPreview(currentAvatarUrl);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold">Meu perfil</h3>
        <p className="text-sm text-muted-foreground mt-0.5">Foto exibida para os membros da equipe</p>
      </div>

      {/* Identidade */}
      {(name || email) && (
        <div className="space-y-0.5">
          {name  && <p className="text-sm font-medium">{name}</p>}
          {email && <p className="text-xs text-muted-foreground">{email}</p>}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full border border-border/60 bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <UserCircle size={32} className="text-muted-foreground" />
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />

        <div className="space-y-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
          >
            <Upload size={14} />
            {isUploading ? "Enviando..." : "Alterar foto"}
          </Button>
          <p className="text-xs text-muted-foreground">JPG, PNG ou WebP · máx 2 MB</p>
        </div>
      </div>
    </div>
  );
}

type GeneralSubTab = "dados" | "segmento";

export function SettingsTabs({
  workspace, members, currentUserId, userRole, loading,
  inviteOpen, setInviteOpen,
  onWorkspaceUpdated, onMemberInvited, onMemberRoleUpdated, onMemberDeactivated,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [generalSubTab, setGeneralSubTab] = useState<GeneralSubTab>("dados");

  const canEditSettings  = can(userRole, "settings", "edit");
  const canManageMembers = can(userRole, "members", "create");

  const currentMember    = members.find((m) => m.user_id === currentUserId);
  const currentAvatarUrl = currentMember?.profiles?.avatar_url ?? null;

  return (
    <>
      <div className="flex gap-1 border-b border-border/50">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="pt-6 space-y-6">
        {activeTab === "general" && (
          <>
            {/* Sub-abas: Dados gerais | Segmento */}
            <div className="flex gap-1 border-b border-border/40">
              {(["dados", "segmento"] as const).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setGeneralSubTab(sub)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium border-b-2 transition-colors capitalize",
                    generalSubTab === sub
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {sub === "dados" ? "Dados gerais" : "Segmento"}
                </button>
              ))}
            </div>

            {generalSubTab === "dados" && (
              <WorkspaceProfileForm
                workspace={workspace}
                canEdit={canEditSettings}
                onUpdated={onWorkspaceUpdated}
              />
            )}
            {generalSubTab === "segmento" && (
              <WorkspaceNicheForm
                workspace={workspace}
                canEdit={canEditSettings}
                onUpdated={onWorkspaceUpdated}
              />
            )}
          </>
        )}

        {activeTab === "members" && (
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
              <div>
                <h3 className="text-base font-semibold">Membros</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {members.length} membro{members.length !== 1 ? "s" : ""} no workspace
                </p>
              </div>
              {canManageMembers && (
                <Button onClick={() => setInviteOpen(true)} size="sm" className="rounded-xl gap-1.5">
                  <Plus size={14} />
                  Convidar
                </Button>
              )}
            </div>

            {loading ? (
              <MembersTableSkeleton />
            ) : (
              <MembersTable
                members={members}
                currentUserId={currentUserId}
                canManage={canManageMembers}
                onRoleUpdated={onMemberRoleUpdated}
                onDeactivated={onMemberDeactivated}
              />
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <>
            <UserAvatarSection
              currentAvatarUrl={currentAvatarUrl}
              name={currentMember?.profiles?.name ?? null}
              email={currentMember?.profiles?.email ?? null}
            />
            <TwoFactorSection />
          </>
        )}
      </div>

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={onMemberInvited}
      />
    </>
  );
}
