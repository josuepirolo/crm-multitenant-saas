"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/guards";

export interface WorkspaceUsageSummary {
  workspace_id:    string;
  workspace_name:  string;
  active_users:    number;
  total_sessions:  number;
  last_access:     string | null;
  top_areas:       { area: string; count: number }[];
  inactive_users:  number;
}

export interface UserUsageDetail {
  user_id:       string;
  name:          string | null;
  email:         string | null;
  last_login:    string | null;
  last_access:   string | null;
  inactive_days: number | null;
  top_areas:     { area: string; count: number }[];
  total_events:  number;
}

export interface AnalyticsFilters {
  workspaceId?: string;
  userId?:      string;
  area?:        string;
  days?:        number; // padrão 30
}

export async function getWorkspaceUsageSummaries(filters: AnalyticsFilters = {}) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado.", data: [] as WorkspaceUsageSummary[] };

  const days = filters.days ?? 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();

  try {
    // Sessões por workspace no período
    let q = admin
      .from("audit_logs")
      .select("workspace_id, user_id, action, metadata, created_at")
      .in("action", ["login_success", "area_viewed", "session_logout"])
      .gte("created_at", since)
      .not("workspace_id", "is", null);

    if (filters.workspaceId) q = q.eq("workspace_id", filters.workspaceId);
    if (filters.userId)      q = q.eq("user_id", filters.userId);

    const { data: logs, error } = await q;
    if (error) throw new Error(error.message);

    // Workspaces
    const { data: workspaces } = await admin
      .from("workspaces")
      .select("id, name");
    const wsMap: Record<string, string> = Object.fromEntries(
      (workspaces ?? []).map(w => [w.id, w.name])
    );

    // Agrupa por workspace
    const grouped: Record<string, {
      users: Set<string>;
      sessions: number;
      lastAccess: string | null;
      areas: Record<string, number>;
    }> = {};

    for (const log of logs ?? []) {
      const wsId = log.workspace_id;
      if (!wsId) continue;
      if (!grouped[wsId]) grouped[wsId] = { users: new Set(), sessions: 0, lastAccess: null, areas: {} };
      const g = grouped[wsId];
      if (log.user_id) g.users.add(log.user_id);
      if (log.action === "login_success") g.sessions++;
      if (!g.lastAccess || log.created_at > g.lastAccess) g.lastAccess = log.created_at;
      if (log.action === "area_viewed" && log.metadata?.area) {
        const area = log.metadata.area as string;
        g.areas[area] = (g.areas[area] ?? 0) + 1;
      }
    }

    // Inactive users: membros sem login nos últimos 30 dias
    const { data: allMembers } = await admin
      .from("workspace_members")
      .select("workspace_id, user_id")
      .is("deleted_at", null);

    const activeUsersByWs = Object.fromEntries(
      Object.entries(grouped).map(([wsId, g]) => [wsId, g.users])
    );

    const inactiveByWs: Record<string, number> = {};
    for (const m of allMembers ?? []) {
      if (!m.workspace_id || !m.user_id) continue;
      const active = activeUsersByWs[m.workspace_id];
      if (!active || !active.has(m.user_id)) {
        inactiveByWs[m.workspace_id] = (inactiveByWs[m.workspace_id] ?? 0) + 1;
      }
    }

    const result: WorkspaceUsageSummary[] = Object.entries(grouped).map(([wsId, g]) => ({
      workspace_id:   wsId,
      workspace_name: wsMap[wsId] ?? wsId,
      active_users:   g.users.size,
      total_sessions: g.sessions,
      last_access:    g.lastAccess,
      top_areas:      Object.entries(g.areas)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([area, count]) => ({ area, count })),
      inactive_users: inactiveByWs[wsId] ?? 0,
    }));

    return { error: undefined, data: result };
  } catch (err) {
    return { error: "Erro ao buscar relatório.", data: [] as WorkspaceUsageSummary[] };
  }
}

export async function getUserUsageDetails(workspaceId: string, filters: AnalyticsFilters = {}) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado.", data: [] as UserUsageDetail[] };

  const days = filters.days ?? 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();

  try {
    let q = admin
      .from("audit_logs")
      .select("user_id, action, metadata, created_at")
      .eq("workspace_id", workspaceId)
      .in("action", ["login_success", "area_viewed", "session_logout", "session_expired_inactivity"])
      .gte("created_at", since)
      .not("user_id", "is", null);

    if (filters.userId) q = q.eq("user_id", filters.userId);
    if (filters.area)   q = q.eq("metadata->>area", filters.area);

    const { data: logs, error } = await q;
    if (error) throw new Error(error.message);

    // Perfis dos usuários
    const userIds = [...new Set((logs ?? []).map(l => l.user_id).filter(Boolean))] as string[];
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds);
    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));

    // Agrupa por user
    const grouped: Record<string, {
      lastLogin: string | null;
      lastAccess: string | null;
      areas: Record<string, number>;
      totalEvents: number;
    }> = {};

    for (const log of logs ?? []) {
      const uid = log.user_id;
      if (!uid) continue;
      if (!grouped[uid]) grouped[uid] = { lastLogin: null, lastAccess: null, areas: {}, totalEvents: 0 };
      const g = grouped[uid];
      g.totalEvents++;
      if (!g.lastAccess || log.created_at > g.lastAccess) g.lastAccess = log.created_at;
      if (log.action === "login_success") {
        if (!g.lastLogin || log.created_at > g.lastLogin) g.lastLogin = log.created_at;
      }
      if (log.action === "area_viewed" && log.metadata?.area) {
        const area = log.metadata.area as string;
        g.areas[area] = (g.areas[area] ?? 0) + 1;
      }
    }

    const now = Date.now();
    const result: UserUsageDetail[] = Object.entries(grouped).map(([uid, g]) => {
      const profile = profileMap[uid];
      const inactiveDays = g.lastAccess
        ? Math.floor((now - new Date(g.lastAccess).getTime()) / 86_400_000)
        : null;
      return {
        user_id:       uid,
        name:          profile?.full_name ?? null,
        email:         profile?.email ?? null,
        last_login:    g.lastLogin,
        last_access:   g.lastAccess,
        inactive_days: inactiveDays,
        top_areas:     Object.entries(g.areas)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([area, count]) => ({ area, count })),
        total_events: g.totalEvents,
      };
    });

    return { error: undefined, data: result };
  } catch {
    return { error: "Erro ao buscar detalhes.", data: [] as UserUsageDetail[] };
  }
}
