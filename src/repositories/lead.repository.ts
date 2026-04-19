import { SupabaseClient } from "@supabase/supabase-js";
import type { ContactStatus } from "@/types";

export interface Lead {
  id: string;
  workspace_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  company: string | null;
  status: ContactStatus;
  notes: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadDTO {
  workspace_id: string;
  name: string;
  phone?: string;
  email?: string;
  document?: string;
  company?: string;
  status?: ContactStatus;
  notes?: string;
  created_by?: string;
}

export interface UpdateLeadDTO {
  name?: string;
  phone?: string;
  email?: string;
  document?: string;
  company?: string;
  status?: ContactStatus;
  notes?: string;
}

export interface LeadFilters {
  search?: string;
  status?: ContactStatus | "all";
}

export interface LeadPage {
  data: Lead[];
  total: number;
}

export interface ILeadRepository {
  findAll(workspaceId: string, filters: LeadFilters, page: number, pageSize: number): Promise<LeadPage>;
  findById(workspaceId: string, id: string): Promise<Lead | null>;
  create(data: CreateLeadDTO): Promise<Lead>;
  update(workspaceId: string, id: string, data: UpdateLeadDTO): Promise<Lead>;
  softDelete(workspaceId: string, id: string): Promise<void>;
}

export class SupabaseLeadRepository implements ILeadRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findAll(workspaceId: string, filters: LeadFilters, page: number, pageSize: number): Promise<LeadPage> {
    let query = this.client
      .from("contacts")
      .select("*", { count: "exact" })
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }

    if (filters.search?.trim()) {
      const s = filters.search.trim();
      query = query.or(`name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%,company.ilike.%${s}%`);
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);
    return { data: (data ?? []) as Lead[], total: count ?? 0 };
  }

  async findById(workspaceId: string, id: string): Promise<Lead | null> {
    const { data } = await this.client
      .from("contacts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    return data ?? null;
  }

  async create(data: CreateLeadDTO): Promise<Lead> {
    const { data: lead, error } = await this.client
      .from("contacts")
      .insert({
        workspace_id: data.workspace_id,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        document: data.document || null,
        company: data.company || null,
        status: data.status ?? "lead",
        notes: data.notes || null,
        created_by: data.created_by || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return lead as Lead;
  }

  async update(workspaceId: string, id: string, data: UpdateLeadDTO): Promise<Lead> {
    const { data: lead, error } = await this.client
      .from("contacts")
      .update({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.document !== undefined && { document: data.document || null }),
        ...(data.company !== undefined && { company: data.company || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      })
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return lead as Lead;
  }

  async softDelete(workspaceId: string, id: string): Promise<void> {
    const { error } = await this.client
      .from("contacts")
      .update({ deleted_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("id", id);
    if (error) throw new Error(error.message);
  }
}
