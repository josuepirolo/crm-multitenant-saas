"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SupabaseLeadRepository } from "@/repositories/lead.repository";
import { GetLeadsUseCase, CreateLeadUseCase, UpdateLeadUseCase, SoftDeleteLeadUseCase } from "@/usecases/LeadUseCases";
import { getCurrentWorkspaceId, requirePermission } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { contactSchema, toDigits, validateCPF, validateCNPJ } from "@/lib/validations/contact";
import type { LeadFilters } from "@/repositories/lead.repository";

// ─── normalização ────────────────────────────────────────────────────────────
function normalizeInput(raw: Record<string, string>) {
  return {
    ...raw,
    phone:    raw.phone    ? toDigits(raw.phone)    || undefined : undefined,
    email:    raw.email    ? raw.email.toLowerCase().trim() || undefined : undefined,
    document: raw.document ? toDigits(raw.document) || undefined : undefined,
  };
}

// ─── validação de documento no backend ───────────────────────────────────────
function validateDocument(personType: string, doc: string | undefined): string | null {
  if (!doc) return null;
  const digits = toDigits(doc);
  if (personType === "fisica")   return validateCPF(digits)  ? null : "CPF inválido.";
  if (personType === "juridica") return validateCNPJ(digits) ? null : "CNPJ inválido.";
  return null;
}

// ─── mapeamento de violação de unicidade ─────────────────────────────────────
function uniqueViolationMessage(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("idx_contacts_unique_phone"))    return "Já existe um contato ativo com este telefone.";
  if (msg.includes("idx_contacts_unique_email"))    return "Já existe um contato ativo com este e-mail.";
  if (msg.includes("idx_contacts_unique_document")) return "Já existe um contato ativo com este CPF/CNPJ.";
  return null;
}

// ─── actions ─────────────────────────────────────────────────────────────────

export async function getLeads(filters: LeadFilters, page: number, pageSize: number) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: "Workspace não encontrado.", data: [], total: 0 };

  try {
    const repo = new SupabaseLeadRepository(createAdminClient());
    const result = await new GetLeadsUseCase(repo).execute(workspaceId, filters, page, pageSize);
    return { error: undefined, data: result.data, total: result.total };
  } catch (err) {
    console.error("[getLeads]", err);
    return { error: "Erro ao buscar contatos.", data: [], total: 0 };
  }
}

export async function createLead(_: unknown, formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: "Workspace não encontrado." };

  const perm = await requirePermission(workspaceId, "contacts", "create");
  if (perm) return perm;

  const raw = normalizeInput(Object.fromEntries(formData) as Record<string, string>);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const docError = validateDocument(parsed.data.personType, parsed.data.document);
  if (docError) return { error: docError };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  try {
    const lead = await new CreateLeadUseCase(new SupabaseLeadRepository(createAdminClient())).execute({
      ...parsed.data,
      workspace_id: workspaceId,
      created_by: user?.id,
    });
    revalidatePath("/contacts");
    return { error: undefined, lead };
  } catch (err) {
    return { error: uniqueViolationMessage(err) ?? "Erro ao criar contato. Tente novamente." };
  }
}

export async function updateLead(_: unknown, formData: FormData) {
  const id = formData.get("id") as string;
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId || !id) return { error: "Dados inválidos." };

  const perm = await requirePermission(workspaceId, "contacts", "edit");
  if (perm) return perm;

  const raw = normalizeInput(Object.fromEntries(formData) as Record<string, string>);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const docError = validateDocument(parsed.data.personType, parsed.data.document);
  if (docError) return { error: docError };

  try {
    const lead = await new UpdateLeadUseCase(new SupabaseLeadRepository(createAdminClient())).execute(workspaceId, id, parsed.data);
    revalidatePath("/contacts");
    return { error: undefined, lead };
  } catch (err) {
    return { error: uniqueViolationMessage(err) ?? "Erro ao atualizar contato. Tente novamente." };
  }
}

export async function deleteLead(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: "Workspace não encontrado." };

  const perm = await requirePermission(workspaceId, "contacts", "delete");
  if (perm) return perm;

  try {
    await new SoftDeleteLeadUseCase(new SupabaseLeadRepository(createAdminClient())).execute(workspaceId, id);
    revalidatePath("/contacts");
    return { error: undefined };
  } catch {
    return { error: "Erro ao remover contato." };
  }
}
