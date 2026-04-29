import { z } from "zod";
import { validateDocument, stripDocument } from "@/lib/validations/document";


export const updateWorkspaceSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres.").max(100, "Máximo 100 caracteres.").trim(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email("E-mail inválido.").toLowerCase().trim(),
  role: z.enum(["admin", "manager", "sales", "support"] as const, {
    error: "Função inválida.",
  }),
});

export const updateMemberRoleSchema = z.object({
  userId: z.string().uuid("ID inválido."),
  role: z.enum(["admin", "manager", "sales", "support"] as const, {
    error: "Função inválida.",
  }),
});

export type UpdateWorkspaceFormValues = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

export const updateWorkspaceProfileSchema = z.object({
  display_name:       z.string().trim().max(100).optional(),
  legal_name:         z.string().trim().max(200).optional(),
  document: z.string().trim().optional().refine(
    (v) => !v || stripDocument(v).length === 0 || validateDocument(v),
    { message: "CPF ou CNPJ inválido." }
  ),
  phone:              z.string().trim().max(20).optional(),
  email:              z.union([z.string().email("E-mail inválido.").toLowerCase().trim(), z.literal("")]).optional(),
  address_street:     z.string().trim().max(200).optional(),
  address_number:     z.string().trim().max(20).optional(),
  address_complement: z.string().trim().max(100).optional(),
  address_district:   z.string().trim().max(100).optional(),
  address_city:       z.string().trim().max(100).optional(),
  address_state:      z.string().trim().max(2).optional(),
  address_zipcode:    z.string().trim().max(9).optional(),
  address_country:    z.string().trim().max(2).optional(),
});

export type UpdateWorkspaceProfileValues = z.infer<typeof updateWorkspaceProfileSchema>;
