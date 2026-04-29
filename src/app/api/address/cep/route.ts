import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/client-ip";

// Cache de 1 h — CEP não muda; reduz chamadas externas ao ViaCEP
const VIACEP_CACHE: Map<string, { data: object; expiresAt: number }> = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("cep") ?? "";
  const cep = raw.replace(/\D/g, "");

  if (cep.length !== 8) {
    return NextResponse.json({ error: "CEP inválido." }, { status: 400 });
  }

  // Rate limit por IP: 60 consultas/hora (público, sem autenticação)
  const ip = await getClientIp();
  const allowed = await checkRateLimit(`cep:${ip}`, { windowMs: 60 * 60_000, max: 60 });
  if (!allowed) {
    return NextResponse.json({ error: "Muitas requisições. Tente novamente mais tarde." }, { status: 429 });
  }

  // Cache em memória (válido em ambiente serverless por instância)
  const cached = VIACEP_CACHE.get(cep);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ found: false });
    }

    const json = await res.json();

    if (json.erro) {
      return NextResponse.json({ found: false });
    }

    const payload = {
      found:       true,
      zipcode:     (json.cep      as string) ?? "",
      street:      (json.logradouro as string) ?? "",
      complement:  (json.complemento as string) ?? "",
      district:    (json.bairro   as string) ?? "",
      city:        (json.localidade as string) ?? "",
      state:       (json.uf       as string) ?? "",
      state_name:  (json.estado   as string) ?? "",
      region:      (json.regiao   as string) ?? "",
      ibge:        (json.ibge     as string) ?? "",
      ddd:         (json.ddd      as string) ?? "",
    };

    VIACEP_CACHE.set(cep, { data: payload, expiresAt: Date.now() + CACHE_TTL_MS });

    return NextResponse.json(payload);
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === "AbortError") {
      return NextResponse.json({ error: "Tempo limite ao consultar CEP." }, { status: 504 });
    }
    return NextResponse.json({ found: false });
  }
}
