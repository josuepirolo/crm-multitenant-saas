import { z } from "zod";

export const linkWorkspaceIntegrationSchema = z.object({
  wa_tenant_id: z.string().uuid("Selecione uma instância WA."),
  provider_id: z.string().min(1, "Selecione um provider."),
  integration_type: z.literal("whatsapp").default("whatsapp"),
  label: z.string().trim().max(60, "Máximo 60 caracteres.").optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "pending"] as const, {
    error: "Status inválido.",
  }).default("pending"),
});

export const updateWorkspaceIntegrationSchema = z.object({
  label: z.string().trim().max(60, "Máximo 60 caracteres.").optional().or(z.literal("")),
  status: z.enum(["active", "inactive", "pending"] as const, {
    error: "Status inválido.",
  }).optional(),
  provider_id: z.string().min(1, "Selecione um provider.").optional(),
});

export type LinkWorkspaceIntegrationFormValues = z.infer<typeof linkWorkspaceIntegrationSchema>;
export type UpdateWorkspaceIntegrationFormValues = z.infer<typeof updateWorkspaceIntegrationSchema>;
