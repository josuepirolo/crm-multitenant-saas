"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SupabaseContactRepository } from "@/repositories/contact.repository";
import { GetContactsUseCase, CreateContactUseCase, UpdateContactUseCase, SoftDeleteContactUseCase } from "@/usecases/ContactUseCases";
import { getCurrentWorkspaceId, getWorkspaceContext } from "@/lib/guards";
import { revalidatePath } from "next/cache";
import { contactSchema, toDigits, validateCPF, validateCNPJ } from "@/lib/validations/contact";
import type { ContactFilters } from "@/repositories/contact.repository";

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
function uniqueViolationMessage(err: unknown, empresa?: string): string | null {
  const suffix = empresa ? ` na empresa ${empresa}` : ".";
  const end = (base: string) => empresa ? `${base}${suffix}.` : base;
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("idx_contacts_unique_phone") || msg.includes("unique_phone"))    return end("Já existe um contato ativo com este telefone");
  if (msg.includes("idx_contacts_unique_email") || msg.includes("unique_email"))    return end("Já existe um contato ativo com este e-mail");
  if (msg.includes("idx_contacts_unique_document") || msg.includes("unique_document")) return end("Já existe um contato ativo com este CPF/CNPJ");
  if (msg.startsWith("Já existe um contato")) return msg.replace("neste workspace", empresa ? `na empresa ${empresa}` : "nesta empresa");
  return null;
}

// ─── actions ─────────────────────────────────────────────────────────────────

export async function getContacts(filters: ContactFilters, page: number, pageSize: number) {
  const supabase = await createClient();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: "Workspace não encontrado.", data: [], total: 0 };

  try {
    const repo = new SupabaseContactRepository(supabase);
    const result = await new GetContactsUseCase(repo).execute(workspaceId, filters, page, pageSize);
    return { error: undefined, data: result.data, total: result.total };
  } catch (err) {
    console.error("[getContacts]", err);
    return { error: "Erro ao buscar contatos.", data: [], total: 0 };
  }
}

export async function createContact(_: unknown, formData: FormData) {
  const ctx = await getWorkspaceContext("contacts", "create");
  if ("error" in ctx) return ctx;

  const raw = normalizeInput(Object.fromEntries(formData) as Record<string, string>);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const docError = validateDocument(parsed.data.personType, parsed.data.document);
  if (docError) return { error: docError };

  const admin = createAdminClient();
  const { data: ws } = await admin.from("workspaces").select("name").eq("id", ctx.workspaceId).single();
  const empresaNome = ws?.name as string | undefined;

  try {
    const contact = await new CreateContactUseCase(new SupabaseContactRepository(admin)).execute({
      ...parsed.data,
      workspace_id: ctx.workspaceId,
      created_by: ctx.userId,
    });
    revalidatePath("/contacts");
    return { error: undefined, contact };
  } catch (err) {
    return { error: uniqueViolationMessage(err, empresaNome) ?? "Erro ao criar contato. Tente novamente." };
  }
}

export async function updateContact(_: unknown, formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return { error: "Dados inválidos." };

  const ctx = await getWorkspaceContext("contacts", "edit");
  if ("error" in ctx) return ctx;

  const raw = normalizeInput(Object.fromEntries(formData) as Record<string, string>);
  const parsed = contactSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const docError = validateDocument(parsed.data.personType, parsed.data.document);
  if (docError) return { error: docError };

  try {
    const contact = await new UpdateContactUseCase(new SupabaseContactRepository(createAdminClient())).execute(ctx.workspaceId, id, parsed.data);
    revalidatePath("/contacts");
    return { error: undefined, contact };
  } catch (err) {
    return { error: uniqueViolationMessage(err) ?? "Erro ao atualizar contato. Tente novamente." };
  }
}

export async function deleteContact(id: string) {
  const ctx = await getWorkspaceContext("contacts", "delete");
  if ("error" in ctx) return ctx;

  try {
    await new SoftDeleteContactUseCase(new SupabaseContactRepository(createAdminClient())).execute(ctx.workspaceId, id);
    revalidatePath("/contacts");
    return { error: undefined };
  } catch {
    return { error: "Erro ao remover contato." };
  }
}
