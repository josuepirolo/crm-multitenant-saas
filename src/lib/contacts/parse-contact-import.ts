import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import { contactSchema, toDigits, normalizeBrazilianPhone } from "@/lib/validations/contact";
import type { ContactImportRow, ContactStatus } from "@/types";

export const MAX_IMPORT_ROWS = 2000;

type RawField = "name" | "phone" | "email" | "document" | "company" | "status" | "notes" | "personType" | "source";

const HEADER_ALIASES: Record<string, RawField> = {
  nome: "name",
  name: "name",
  telefone: "phone",
  phone: "phone",
  celular: "phone",
  whatsapp: "phone",
  email: "email",
  "e-mail": "email",
  documento: "document",
  document: "document",
  cpf: "document",
  cnpj: "document",
  "cpf/cnpj": "document",
  empresa: "company",
  company: "company",
  status: "status",
  situacao: "status",
  observacoes: "notes",
  observacao: "notes",
  notes: "notes",
  obs: "notes",
  tipo: "personType",
  "tipo de pessoa": "personType",
  persontype: "personType",
  origem: "source",
  canal: "source",
  source: "source",
};

const STATUS_VALUES: ContactStatus[] = ["lead", "prospect", "customer", "churned"];
const JURIDICA_HINTS = ["juridica", "pj", "cnpj", "empresa"];
const FISICA_HINTS = ["fisica", "pf", "cpf", "pessoa"];

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

function normalizeHeader(value: string): string {
  return value.toLowerCase().trim().normalize("NFD").replace(DIACRITICS_REGEX, "");
}

function cellToString(value: ExcelJS.CellValue): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "object" && "text" in value) return String((value as { text: unknown }).text).trim() || undefined;
  if (typeof value === "object" && "result" in value) return String((value as { result: unknown }).result).trim() || undefined;
  const str = String(value).trim();
  return str || undefined;
}

function inferPersonType(documentDigits: string, rawHint?: string): "fisica" | "juridica" {
  const hint = normalizeHeader(rawHint ?? "");
  if (hint && JURIDICA_HINTS.includes(hint)) return "juridica";
  if (hint && FISICA_HINTS.includes(hint)) return "fisica";
  return documentDigits.length === 14 ? "juridica" : "fisica";
}

const PT_PREPS = new Set(["de", "da", "das", "do", "dos", "e", "em", "na", "nas", "no", "nos"]);

function toTitleCase(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word, i) => {
      const lower = word.toLowerCase();
      return i > 0 && PT_PREPS.has(lower)
        ? lower
        : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function normalizeStatus(raw?: string): ContactStatus | undefined {
  const value = normalizeHeader(raw ?? "");
  return (STATUS_VALUES as string[]).includes(value) ? (value as ContactStatus) : undefined;
}

async function loadWorksheet(buffer: Buffer, fileName: string): Promise<ExcelJS.Worksheet | undefined> {
  const workbook = new ExcelJS.Workbook();

  if (fileName.toLowerCase().endsWith(".csv")) {
    return workbook.csv.read(Readable.from(buffer));
  }
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook.worksheets[0];
}

export interface ImportPreviewResult {
  headers: string[];
  previewRows: string[][];
  hasOriginColumn: boolean;
  totalDataRows: number;
  error?: string;
}

const ORIGIN_HEADER_ALIASES = new Set(["origem", "canal", "source", "origin"]);

export async function extractImportPreview(buffer: Buffer, fileName: string): Promise<ImportPreviewResult> {
  let worksheet: ExcelJS.Worksheet | undefined;
  try {
    worksheet = await loadWorksheet(buffer, fileName);
  } catch {
    return { headers: [], previewRows: [], hasOriginColumn: false, totalDataRows: 0, error: "Não foi possível ler o arquivo." };
  }

  if (!worksheet || worksheet.rowCount < 2) {
    return { headers: [], previewRows: [], hasOriginColumn: false, totalDataRows: 0, error: "Planilha vazia ou sem linhas de dados." };
  }

  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell) => {
    headers.push(cellToString(cell.value) ?? "");
  });

  const hasOriginColumn = headers.some((h) => ORIGIN_HEADER_ALIASES.has(normalizeHeader(h)));
  const totalDataRows = Math.max(0, worksheet.rowCount - 1);

  const previewRows: string[][] = [];
  const maxDataRow = Math.min(worksheet.rowCount, 11);
  for (let r = 2; r <= maxDataRow; r++) {
    const row = worksheet.getRow(r);
    const cells = headers.map((_, colIdx) => cellToString(row.getCell(colIdx + 1).value) ?? "");
    if (cells.every((c) => c === "")) continue;
    previewRows.push(cells);
  }

  return { headers, previewRows, hasOriginColumn, totalDataRows };
}

