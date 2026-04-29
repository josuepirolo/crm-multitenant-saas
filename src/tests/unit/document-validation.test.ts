import { describe, it, expect } from "vitest";
import {
  validateCpf, validateCnpj, validateDocument,
  maskCpf, maskCnpj, maskDocument,
  stripDocument, documentType,
} from "@/lib/validations/document";

// ─── CPF ──────────────────────────────────────────────────────────────────────

describe("validateCpf", () => {
  it("aceita CPF válido", () => {
    expect(validateCpf("529.982.247-25")).toBe(true);
    expect(validateCpf("52998224725")).toBe(true);
  });

  it("rejeita CPF com dígito verificador errado", () => {
    expect(validateCpf("529.982.247-26")).toBe(false);
  });

  it("rejeita sequência repetida (111.111.111-11)", () => {
    expect(validateCpf("11111111111")).toBe(false);
    expect(validateCpf("00000000000")).toBe(false);
  });

  it("rejeita CPF com comprimento errado", () => {
    expect(validateCpf("1234567890")).toBe(false);
    expect(validateCpf("123456789012")).toBe(false);
  });
});

// ─── CNPJ ─────────────────────────────────────────────────────────────────────

describe("validateCnpj", () => {
  it("aceita CNPJ válido", () => {
    expect(validateCnpj("11.222.333/0001-81")).toBe(true);
    expect(validateCnpj("11222333000181")).toBe(true);
  });

  it("rejeita CNPJ com dígito verificador errado", () => {
    expect(validateCnpj("11.222.333/0001-82")).toBe(false);
  });

  it("rejeita sequência repetida (11.111.111/1111-11)", () => {
    expect(validateCnpj("11111111111111")).toBe(false);
    expect(validateCnpj("00000000000000")).toBe(false);
  });

  it("rejeita CNPJ com comprimento errado", () => {
    expect(validateCnpj("1122233300018")).toBe(false);
    expect(validateCnpj("112223330001810")).toBe(false);
  });
});

// ─── Auto-detecção ────────────────────────────────────────────────────────────

describe("validateDocument — auto-detect", () => {
  it("detecta CPF válido", () => {
    expect(validateDocument("529.982.247-25")).toBe(true);
  });

  it("detecta CNPJ válido", () => {
    expect(validateDocument("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita CPF inválido", () => {
    expect(validateDocument("529.982.247-26")).toBe(false);
  });

  it("rejeita CNPJ inválido", () => {
    expect(validateDocument("11.222.333/0001-82")).toBe(false);
  });

  it("rejeita comprimento diferente de 11 ou 14", () => {
    expect(validateDocument("12345")).toBe(false);
    expect(validateDocument("")).toBe(false);
  });
});

// ─── Máscaras ─────────────────────────────────────────────────────────────────

describe("maskCpf", () => {
  it("formata 11 dígitos", () => {
    expect(maskCpf("52998224725")).toBe("529.982.247-25");
  });

  it("formata parcialmente", () => {
    expect(maskCpf("529")).toBe("529");
    expect(maskCpf("52998")).toBe("529.98");
    expect(maskCpf("529982")).toBe("529.982");
  });
});

describe("maskCnpj", () => {
  it("formata 14 dígitos", () => {
    expect(maskCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("formata parcialmente", () => {
    expect(maskCnpj("11")).toBe("11");
    expect(maskCnpj("1122")).toBe("11.22");
    expect(maskCnpj("11222333")).toBe("11.222.333");
    expect(maskCnpj("112223330001")).toBe("11.222.333/0001");
  });
});

describe("maskDocument — auto", () => {
  it("usa máscara CPF para até 11 dígitos", () => {
    expect(maskDocument("52998224725")).toBe("529.982.247-25");
  });

  it("usa máscara CNPJ para mais de 11 dígitos", () => {
    expect(maskDocument("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("aceita entrada com máscara já aplicada (idempotente)", () => {
    expect(maskDocument("529.982.247-25")).toBe("529.982.247-25");
    expect(maskDocument("11.222.333/0001-81")).toBe("11.222.333/0001-81");
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

describe("stripDocument", () => {
  it("remove pontuação", () => {
    expect(stripDocument("529.982.247-25")).toBe("52998224725");
    expect(stripDocument("11.222.333/0001-81")).toBe("11222333000181");
  });
});

describe("documentType", () => {
  it("retorna cpf para 11 dígitos", () => {
    expect(documentType("52998224725")).toBe("cpf");
    expect(documentType("529.982.247-25")).toBe("cpf");
  });

  it("retorna cnpj para 14 dígitos", () => {
    expect(documentType("11222333000181")).toBe("cnpj");
  });

  it("retorna null para comprimento inválido", () => {
    expect(documentType("12345")).toBe(null);
    expect(documentType("")).toBe(null);
  });
});
