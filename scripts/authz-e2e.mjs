#!/usr/bin/env node
/**
 * e2e §5.4 — valida o claim `authz` emitido pelo Custom Access Token Hook (ADR-007).
 *
 * Faz login real (grant_type=password) com as credenciais de um usuário de teste,
 * decodifica o access token e confere o claim `https://lekazis.app/authz`:
 *   - v === 1, superadmin coerente, e perms `integration.whatsapp.*` por papel.
 * Opcionalmente prova o gate do backend WA com uma LEITURA segura (GET instances).
 *
 * Segurança: NUNCA imprime o access token (é segredo). Só imprime o claim authz,
 * que carrega apenas papéis/permissões (não sensível).
 *
 * Pré-requisitos:
 *   - Node 18+ (fetch global) — testado em v22.
 *   - Hook habilitado em Supabase → Authentication → Hooks → Custom Access Token.
 *   - Usuário de teste com senha conhecida e papel conhecido no workspace.
 *
 * Uso:
 *   node scripts/authz-e2e.mjs <email> <senha> [papelEsperado] [tenantId]
 *
 * Exemplos:
 *   node scripts/authz-e2e.mjs admin@ex.com 'senha' admin
 *   node scripts/authz-e2e.mjs sales@ex.com 'senha' sales 550e8400-...   # + gate de leitura no WA
 *
 * Lê NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / WA_BACKEND_URL
 * de .env.local (ou do ambiente).
 */

import { readFileSync } from "node:fs";

function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in env)) env[m[1]] = m[2];
    }
  } catch { /* sem .env.local — usa só o ambiente */ }
  return env;
}

function decodeJwtPayload(jwt) {
  const part = jwt.split(".")[1];
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

const EXPECT = {
  owner:   { "connection:view": true,  "instance:manage": true,  "account:edit": true,  read: true  },
  admin:   { "connection:view": true,  "instance:manage": true,  "account:edit": true,  read: true  },
  manager: { "connection:view": true,  "instance:manage": false, "account:edit": false, read: true  },
  sales:   { "connection:view": false, "instance:manage": false, "account:edit": false, read: false },
  support: { "connection:view": false, "instance:manage": false, "account:edit": false, read: false },
};

const [email, password, expectedRole, tenantId] = process.argv.slice(2);
if (!email || !password) {
  console.error("uso: node scripts/authz-e2e.mjs <email> <senha> [papelEsperado] [tenantId]");
  process.exit(2);
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const WA = env.WA_BACKEND_URL;
if (!SUPABASE_URL || !ANON) {
  console.error("faltando NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local ou env)");
  process.exit(2);
}

const fails = [];

// 1) login real → access token
const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { "Content-Type": "application/json", apikey: ANON },
  body: JSON.stringify({ email, password }),
});
if (!loginRes.ok) {
  console.error(`❌ login falhou (${loginRes.status}). Confira email/senha do usuário de teste.`);
  process.exit(1);
}
const token = (await loginRes.json()).access_token;

// 2) claim authz
const payload = decodeJwtPayload(token);
const authz = payload["https://lekazis.app/authz"];

console.log(`\n# usuário: ${email}${expectedRole ? ` (papel esperado: ${expectedRole})` : ""}`);
if (!authz) {
  console.error("❌ claim `authz` AUSENTE no token. O hook está habilitado em Auth → Hooks → Custom Access Token?");
  process.exit(1);
}
console.log("claim authz:\n" + JSON.stringify(authz, null, 2));

if (authz.v !== 1) fails.push(`v esperado 1, veio ${authz.v}`);
if (typeof authz.superadmin !== "boolean") fails.push("superadmin ausente/!boolean");

const wsIds = Object.keys(authz.workspaces ?? {});
let entry = null;
if (expectedRole) {
  if (wsIds.length === 0) {
    fails.push("nenhum workspace no claim (usuário sem membership ativo?)");
  } else {
    entry = authz.workspaces[wsIds[0]];
    if (entry.role !== expectedRole) fails.push(`papel: esperado ${expectedRole}, veio ${entry.role}`);
    const perms = entry.perms ?? [];
    const has = (k) => perms.includes(`integration.whatsapp.${k}`);
    const exp = EXPECT[expectedRole];
    if (exp) {
      for (const k of ["connection:view", "instance:manage", "account:edit"]) {
        if (has(k) !== exp[k]) fails.push(`perms ${k}: esperado ${exp[k]}, veio ${has(k)}`);
      }
    }
  }
}

// 3) (opcional) gate de LEITURA no backend WA — seguro, sem efeito colateral
if (tenantId) {
  if (!WA) {
    fails.push("WA_BACKEND_URL ausente — não dá para provar o gate do backend");
  } else {
    const waRes = await fetch(`${WA.replace(/\/+$/, "")}/management/tenants/${tenantId}/instances`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const expectRead = expectedRole ? EXPECT[expectedRole]?.read : undefined;
    console.log(`\nGET /management/tenants/${tenantId}/instances → HTTP ${waRes.status}`);
    if (expectRead === true && waRes.status !== 200) {
      fails.push(`leitura WA: esperado 200 para ${expectedRole}, veio ${waRes.status}`);
    }
    if (expectRead === false && waRes.status !== 403) {
      fails.push(`leitura WA: esperado 403 para ${expectedRole}, veio ${waRes.status}`);
    }
    console.log("  (binding: se este tenant for de OUTRO workspace, espere 403/404 mesmo para owner/admin)");
  }
}

console.log("");
if (fails.length) {
  console.error("❌ FALHOU:\n  - " + fails.join("\n  - "));
  process.exit(1);
}
console.log("✅ OK" + (expectedRole ? ` — claim coerente para papel ${expectedRole}` : "") +
  (tenantId ? " + gate de leitura do backend WA coerente" : ""));
