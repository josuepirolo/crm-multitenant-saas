"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { getSettingsData } from "@/app/(dashboard)/settings/actions";
import type { Workspace, WorkspaceMemberWithProfile } from "@/types";

export function useSettingsViewModel() {
  const [workspace, setWorkspace]     = useState<Workspace | null>(null);
  const [members, setMembers]         = useState<WorkspaceMemberWithProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  const [inviteOpen, setInviteOpen]   = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const result = await getSettingsData();
    if (result.error) {
      setFetchError(result.error);
    } else {
      setWorkspace(result.workspace);
      setMembers(result.members);
      setCurrentUserId(result.currentUserId ?? null);
      setIsImpersonating(result.isImpersonating ?? false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function onWorkspaceUpdated(updated: Workspace) {
    setWorkspace(updated);
  }

  function onMemberInvited() {
    setInviteOpen(false);
    startTransition(() => fetchData());
  }

  function onMemberRoleUpdated(userId: string, role: WorkspaceMemberWithProfile["role"]) {
    setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role } : m));
  }

  function onMemberDeactivated(userId: string) {
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  }

  return {
    workspace, members, currentUserId, isImpersonating,
    loading: loading || isPending,
    fetchError,
    inviteOpen, setInviteOpen,
    onWorkspaceUpdated, onMemberInvited, onMemberRoleUpdated, onMemberDeactivated,
  };
}
