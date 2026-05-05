"use server";

import { createClient } from "@/lib/supabase/server";
import { getWorkspaceContext } from "@/lib/guards";
import { publicError } from "@/lib/security/security-errors";
import { z } from "zod";

const autoPartsProfileSchema = z.object({
  contact_id:   z.string().uuid(),
  company_type: z.string().optional(),
  fleet_size:   z.coerce.number().int().nonnegative().optional(),
  segment:      z.enum(["heavy","light","agro","moto"]).optional(),
  notes:        z.string().optional(),
});

const fashionProfileSchema = z.object({
  contact_id:  z.string().uuid(),
  shirt_size:  z.string().optional(),
  pants_size:  z.string().optional(),
  shoe_size:   z.string().optional(),
  notes:       z.string().optional(),
});

export async function upsertAutoPartsProfile(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;

  const parsed = autoPartsProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("contact_profiles_auto_parts")
      .upsert({ ...parsed.data, workspace_id: ctx.workspaceId }, { onConflict: "contact_id" });
    if (error) throw new Error(error.message);
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao salvar perfil.");
  }
}

export async function upsertFashionProfile(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;

  const parsed = fashionProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("contact_profiles_fashion")
      .upsert({ ...parsed.data, workspace_id: ctx.workspaceId }, { onConflict: "contact_id" });
    if (error) throw new Error(error.message);
    return { error: undefined };
  } catch (err) {
    return publicError(err, "Erro ao salvar perfil.");
  }
}
