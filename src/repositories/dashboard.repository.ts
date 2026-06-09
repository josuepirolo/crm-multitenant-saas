import { SupabaseClient } from "@supabase/supabase-js";

export interface DashboardStats {
  totalLeads: number;
  totalLeadsThisMonth: number;
}

export interface LeadsByDay {
  date: string;
  total: number;
}

export interface ContactsByState {
  state: string;
  count: number;
}

export interface ContactsByStateResult {
  byState: ContactsByState[];
  withoutPhone: number;
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
  getContactsByState(workspaceId: string): Promise<ContactsByStateResult>;
  getRecentContacts(workspaceId: string, limit: number): Promise<RecentContact[]>;
}


export class SupabaseDashboardRepository implements IDashboardRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getStats(workspaceId: string): Promise<DashboardStats> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [{ count: totalLeads }, { count: totalLeadsThisMonth }] = await Promise.all([
      this.client.from("contacts").select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).is("deleted_at", null),
      this.client.from("contacts").select("*", { count: "exact", head: true })
        .eq("workspace_id", workspaceId).is("deleted_at", null)
        .gte("created_at", startOfMonth.toISOString()),
    ]);

    return {
      totalLeads: totalLeads ?? 0,
      totalLeadsThisMonth: totalLeadsThisMonth ?? 0,
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

  async getContactsByState(workspaceId: string): Promise<ContactsByStateResult> {
    const { data } = await this.client.rpc("get_contacts_by_state", {
      p_workspace_id: workspaceId,
    });

    const rows = (data ?? []) as { state: string; cnt: number; without_phone: number }[];
    const byState = rows.map(({ state, cnt }) => ({ state, count: Number(cnt) }));
    const withoutPhone = Number(rows[0]?.without_phone ?? 0);

    return { byState, withoutPhone };
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
