import { SupabaseClient } from "@supabase/supabase-js";
import type { Contact, ContactStatus } from "@/types";

export type { Contact };

export interface CreateContactDTO {
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

export interface UpdateContactDTO {
  name?: string;
  phone?: string;
  email?: string;
  document?: string;
  company?: string;
  status?: ContactStatus;
  notes?: string;
}

export interface ContactFilters {
  search?: string;
  status?: ContactStatus | "all";
}

export interface ContactPage {
  data: Contact[];
  total: number;
}

export interface IContactRepository {
  findAll(workspaceId: string, filters: ContactFilters, page: number, pageSize: number): Promise<ContactPage>;
  findById(workspaceId: string, id: string): Promise<Contact | null>;
  create(data: CreateContactDTO): Promise<Contact>;
  update(workspaceId: string, id: string, data: UpdateContactDTO): Promise<Contact>;
  softDelete(workspaceId: string, id: string): Promise<void>;
}

export class SupabaseContactRepository implements IContactRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findAll(workspaceId: string, filters: ContactFilters, page: number, pageSize: number): Promise<ContactPage> {
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
    return { data: (data ?? []) as Contact[], total: count ?? 0 };
  }

  async findById(workspaceId: string, id: string): Promise<Contact | null> {
    const { data } = await this.client
      .from("contacts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .is("deleted_at", null)
      .single();
    return data ?? null;
  }

  async create(data: CreateContactDTO): Promise<Contact> {
    const { data: contact, error } = await this.client
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
    return contact as Contact;
  }

  async update(workspaceId: string, id: string, data: UpdateContactDTO): Promise<Contact> {
    const { data: contact, error } = await this.client
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
    return contact as Contact;
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
