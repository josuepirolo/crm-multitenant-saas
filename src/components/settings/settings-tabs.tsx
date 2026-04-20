"use client";

import { useState } from "react";
import { Building2, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceGeneralForm } from "./workspace-general-form";
import { MembersTable, MembersTableSkeleton } from "./members-table";
import { InviteMemberModal } from "./invite-member-modal";
import { cn } from "@/lib/utils";
import { can } from "@/lib/permissions";
import type { MemberRole, Workspace, WorkspaceMemberWithProfile } from "@/types";

const TABS = [
  { id: "general", label: "Geral",    icon: Building2 },
  { id: "members", label: "Membros",  icon: Users },
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

export function SettingsTabs({
  workspace, members, currentUserId, userRole, loading,
  inviteOpen, setInviteOpen,
  onWorkspaceUpdated, onMemberInvited, onMemberRoleUpdated, onMemberDeactivated,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("general");

  const canEditSettings = can(userRole, "settings", "edit");
  const canManageMembers = can(userRole, "members", "create");

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
          <WorkspaceGeneralForm
            workspace={workspace}
            canEdit={canEditSettings}
            onUpdated={onWorkspaceUpdated}
          />
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
      </div>

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={onMemberInvited}
      />
    </>
  );
}
