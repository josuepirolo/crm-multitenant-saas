"use server";

import { getWorkspaceContext, getScopedSupabaseClient } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { SupabaseFashionRepository } from "@/repositories/fashion.repository";
import {
  CreateFashionProductUseCase,
  UpdateFashionProductUseCase,
  ToggleFashionProductActiveUseCase,
  AddFashionVariantUseCase,
  UpsertVariantPricingUseCase,
  UpdateVariantStockUseCase,
} from "@/usecases/FashionUseCases";
import { publicError } from "@/lib/security/security-errors";
import { z } from "zod";

function makeRepo() {
  return getScopedSupabaseClient().then(s => new SupabaseFashionRepository(s));
}

const productSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
  category:    z.string().min(1),
  gender:      z.enum(["feminino","masculino","infantil","unissex"]).default("feminino"),
  brand:       z.string().optional(),
});

const variantSchema = z.object({
  product_id: z.string().uuid(),
  color:      z.string().min(1),
  size:       z.string().min(1),
  sku:        z.string().min(1),
});

const pricingSchema = z.object({
  variant_id:  z.string().uuid(),
  cost_price:  z.coerce.number().nonnegative(),
  sale_price:  z.coerce.number().nonnegative(),
});

export async function createFashionProduct(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "create");
  if ("error" in ctx) return ctx;

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const repo = await makeRepo();
    const product = await new CreateFashionProductUseCase(repo).execute({
      workspace_id: ctx.workspaceId,
      ...parsed.data,
    });
    revalidatePath("/fashion");
    return { error: undefined, product };
  } catch (err) {
    return publicError(err, "Erro ao criar produto.");
  }
}

export async function updateFashionProduct(id: string, _: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;

  const parsed = productSchema.partial().safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const repo = await makeRepo();
    await new UpdateFashionProductUseCase(repo).execute(id, ctx.workspaceId, parsed.data);
    revalidatePath("/fashion");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao atualizar produto.");
  }
}

export async function toggleFashionProductActive(id: string, active: boolean) {
  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;
  try {
    const repo = await makeRepo();
    await new ToggleFashionProductActiveUseCase(repo).execute(id, ctx.workspaceId, active);
    revalidatePath("/fashion");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao atualizar produto.");
  }
}

export async function addFashionVariant(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "create");
  if ("error" in ctx) return ctx;

  const parsed = variantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const repo = await makeRepo();
    const variant = await new AddFashionVariantUseCase(repo).execute(parsed.data);
    revalidatePath("/fashion");
    return { error: undefined, variant };
  } catch (err) {
    return publicError(err, "Erro ao adicionar variante.");
  }
}

export async function upsertVariantPricing(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;

  const parsed = pricingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const repo = await makeRepo();
    await new UpsertVariantPricingUseCase(repo).execute({
      ...parsed.data,
      workspace_id: ctx.workspaceId,
    });
    revalidatePath("/fashion");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao salvar precificação.");
  }
}

export async function updateVariantStock(variantId: string, quantity: number) {
  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;
  try {
    const repo = await makeRepo();
    await new UpdateVariantStockUseCase(repo).execute(variantId, ctx.workspaceId, quantity);
    revalidatePath("/fashion/stock");
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao atualizar estoque.");
  }
}
