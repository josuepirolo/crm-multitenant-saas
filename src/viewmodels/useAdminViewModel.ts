"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { getAdminStats, listAllWorkspaces, getWorkspaceMembersAdmin } from "@/app/(admin)/admin/actions";
import type { AdminGlobalStats, WorkspaceMemberWithProfile, WorkspaceWithStats } from "@/types";

const PAGE_SIZE = 20;

export function useAdminViewModel() {
  const [stats, setStats]                   = useState<AdminGlobalStats | null>(null);
  const [workspaces, setWorkspaces]         = useState<WorkspaceWithStats[]>([]);
  const [total, setTotal]                   = useState(0);
  const [page, setPage]                     = useState(0);
  const [search, setSearch]                 = useState("");
  const [loading, setLoading]               = useState(true);
  const [statsLoading, setStatsLoading]     = useState(true);
  const [fetchError, setFetchError]         = useState<string | null>(null);
  const [isPending, startTransition]        = useTransition();

  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceWithStats | null>(null);
  const [detailMembers, setDetailMembers]         = useState<WorkspaceMemberWithProfile[]>([]);
  const [detailLoading, setDetailLoading]         = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    const result = await getAdminStats();
    if (!result.error) setStats(result.stats ?? null);
    setStatsLoading(false);
  }, []);

  const fetchWorkspaces = useCallback(async (currentPage: number, currentSearch: string) => {
    setLoading(true);
    setFetchError(null);
    const result = await listAllWorkspaces(currentSearch, currentPage, PAGE_SIZE);
    if (result.error) {
      setFetchError(result.error);
    } else {
      setWorkspaces(result.data);
      setTotal(result.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchWorkspaces(page, search); }, [fetchWorkspaces, page, search]);

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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return {
    stats, statsLoading,
    workspaces, total, totalPages, page, setPage,
    search, updateSearch,
    loading: loading || isPending,
    fetchError,
    selectedWorkspace, setSelectedWorkspace,
    detailMembers, detailLoading,
    openWorkspaceDetail,
    pageSize: PAGE_SIZE,
  };
}
