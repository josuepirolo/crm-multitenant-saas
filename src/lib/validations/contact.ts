import { z } from "zod";

// ─── normalização ────────────────────────────────────────────────────────────
export const toDigits = (v: string) => v.replace(/[^0-9]/g, "");

export function normalizePhone(v: string): string {
  // Preserva E.164: +5544998094320 → 5544998094320 (dígitos)
  return toDigits(v);
}

// ─── CPF ─────────────────────────────────────────────────────────────────────
export function validateCPF(value: string): boolean {
  const d = toDigits(value);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +d[i] * (10 - i);
  let r = (sum * 10) % 11;
  if (r >= 10) r = 0;
  if (r !== +d[9]) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += +d[i] * (11 - i);
  r = (sum * 10) % 11;
  if (r >= 10) r = 0;
  return r === +d[10];
}

// ─── CNPJ ────────────────────────────────────────────────────────────────────
export function validateCNPJ(value: string): boolean {
  const d = toDigits(value);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (len: number) => {
    let sum = 0, pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += +d[len - i] * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === +d[12] && calc(13) === +d[13];
}

// ─── máscaras ────────────────────────────────────────────────────────────────
export function maskCPF(v: string): string {
  const d = toDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function maskCNPJ(v: string): string {
  const d = toDigits(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

// ─── schema Zod compartilhado ─────────────────────────────────────────────────
export const contactSchema = z.object({
  name:       z.string().min(2, "Mínimo 2 caracteres"),
  personType: z.enum(["fisica", "juridica"]),
  document:   z.string().optional().or(z.literal("")),
  phone:      z.string().optional().or(z.literal("")),
  email:      z.string().email("E-mail inválido").optional().or(z.literal("")),
  company:    z.string().optional(),
  status:     z.enum(["lead", "prospect", "customer", "churned"]),
  notes:      z.string().optional(),
}).superRefine((data, ctx) => {
  const doc = toDigits(data.document ?? "");
  if (doc) {
    if (data.personType === "fisica" && !validateCPF(doc)) {
      ctx.addIssue({ code: "custom", path: ["document"], message: "CPF inválido" });
    }
    if (data.personType === "juridica" && !validateCNPJ(doc)) {
      ctx.addIssue({ code: "custom", path: ["document"], message: "CNPJ inválido" });
    }
  }
  // Telefone: E.164 mínimo (7 a 15 dígitos com DDI)
  const phone = toDigits(data.phone ?? "");
  if (phone && (phone.length < 7 || phone.length > 15)) {
    ctx.addIssue({ code: "custom", path: ["phone"], message: "Telefone inválido" });
  }
});

export type ContactFormValues = z.infer<typeof contactSchema>;
