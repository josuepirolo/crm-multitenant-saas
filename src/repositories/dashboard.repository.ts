import { SupabaseClient } from "@supabase/supabase-js";

export interface DashboardStats {
  totalLeads: number;
  totalLeadsThisMonth: number;
  openDealsValue: number;
  openDealsCount: number;
  wonDealsCount: number;
  totalDealsCount: number;
}

export interface LeadsByDay {
  date: string;
  total: number;
}

export interface DealsByStatus {
  status: string;
  count: number;
  value: number;
}

export interface RecentContact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  created_at: string;
}

export interface IDashboardRepository {
  getStats(workspaceId: string): Promise<DashboardStats>;
  getLeadsByDay(workspaceId: string, days: number): Promise<LeadsByDay[]>;
  getDealsByStatus(workspaceId: string): Promise<DealsByStatus[]>;
  getRecentContacts(workspaceId: string, limit: number): Promise<RecentContact[]>;
}

export class SupabaseDashboardRepository implements IDashboardRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getStats(workspaceId: string): Promise<DashboardStats> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      { count: totalLeads },
      { count: totalLeadsThisMonth },
      { data: openDeals },
      { count: wonDealsCount },
      { count: totalDealsCount },
    ] = await Promise.all([
      this.client.from("contacts").select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).is("deleted_at", null),
      this.client.from("contacts").select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).is("deleted_at", null)
        .gte("created_at", startOfMonth.toISOString()),
      this.client.from("deals").select("value")
        .eq("workspace_id", workspaceId).eq("status", "open").is("deleted_at", null),
      this.client.from("deals").select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).eq("status", "won").is("deleted_at", null),
      this.client.from("deals").select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).is("deleted_at", null),
    ]);

    const openDealsValue = (openDeals ?? []).reduce((sum, d) => sum + (d.value ?? 0), 0);

    return {
      totalLeads: totalLeads ?? 0,
      totalLeadsThisMonth: totalLeadsThisMonth ?? 0,
      openDealsValue,
      openDealsCount: openDeals?.length ?? 0,
      wonDealsCount: wonDealsCount ?? 0,
      totalDealsCount: totalDealsCount ?? 0,
    };
  }

  async getLeadsByDay(workspaceId: string, days = 30): Promise<LeadsByDay[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data } = await this.client
      .from("contacts")
      .select("created_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .gte("created_at", since.toISOString())
      .order("created_at");

    const counts: Record<string, number> = {};

    // Pre-fill all days with 0
    for (let i = days; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      counts[d.toISOString().slice(0, 10)] = 0;
    }

    (data ?? []).forEach((row) => {
      const day = row.created_at.slice(0, 10);
      if (day in counts) counts[day]++;
    });

    return Object.entries(counts).map(([date, total]) => ({ date, total }));
  }

  async getDealsByStatus(workspaceId: string): Promise<DealsByStatus[]> {
    const { data } = await this.client
      .from("deals")
      .select("status, value")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);

    const grouped: Record<string, { count: number; value: number }> = {
      open: { count: 0, value: 0 },
      won: { count: 0, value: 0 },
      lost: { count: 0, value: 0 },
    };

    (data ?? []).forEach(({ status, value }) => {
      if (status in grouped) {
        grouped[status].count++;
        grouped[status].value += value ?? 0;
      }
    });

    return Object.entries(grouped).map(([status, { count, value }]) => ({
      status, count, value,
    }));
  }

  async getRecentContacts(workspaceId: string, limit = 5): Promise<RecentContact[]> {
    const { data } = await this.client
      .from("contacts")
      .select("id, name, phone, email, status, created_at")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    return data ?? [];
  }
}
