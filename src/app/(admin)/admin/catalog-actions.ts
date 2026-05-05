"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/guards";
import { SupabaseVehicleCatalogRepository } from "@/repositories/vehicle-catalog.repository";
import {
  ListVehicleCategoriesUseCase,
  ListVehicleBrandsUseCase,
  ListVehicleModelsUseCase,
  CreateVehicleBrandUseCase,
  CreateVehicleModelUseCase,
} from "@/usecases/VehicleCatalogUseCases";
import { publicError } from "@/lib/security/security-errors";
import { z } from "zod";

function makeRepo() {
  return new SupabaseVehicleCatalogRepository(createAdminClient());
}

export async function listVehicleCatalog(brandId?: string, categoryId?: string) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado.", brands: [], models: [], categories: [] };
  try {
    const repo = makeRepo();
    const [brands, models, categories] = await Promise.all([
      new ListVehicleBrandsUseCase(repo).execute(),
      new ListVehicleModelsUseCase(repo).execute(brandId, categoryId),
      new ListVehicleCategoriesUseCase(repo).execute(),
    ]);
    return { error: undefined, brands, models, categories };
  } catch {
    return { error: "Erro ao buscar catálogo.", brands: [], models: [], categories: [] };
  }
}

const brandSchema = z.object({
  name:       z.string().min(1, "Nome é obrigatório"),
  slug:       z.string().optional(),
  sort_order: z.coerce.number().default(0),
});

const modelSchema = z.object({
  brand_id:    z.string().uuid("Marca inválida"),
  category_id: z.string().uuid("Categoria inválida"),
  name:        z.string().min(1, "Nome é obrigatório"),
  slug:        z.string().optional(),
  year_from:   z.coerce.number().int().optional(),
  year_to:     z.coerce.number().int().optional(),
  engine_cc:   z.coerce.number().int().optional(),
  notes:       z.string().optional(),
});

export async function createVehicleBrand(_: unknown, formData: FormData) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado." };

  const parsed = brandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const brand = await new CreateVehicleBrandUseCase(makeRepo()).execute(parsed.data);
    return { error: undefined, brand };
  } catch (err) {
    return publicError(err, "Erro ao criar marca.");
  }
}

export async function createVehicleModel(_: unknown, formData: FormData) {
  const sa = await requireSuperAdmin();
  if (!sa) return { error: "Acesso negado." };

  const parsed = modelSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const model = await new CreateVehicleModelUseCase(makeRepo()).execute(parsed.data);
    return { error: undefined, model };
  } catch (err) {
    return publicError(err, "Erro ao criar modelo.");
  }
}
