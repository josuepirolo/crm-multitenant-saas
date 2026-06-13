import { SupabaseClient } from "@supabase/supabase-js";
import type { ContactSource } from "@/types";

export type { ContactSource };

export interface CreateContactSourceDTO {
  workspace_id: string;
  name: string;
}

export interface IContactSourceRepository {
  findAll(workspaceId: string, options?: { onlyActive?: boolean }): Promise<ContactSource[]>;
  create(data: CreateContactSourceDTO): Promise<ContactSource>;
  rename(workspaceId: string, id: string, name: string): Promise<ContactSource>;
  setActive(workspaceId: string, id: string, isActive: boolean): Promise<ContactSource>;
  assignToContact(workspaceId: string, contactId: string, sourceIds: string[]): Promise<void>;
  listForContact(contactId: string): Promise<ContactSource[]>;
}

export class SupabaseContactSourceRepository implements IContactSourceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findAll(workspaceId: string, options?: { onlyActive?: boolean }): Promise<ContactSource[]> {
    let query = this.client
      .from("contact_sources")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (options?.onlyActive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.order("name");
    if (error) throw new Error(error.message);
    return (data ?? []) as ContactSource[];
  }

  async create(data: CreateContactSourceDTO): Promise<ContactSource> {
    const { data: source, error } = await this.client
      .from("contact_sources")
      .insert({ workspace_id: data.workspace_id, name: data.name })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return source as ContactSource;
  }

  async rename(workspaceId: string, id: string, name: string): Promise<ContactSource> {
    const { data: source, error } = await this.client
      .from("contact_sources")
      .update({ name })
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return source as ContactSource;
  }

  async setActive(workspaceId: string, id: string, isActive: boolean): Promise<ContactSource> {
    const { data: source, error } = await this.client
      .from("contact_sources")
      .update({ is_active: isActive })
      .eq("workspace_id", workspaceId)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return source as ContactSource;
  }

  async assignToContact(workspaceId: string, contactId: string, sourceIds: string[]): Promise<void> {
    if (sourceIds.length === 0) return;
    const rows = sourceIds.map((source_id) => ({ workspace_id: workspaceId, contact_id: contactId, source_id }));
    const { error } = await this.client
      .from("contact_source_assignments")
      .upsert(rows, { onConflict: "contact_id,source_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }

  async listForContact(contactId: string): Promise<ContactSource[]> {
    const { data, error } = await this.client
      .from("contact_source_assignments")
      .select("source:contact_sources(*)")
      .eq("contact_id", contactId);
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as { source: ContactSource }[])
      .map((r) => r.source)
      .filter(Boolean);
  }
}
