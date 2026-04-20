"use client";

import { useSettingsViewModel } from "@/viewmodels/useSettingsViewModel";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { can } from "@/lib/permissions";
import type { MemberRole } from "@/types";

export function SettingsClient() {
  const vm = useSettingsViewModel();

  const userRole: MemberRole | null = vm.members.find(
    (m) => m.user_id === vm.currentUserId
  )?.role ?? null;

  if (vm.fetchError) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {vm.fetchError}
        </div>
      </div>
    );
  }

  if (vm.loading && !vm.workspace) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="h-8 w-48 rounded-xl bg-muted animate-pulse" />
        <div className="h-48 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!vm.workspace) return null;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Gerencie seu workspace e membros da equipe</p>
      </div>

      <SettingsTabs
        workspace={vm.workspace}
        members={vm.members}
        currentUserId={vm.currentUserId}
        userRole={userRole}
        loading={vm.loading}
        inviteOpen={vm.inviteOpen}
        setInviteOpen={vm.setInviteOpen}
        onWorkspaceUpdated={vm.onWorkspaceUpdated}
        onMemberInvited={vm.onMemberInvited}
        onMemberRoleUpdated={vm.onMemberRoleUpdated}
        onMemberDeactivated={vm.onMemberDeactivated}
      />
    </div>
  );
}
