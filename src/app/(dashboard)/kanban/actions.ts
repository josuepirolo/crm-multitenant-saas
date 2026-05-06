"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/guards";
import { publicError } from "@/lib/security/security-errors";
import { revalidatePath } from "next/cache";
import { SupabaseDealRepository } from "@/repositories/deal.repository";
import {
  GetKanbanDataUseCase,
  GetContactsForSelectUseCase,
  CreateDealUseCase,
  UpdateDealUseCase,
  MoveDealUseCase,
  CloseDealUseCase,
  ArchiveDealUseCase,
  CreateDefaultPipelineUseCase,
} from "@/usecases/KanbanUseCases";
import {
  createDealSchema,
  updateDealSchema,
  moveDealSchema,
  closeDealSchema,
  type CreateDealInput,
  type UpdateDealInput,
  type MoveDealInput,
  type CloseDealInput,
} from "@/lib/validations/deal";

function repo(supabase: Awaited<ReturnType<typeof createClient>>) {
  return new SupabaseDealRepository(supabase);
}

export async function getKanbanDataAction() {
  const ctx = await getWorkspaceContext("deals", "view");
  if ("error" in ctx) return { error: ctx.error };

  try {
    const supabase = await createClient();
    const data = await new GetKanbanDataUseCase(repo(supabase)).execute(ctx.workspaceId);
    return { ...data, workspaceId: ctx.workspaceId };
  } catch (err) {
    return publicError(err, "Erro ao carregar o funil.");
  }
}

export async function getContactsForSelectAction() {
  const ctx = await getWorkspaceContext("deals", "view");
  if ("error" in ctx) return { error: ctx.error, contacts: [] };

  try {
    const supabase = await createClient();
    const contacts = await new GetContactsForSelectUseCase(repo(supabase)).execute(ctx.workspaceId);
    return { contacts };
  } catch {
    return { contacts: [] };
  }
}

export async function createDealAction(input: CreateDealInput) {
  const ctx = await getWorkspaceContext("deals", "create");
  if ("error" in ctx) return { error: ctx.error };

  const parsed = createDealSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const supabase = await createClient();
    const deal = await new CreateDealUseCase(repo(supabase)).execute(ctx.workspaceId, parsed.data, ctx.userId);
    revalidatePath("/kanban");
    return { deal };
  } catch (err) {
    return publicError(err, "Erro ao criar negociação.");
  }
}

export async function updateDealAction(input: UpdateDealInput) {
  const ctx = await getWorkspaceContext("deals", "edit");
  if ("error" in ctx) return { error: ctx.error };

  const parsed = updateDealSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const supabase = await createClient();
    const deal = await new UpdateDealUseCase(repo(supabase)).execute(ctx.workspaceId, parsed.data.deal_id, parsed.data);
    revalidatePath("/kanban");
    return { deal };
  } catch (err) {
    return publicError(err, "Erro ao editar negociação.");
  }
}

export async function moveDealAction(input: MoveDealInput) {
  const ctx = await getWorkspaceContext("deals", "edit");
  if ("error" in ctx) return { error: ctx.error };

  const parsed = moveDealSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  try {
    const supabase = await createClient();
    await new MoveDealUseCase(repo(supabase)).execute(
      ctx.workspaceId,
      parsed.data.deal_id,
      parsed.data.stage_id,
      parsed.data.position,
    );
    return { success: true as const };
  } catch (err) {
    return publicError(err, "Erro ao mover negociação.");
  }
}

export async function closeDealAction(input: CloseDealInput) {
  const ctx = await getWorkspaceContext("deals", "edit");
  if ("error" in ctx) return { error: ctx.error };

  const parsed = closeDealSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos." };

  try {
    const supabase = await createClient();
    await new CloseDealUseCase(repo(supabase)).execute(ctx.workspaceId, parsed.data.deal_id, parsed.data.status);
    revalidatePath("/kanban");
    return { success: true as const };
  } catch (err) {
    return publicError(err, "Erro ao fechar negociação.");
  }
}

export async function archiveDealAction(dealId: string) {
  const ctx = await getWorkspaceContext("deals", "delete");
  if ("error" in ctx) return { error: ctx.error };

  if (!dealId || typeof dealId !== "string") return { error: "ID inválido." };

  try {
    const supabase = await createClient();
    await new ArchiveDealUseCase(repo(supabase)).execute(ctx.workspaceId, dealId);
    revalidatePath("/kanban");
    return { success: true as const };
  } catch (err) {
    return publicError(err, "Erro ao arquivar negociação.");
  }
}

export async function createDefaultPipelineAction() {
  const ctx = await getWorkspaceContext("settings", "edit");
  if ("error" in ctx) return { error: "Apenas administradores podem criar o funil." };

  try {
    const supabase = await createClient();
    const result = await new CreateDefaultPipelineUseCase(repo(supabase)).execute(ctx.workspaceId);
    revalidatePath("/kanban");
    return result;
  } catch (err) {
    return publicError(err, "Erro ao criar funil padrão.");
  }
}
