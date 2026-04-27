"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { toast } from "sonner";
import { getAdminStats, listAllWorkspaces, getWorkspaceMembersAdmin, updateWorkspaceAdmin, setWorkspaceActiveAdmin, changeMemberRoleAdmin } from "@/app/(admin)/admin/actions";
import type { AdminGlobalStats, MemberRole, WorkspaceMemberWithProfile, WorkspaceWithStats } from "@/types";

const PAGE_SIZE = 20;
export type AdminTab = "active" | "inactive";

export function useAdminViewModel() {
  const [stats, setStats]               = useState<AdminGlobalStats | null>(null);
  const [workspaces, setWorkspaces]     = useState<WorkspaceWithStats[]>([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(0);
  const [search, setSearch]             = useState("");
  const [activeTab, setActiveTab]       = useState<AdminTab>("active");
  const [loading, setLoading]           = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [fetchError, setFetchError]     = useState<string | null>(null);
  const [isPending, startTransition]    = useTransition();

  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceWithStats | null>(null);
  const [detailMembers, setDetailMembers]         = useState<WorkspaceMemberWithProfile[]>([]);
  const [detailLoading, setDetailLoading]         = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const result = await getAdminStats();
    if (!result.error) setStats(result.stats ?? null);
    setStatsLoading(false);
  }, []);

  const fetchWorkspaces = useCallback(async (currentPage: number, currentSearch: string, tab: AdminTab) => {
    setLoading(true);
    setFetchError(null);
    const isActive = tab === "active";
    const result = await listAllWorkspaces(currentSearch, currentPage, PAGE_SIZE, isActive);
    if (result.error) {
      setFetchError(result.error);
    } else {
      setWorkspaces(result.data);
      setTotal(result.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchWorkspaces(page, search, activeTab); }, [fetchWorkspaces, page, search, activeTab]);

  async function openWorkspaceDetail(ws: WorkspaceWithStats) {
    setSelectedWorkspace(ws);
    setDetailLoading(true);
    const result = await getWorkspaceMembersAdmin(ws.id);
    setDetailMembers(result.members);
    setDetailLoading(false);
  }

  function updateSearch(value: string) {
    setPage(0);
    startTransition(() => setSearch(value));
  }

  function switchTab(tab: AdminTab) {
    setPage(0);
    setSearch("");
    setSelectedWorkspace(null);
    setActiveTab(tab);
  }

  function patchWorkspaceInList(id: string, patch: Partial<WorkspaceWithStats>) {
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w));
    setSelectedWorkspace(prev => prev?.id === id ? { ...prev, ...patch } : prev);
  }

  async function handleUpdateWorkspaceName(workspaceId: string, name: string) {
    const prev = selectedWorkspace?.name;
    patchWorkspaceInList(workspaceId, { name });
    const result = await updateWorkspaceAdmin(workspaceId, name);
    if (result.error) {
      if (prev) patchWorkspaceInList(workspaceId, { name: prev });
      toast.error(result.error);
    } else {
      toast.success("Nome atualizado.");
    }
  }

  async function handleSetWorkspaceActive(workspaceId: string, active: boolean) {
    // Remove da lista atual (a empresa muda de aba) — atualização otimista
    setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
    setTotal(prev => prev - 1);
    setSelectedWorkspace(null);

    const result = await setWorkspaceActiveAdmin(workspaceId, active);
    if (result.error) {
      // Em caso de erro, recarrega a lista
      fetchWorkspaces(page, search, activeTab);
      toast.error(result.error);
    } else {
      toast.success(active ? "Empresa reativada." : "Empresa desativada.");
      // Atualiza stats
      fetchStats();
    }
  }

  async function handleChangeMemberRole(memberId: string, role: MemberRole) {
    const prev = detailMembers.find(m => m.id === memberId)?.role;
    setDetailMembers(ms => ms.map(m => m.id === memberId ? { ...m, role } : m));
    const result = await changeMemberRoleAdmin(memberId, role);
    if (result.error) {
      if (prev) setDetailMembers(ms => ms.map(m => m.id === memberId ? { ...m, role: prev } : m));
      toast.error(result.error);
    } else {
      toast.success("Role atualizado.");
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    stats, statsLoading,
    workspaces, total, totalPages, page, setPage,
    search, updateSearch,
    activeTab, switchTab,
    loading: loading || isPending,
    fetchError,
    selectedWorkspace, setSelectedWorkspace,
    detailMembers, detailLoading,
    openWorkspaceDetail,
    handleUpdateWorkspaceName,
    handleSetWorkspaceActive,
    handleChangeMemberRole,
    pageSize: PAGE_SIZE,
  };
}