export interface ParseImportFileResult {
  rows: ContactImportRow[];
  error?: string;
}

export async function parseContactImportFile(
  buffer: Buffer,
  fileName: string,
  options?: { offset?: number; limit?: number }
): Promise<ParseImportFileResult> {
  let worksheet: ExcelJS.Worksheet | undefined;
  try {
    worksheet = await loadWorksheet(buffer, fileName);
  } catch {
    return { rows: [], error: "Não foi possível ler o arquivo. Verifique o formato e tente novamente." };
  }

  if (!worksheet || worksheet.rowCount < 2) {
    return { rows: [], error: "Planilha vazia ou sem linhas de dados." };
  }

  const columnMap = new Map<number, RawField>();
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    const field = HEADER_ALIASES[normalizeHeader(cellToString(cell.value) ?? "")];
    if (field) columnMap.set(colNumber, field);
  });

  if (![...columnMap.values()].includes("name")) {
    return { rows: [], error: "Coluna obrigatória 'nome' não encontrada na planilha." };
  }

  const offset = options?.offset ?? 0;
  const limit  = options?.limit  ?? MAX_IMPORT_ROWS;
  const startRow = 2 + offset;
  const endRow   = Math.min(worksheet.rowCount, startRow + limit - 1);

  const rows: ContactImportRow[] = [];
  const seen = { phone: new Set<string>(), email: new Set<string>(), document: new Set<string>() };

  for (let r = startRow; r <= endRow; r++) {
    const row = worksheet.getRow(r);
    if (row.cellCount === 0) continue;

    const raw: Partial<Record<RawField, string>> = {};
    columnMap.forEach((field, colNumber) => {
      const value = cellToString(row.getCell(colNumber).value);
      if (value) raw[field] = value;
    });

    if (!raw.name && !raw.phone && !raw.email && !raw.document) continue;

    const documentDigits = raw.document ? toDigits(raw.document) : "";
    const candidate = {
      name: raw.name ? toTitleCase(raw.name) : "",
      personType: inferPersonType(documentDigits, raw.personType),
      document: documentDigits || undefined,
      phone: raw.phone ? normalizeBrazilianPhone(raw.phone) || undefined : undefined,
      email: raw.email ? raw.email.toLowerCase() : undefined,
      company: raw.company,
      status: normalizeStatus(raw.status) ?? "lead",
      notes: raw.notes,
    };

    // `source` é resolvido para `source_id` (FK) no servidor — não passa pelo
    // contactSchema, só é anexado ao dado bruto da linha após a validação.
    const parsed = contactSchema.safeParse(candidate);
    if (!parsed.success) {
      rows.push({ row: r, data: { ...candidate, source: raw.source }, status: "invalid", errors: parsed.error.issues.map((issue) => issue.message) });
      continue;
    }

    const dataWithSource = { ...parsed.data, source: raw.source };
    const { phone, email, document } = parsed.data;
    const isDuplicateInFile =
      (!!phone && seen.phone.has(phone)) ||
      (!!email && seen.email.has(email)) ||
      (!!document && seen.document.has(document));

    if (isDuplicateInFile) {
      rows.push({ row: r, data: dataWithSource, status: "duplicate", errors: ["Duplicado dentro da própria planilha"] });
      continue;
    }

    if (phone) seen.phone.add(phone);
    if (email) seen.email.add(email);
    if (document) seen.document.add(document);

    rows.push({ row: r, data: dataWithSource, status: "valid" });
  }

  return { rows };
}
