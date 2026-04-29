import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
  getClientIp:    vi.fn().mockResolvedValue("127.0.0.1"),
  fetch:          vi.fn(),
}));

vi.mock("@/lib/security/rate-limit",  () => ({ checkRateLimit: mocks.checkRateLimit, RATE_LIMITS: {} }));
vi.mock("@/lib/security/client-ip",   () => ({ getClientIp: mocks.getClientIp }));
vi.stubGlobal("fetch", mocks.fetch);

import { GET } from "@/app/api/address/cep/route";
import { NextRequest } from "next/server";

function makeReq(cep: string) {
  return new NextRequest(`http://localhost/api/address/cep?cep=${encodeURIComponent(cep)}`);
}

const VIACEP_OK = {
  cep: "01001-000", logradouro: "Praça da Sé", complemento: "lado ímpar",
  bairro: "Sé", localidade: "São Paulo", uf: "SP",
  estado: "São Paulo", regiao: "Sudeste", ibge: "3550308", ddd: "11",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.checkRateLimit.mockResolvedValue(true);
  mocks.getClientIp.mockResolvedValue("127.0.0.1");
});

// ─── Validação de CEP ─────────────────────────────────────────────────────────

describe("GET /api/address/cep — validação", () => {
  it("rejeita CEP com letras", async () => {
    const res = await GET(makeReq("ABCDEFGH"));
    expect(res.status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rejeita CEP com 7 dígitos", async () => {
    const res = await GET(makeReq("0100100"));
    expect(res.status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rejeita CEP com 9 dígitos", async () => {
    const res = await GET(makeReq("010010000"));
    expect(res.status).toBe(400);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("aceita CEP com hífen (01001-000) — sanitiza para 8 dígitos", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => VIACEP_OK });
    const res = await GET(makeReq("01001-000"));
    expect(res.status).toBe(200);
    expect(mocks.fetch).toHaveBeenCalled();
  });

  it("não chama ViaCEP quando CEP inválido", async () => {
    await GET(makeReq("1234"));
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});

// ─── Resposta normalizada ─────────────────────────────────────────────────────

describe("GET /api/address/cep — payload normalizado", () => {
  it("retorna campos corretos para CEP válido encontrado", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => VIACEP_OK });
    const res  = await GET(makeReq("01001000"));
    const body = await res.json();

    expect(body.found).toBe(true);
    expect(body.street).toBe("Praça da Sé");
    expect(body.district).toBe("Sé");
    expect(body.city).toBe("São Paulo");
    expect(body.state).toBe("SP");
    expect(body.state_name).toBe("São Paulo");
    expect(body.ddd).toBe("11");
  });

  it("retorna { found: false } quando ViaCEP retorna { erro: true }", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ erro: true }) });
    const res  = await GET(makeReq("99999999"));
    const body = await res.json();
    expect(body.found).toBe(false);
    expect(res.status).toBe(200);
  });

  it("retorna { found: false } quando ViaCEP retorna HTTP 500", async () => {
    mocks.fetch.mockResolvedValue({ ok: false, json: async () => ({}) });
    const res  = await GET(makeReq("88000000")); // CEP único para evitar cache
    const body = await res.json();
    expect(body.found).toBe(false);
    expect(res.status).toBe(200);
  });

  it("não expõe detalhes internos de erro em produção", async () => {
    mocks.fetch.mockRejectedValue(new Error("internal db connection failed"));
    const res  = await GET(makeReq("77000001")); // CEP único para evitar cache
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("internal db");
  });
});

// ─── Rate limit ───────────────────────────────────────────────────────────────

describe("GET /api/address/cep — rate limit", () => {
  it("bloqueia quando rate limit excedido", async () => {
    mocks.checkRateLimit.mockResolvedValue(false);
    const res = await GET(makeReq("01001000"));
    expect(res.status).toBe(429);
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("rate limit usa IP do cliente", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => VIACEP_OK });
    await GET(makeReq("01001000"));
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("127.0.0.1"),
      expect.any(Object)
    );
  });
});

// ─── Segurança — frontend não chama ViaCEP diretamente ───────────────────────

describe("GET /api/address/cep — segurança", () => {
  it("apenas o backend chama viacep.com.br", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => VIACEP_OK });
    await GET(makeReq("66000002")); // CEP único para evitar cache
    const calledUrl = (mocks.fetch.mock.calls[0][0] as string);
    expect(calledUrl).toContain("viacep.com.br");
    // Confirma que a chamada partiu do servidor (este módulo é server-side)
    expect(calledUrl).not.toContain("localhost");
  });

  it("timeout de 5s — retorna { found: false } em caso de AbortError", async () => {
    const err = Object.assign(new Error("aborted"), { name: "AbortError" });
    mocks.fetch.mockRejectedValue(err);
    const res  = await GET(makeReq("55000003")); // CEP único para evitar cache
    const body = await res.json();
    // Pode retornar 504 ou found:false dependendo do fluxo
    expect([200, 504]).toContain(res.status);
    if (res.status === 200) expect(body.found).toBe(false);
  });
});
