"use server";

import { getWorkspaceContext, getScopedSupabaseClient } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { SupabaseAutoPartsRepository } from "@/repositories/auto-parts.repository";
import {
  CreateAutoPartsQuoteUseCase,
  AddQuoteItemUseCase,
  UpdateQuoteStatusUseCase,
  UpsertPartPricingUseCase,
} from "@/usecases/AutoPartsUseCases";
import { publicError } from "@/lib/security/security-errors";
import { z } from "zod";

function makeRepo() {
  return getScopedSupabaseClient().then(s => new SupabaseAutoPartsRepository(s));
}

const quoteItemSchema = z.object({
  part_id:         z.string().uuid().optional(),
  part_number_snap: z.string().min(1),
  name_snap:       z.string().min(1),
  color_snap:      z.string().optional(),
  unit_snap:       z.string().default("UN"),
  quantity:        z.coerce.number().positive(),
  unit_price:      z.coerce.number().nonnegative(),
});

const pricingSchema = z.object({
  part_id:    z.string().uuid(),
  cost_price: z.coerce.number().nonnegative(),
  sale_price: z.coerce.number().nonnegative(),
});

export async function createAutoPartsQuote(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "create");
  if ("error" in ctx) return ctx;
  try {
    const repo = await makeRepo();
    const quote = await new CreateAutoPartsQuoteUseCase(repo).execute({
      workspace_id: ctx.workspaceId,
      contact_id:   (formData.get("contact_id") as string) || undefined,
      notes:        (formData.get("notes") as string) || undefined,
      expires_at:   (formData.get("expires_at") as string) || undefined,
    });
    revalidatePath("/auto-parts/quotes");
    return { error: undefined, quote };
  } catch (err) {
    return publicError(err, "Erro ao criar orçamento.");
  }
}

export async function addQuoteItem(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "create");
  if ("error" in ctx) return ctx;

  const raw = Object.fromEntries(formData);
  const parsed = quoteItemSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const repo = await makeRepo();
    const item = await new AddQuoteItemUseCase(repo).execute({
      quote_id: formData.get("quote_id") as string,
      ...parsed.data,
    });
    revalidatePath("/auto-parts/quotes");
    return { error: undefined, item };
  } catch (err) {
    return publicError(err, "Erro ao adicionar item.");
  }
}

export async function updateQuoteStatus(quoteId: string, status: string) {
  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;
  try {
    const repo = await makeRepo();
    await new UpdateQuoteStatusUseCase(repo).execute(quoteId, ctx.workspaceId, status as any);
    revalidatePath("/auto-parts/quotes");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao atualizar status.");
  }
}

export async function upsertPartPricing(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;

  const parsed = pricingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const repo = await makeRepo();
    await new UpsertPartPricingUseCase(repo).execute({
      ...parsed.data,
      workspace_id: ctx.workspaceId,
    });
    revalidatePath("/auto-parts");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao salvar precificação.");
  }
}
