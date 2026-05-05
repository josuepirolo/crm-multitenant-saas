"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { SupabaseAutoSalesRepository } from "@/repositories/auto-sales.repository";
import {
  CreateInventoryItemUseCase,
  UpdateInventoryStatusUseCase,
  UpsertInventoryPricingUseCase,
  AddOptionalItemUseCase,
  RemoveOptionalItemUseCase,
  CreateProposalUseCase,
  UpdateProposalStatusUseCase,
} from "@/usecases/AutoSalesUseCases";
import { publicError } from "@/lib/security/security-errors";
import { z } from "zod";

function makeRepo() {
  return createClient().then(s => new SupabaseAutoSalesRepository(s));
}

const inventorySchema = z.object({
  model_id:         z.string().uuid(),
  color:            z.string().min(1),
  year_manufacture: z.coerce.number().int().min(1900),
  year_model:       z.coerce.number().int().min(1900),
  mileage_km:       z.coerce.number().int().nonnegative().default(0),
  trim:             z.string().optional(),
  plate:            z.string().optional(),
  fuel:             z.string().optional(),
  transmission:     z.string().optional(),
  condition:        z.enum(["new","used","certified"]).default("used"),
  has_sinistro:     z.coerce.boolean().default(false),
  has_cautelar_issue: z.coerce.boolean().default(false),
  accepts_trade_in: z.coerce.boolean().default(true),
  requires_down_pay: z.coerce.boolean().default(false),
  accepts_financing: z.coerce.boolean().default(true),
  notes:            z.string().optional(),
});

const pricingSchema = z.object({
  inventory_id:      z.string().uuid(),
  cost_price:        z.coerce.number().nonnegative(),
  offer_price:       z.coerce.number().nonnegative(),
  max_discount_price: z.coerce.number().nonnegative().nullable().optional(),
});

const proposalSchema = z.object({
  contact_id:               z.string().uuid().optional(),
  inventory_id:             z.string().uuid().optional(),
  trade_in_plate:           z.string().optional(),
  trade_in_model_id:        z.string().uuid().optional(),
  trade_in_year:            z.coerce.number().int().optional(),
  trade_in_mileage_km:      z.coerce.number().int().optional(),
  trade_in_estimated_value: z.coerce.number().nonnegative().optional(),
  final_price:              z.coerce.number().nonnegative().optional(),
  down_payment:             z.coerce.number().nonnegative().optional(),
  financing_months:         z.coerce.number().int().optional(),
  financing_institution:    z.string().optional(),
  notes:                    z.string().optional(),
  expires_at:               z.string().optional(),
});

export async function createInventoryItem(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "create");
  if ("error" in ctx) return ctx;

  const parsed = inventorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const repo = await makeRepo();
    const item = await new CreateInventoryItemUseCase(repo).execute({
      workspace_id: ctx.workspaceId,
      ...parsed.data,
    });
    revalidatePath("/auto-sales");
    return { error: undefined, item };
  } catch (err) {
    return publicError(err, "Erro ao cadastrar veículo.");
  }
}

export async function updateInventoryStatus(inventoryId: string, status: string) {
  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;
  try {
    const repo = await makeRepo();
    await new UpdateInventoryStatusUseCase(repo).execute(inventoryId, ctx.workspaceId, status as any);
    revalidatePath("/auto-sales");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao atualizar status.");
  }
}

export async function upsertInventoryPricing(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;

  const parsed = pricingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const repo = await makeRepo();
    await new UpsertInventoryPricingUseCase(repo).execute({
      ...parsed.data,
      max_discount_price: parsed.data.max_discount_price ?? null,
      workspace_id: ctx.workspaceId,
    });
    revalidatePath("/auto-sales");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao salvar precificação.");
  }
}

export async function addOptionalItem(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "create");
  if ("error" in ctx) return ctx;
  try {
    const repo = await makeRepo();
    await new AddOptionalItemUseCase(repo).execute({
      inventory_id: formData.get("inventory_id") as string,
      name:         formData.get("name") as string,
      price:        Number(formData.get("price") ?? 0),
      is_included:  formData.get("is_included") === "true",
    });
    revalidatePath("/auto-sales");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao adicionar item opcional.");
  }
}

export async function removeOptionalItem(id: string) {
  const ctx = await getWorkspaceContext("contacts", "delete");
  if ("error" in ctx) return ctx;
  try {
    const repo = await makeRepo();
    await new RemoveOptionalItemUseCase(repo).execute(id);
    revalidatePath("/auto-sales");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao remover item.");
  }
}

export async function createProposal(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "create");
  if ("error" in ctx) return ctx;

  const parsed = proposalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const repo = await makeRepo();
    const proposal = await new CreateProposalUseCase(repo).execute({
      workspace_id: ctx.workspaceId,
      ...parsed.data,
    });
    revalidatePath("/auto-sales/proposals");
    return { error: undefined, proposal };
  } catch (err) {
    return publicError(err, "Erro ao criar proposta.");
  }
}

export async function updateProposalStatus(proposalId: string, status: string) {
  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;
  try {
    const repo = await makeRepo();
    await new UpdateProposalStatusUseCase(repo).execute(proposalId, ctx.workspaceId, status as any);
    revalidatePath("/auto-sales/proposals");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao atualizar status.");
  }
}
