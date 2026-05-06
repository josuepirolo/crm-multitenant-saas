import { SupabaseClient } from "@supabase/supabase-js";
import type { Pipeline, Stage, Deal } from "@/types";
import type { CreateDealInput, UpdateDealInput } from "@/lib/validations/deal";

export type DealWithContact = Deal & {
  contact: { id: string; name: string; phone: string | null; avatar_url: string | null } | null;
  assignee: { id: string; name: string | null; avatar_url: string | null } | null;
};

export type ContactForSelect = { id: string; name: string; phone: string | null };

const DEAL_SELECT = `
  *,
  contact:contacts(id, name, phone, avatar_url),
  assignee:profiles(id, name, avatar_url)
` as const;

export interface IDealRepository {
  getDefaultPipeline(workspaceId: string): Promise<Pipeline | null>;
  getStages(workspaceId: string, pipelineId: string): Promise<Stage[]>;
  getDeals(workspaceId: string, pipelineId: string): Promise<DealWithContact[]>;
  getContactsForSelect(workspaceId: string): Promise<ContactForSelect[]>;
  create(workspaceId: string, input: CreateDealInput, userId: string): Promise<DealWithContact>;
  update(workspaceId: string, dealId: string, input: UpdateDealInput): Promise<DealWithContact>;
  move(workspaceId: string, dealId: string, stageId: string, position: number): Promise<void>;
  close(workspaceId: string, dealId: string, status: "won" | "lost"): Promise<void>;
  archive(workspaceId: string, dealId: string): Promise<void>;
  validateStageOwnership(workspaceId: string, stageId: string): Promise<boolean>;
  validateContactOwnership(workspaceId: string, contactId: string): Promise<boolean>;
  createDefaultPipeline(workspaceId: string): Promise<{ pipeline: Pipeline; stages: Stage[] }>;
}

export class SupabaseDealRepository implements IDealRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getDefaultPipeline(workspaceId: string): Promise<Pipeline | null> {
    const { data } = await this.client
      .from("pipelines")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_default", true)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    return (data as Pipeline) ?? null;
  }

  async getStages(workspaceId: string, pipelineId: string): Promise<Stage[]> {
    const { data, error } = await this.client
      .from("stages")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("pipeline_id", pipelineId)
      .is("deleted_at", null)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Stage[];
  }

  async getDeals(workspaceId: string, pipelineId: string): Promise<DealWithContact[]> {
    const { data, error } = await this.client
      .from("deals")
      .select(DEAL_SELECT)
      .eq("workspace_id", workspaceId)
      .eq("pipeline_id", pipelineId)
      .eq("status", "open")
      .is("deleted_at", null)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as DealWithContact[];
  }

  async getContactsForSelect(workspaceId: string): Promise<ContactForSelect[]> {
    const { data } = await this.client
      .from("contacts")
      .select("id, name, phone")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(100);
    return (data ?? []) as ContactForSelect[];
  }

  async create(workspaceId: string, input: CreateDealInput, userId: string): Promise<DealWithContact> {
    const { data: posData } = await this.client
      .from("deals")
      .select("position")
      .eq("workspace_id", workspaceId)
      .eq("stage_id", input.stage_id)
      .is("deleted_at", null)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const position = ((posData?.position as number) ?? 0) + 1000;

    const { data, error } = await this.client
      .from("deals")
      .insert({
        workspace_id:        workspaceId,
        pipeline_id:         input.pipeline_id,
        stage_id:            input.stage_id,
        title:               input.title,
        value:               input.value ?? null,
        contact_id:          input.contact_id || null,
        expected_close_date: input.expected_close_date || null,
        position,
        created_by:  userId,
        assigned_to: userId,
        status: "open",
      })
      .select(DEAL_SELECT)
      .single();
    if (error) throw new Error(error.message);
    return data as unknown as DealWithContact;
  }

  async update(workspaceId: string, dealId: string, input: UpdateDealInput): Promise<DealWithContact> {
    const { data, error } = await this.client
      .from("deals")
      .update({
        title:               input.title,
        value:               input.value ?? null,
        contact_id:          input.contact_id || null,
        expected_close_date: input.expected_close_date || null,
      })
      .eq("id", dealId)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .select(DEAL_SELECT)
      .single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Negociação não encontrada.");
    return data as unknown as DealWithContact;
  }

  async move(workspaceId: string, dealId: string, stageId: string, position: number): Promise<void> {
    const { error } = await this.client
      .from("deals")
      .update({ stage_id: stageId, position })
      .eq("id", dealId)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
  }

  async close(workspaceId: string, dealId: string, status: "won" | "lost"): Promise<void> {
    const { error } = await this.client
      .from("deals")
      .update({ status })
      .eq("id", dealId)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
  }

  async archive(workspaceId: string, dealId: string): Promise<void> {
    const { error } = await this.client
      .from("deals")
      .update({ deleted_at: new Date().toISOString(), status: "archived" })
      .eq("id", dealId)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
  }

  async validateStageOwnership(workspaceId: string, stageId: string): Promise<boolean> {
    const { data } = await this.client
      .from("stages")
      .select("id")
      .eq("id", stageId)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .maybeSingle();
    return !!data;
  }

  async validateContactOwnership(workspaceId: string, contactId: string): Promise<boolean> {
    const { data } = await this.client
      .from("contacts")
      .select("id")
      .eq("id", contactId)
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .maybeSingle();
    return !!data;
  }

  async createDefaultPipeline(workspaceId: string): Promise<{ pipeline: Pipeline; stages: Stage[] }> {
    const { data: pipeline, error: pe } = await this.client
      .from("pipelines")
      .insert({ workspace_id: workspaceId, name: "Funil Principal", is_default: true })
      .select("*")
      .single();
    if (pe || !pipeline) throw new Error(pe?.message ?? "Erro ao criar funil.");

    const { data: stages, error: se } = await this.client
      .from("stages")
      .insert([
        { workspace_id: workspaceId, pipeline_id: pipeline.id, name: "Qualificação", color: "#6366f1", position: 1000 },
        { workspace_id: workspaceId, pipeline_id: pipeline.id, name: "Proposta",     color: "#f59e0b", position: 2000 },
        { workspace_id: workspaceId, pipeline_id: pipeline.id, name: "Fechamento",   color: "#10b981", position: 3000 },
      ])
      .select("*")
      .order("position");
    if (se || !stages) throw new Error(se?.message ?? "Erro ao criar etapas.");

    return { pipeline: pipeline as Pipeline, stages: stages as Stage[] };
  }
}
