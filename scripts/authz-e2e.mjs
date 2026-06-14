#!/usr/bin/env node
/**
 * e2e §5.4 — valida o claim `authz` emitido pelo Custom Access Token Hook (ADR-007).
 *
 * Modo senha (Turnstile no password-grant — precisa captcha no login real do app):
 *   node scripts/authz-e2e.mjs <email> <senha> [papelEsperado] [tenantId] [workspaceId]
 *
 * Modo admin (sem captcha — generate_link → verify; requer service_role):
 *   node scripts/authz-e2e.mjs --admin <email> [papelEsperado] [tenantId] [workspaceId]
 *
 * Segurança: NUNCA imprime o access token. Só imprime o claim authz (papéis/perms).
 *
 * Lê NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY /
 * WA_BACKEND_URL de .env.local (ou do ambiente).
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

const argv = process.argv.slice(2);
const adminMode = argv[0] === "--admin";
if (adminMode) argv.shift();

const email = argv[0];
const passwordOrRole = argv[1];
const maybeRole = argv[2];
const maybeTenant = argv[3];
const maybeWorkspace = argv[4];

let password;
let expectedRole;
let tenantId;
let workspaceId;

if (adminMode) {
  if (!email) {
    console.error("uso: node scripts/authz-e2e.mjs --admin <email> [papelEsperado] [tenantId] [workspaceId]");
    process.exit(2);
  }
  expectedRole = passwordOrRole && EXPECT[passwordOrRole] ? passwordOrRole : undefined;
  tenantId = expectedRole ? maybeRole : passwordOrRole;
  workspaceId = expectedRole ? maybeTenant : maybeRole;
  if (expectedRole && maybeWorkspace) workspaceId = maybeWorkspace;
} else {
  password = passwordOrRole;
  expectedRole = maybeRole && EXPECT[maybeRole] ? maybeRole : undefined;
  tenantId = expectedRole ? maybeTenant : maybeRole;
  workspaceId = expectedRole ? maybeWorkspace : maybeTenant;
  if (!email || !password) {
    console.error("uso: node scripts/authz-e2e.mjs <email> <senha> [papelEsperado] [tenantId] [workspaceId]");
    console.error("     node scripts/authz-e2e.mjs --admin <email> [papelEsperado] [tenantId] [workspaceId]");
    process.exit(2);
  }
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SR = env.SUPABASE_SERVICE_ROLE_KEY;
const WA = env.WA_BACKEND_URL;
if (!SUPABASE_URL || !ANON) {
  console.error("faltando NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local ou env)");
  process.exit(2);
}
if (adminMode && !SR) {
  console.error("modo --admin requer SUPABASE_SERVICE_ROLE_KEY (.env.local ou env)");
  process.exit(2);
}

const fails = [];
let token;

if (adminMode) {
  const adminH = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json" };
  const gl = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: adminH,
    body: JSON.stringify({ type: "magiclink", email }),
  });
  const glb = await gl.json();
  const hashed = glb.hashed_token ?? glb.properties?.hashed_token;
  if (!gl.ok || !hashed) {
    console.error(`❌ generate_link falhou (${gl.status}):`, JSON.stringify(glb).slice(0, 200));
    process.exit(1);
  }
  const vr = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "magiclink", token_hash: hashed }),
  });
  const vrb = await vr.json();
  if (!vr.ok || !vrb.access_token) {
    console.error(`❌ verify falhou (${vr.status}):`, JSON.stringify(vrb).slice(0, 200));
    process.exit(1);
  }
  token = vrb.access_token;
  console.log(`\n# modo: --admin (sem captcha)`);
} else {
  const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify({ email, password }),
  });
  if (!loginRes.ok) {
    const body = await loginRes.text();
    console.error(`❌ login falhou (${loginRes.status}). Turnstile bloqueia password-grant — use --admin.`);
    if (body.includes("captcha")) console.error("   (captcha_failed — esperado sem captchaToken)");
    process.exit(1);
  }
  token = (await loginRes.json()).access_token;
}

const payload = decodeJwtPayload(token);
const authz = payload["https://lekazis.app/authz"];

console.log(`# usuário: ${email}${expectedRole ? ` (papel esperado: ${expectedRole})` : ""}`);
if (!authz) {
  console.error("❌ claim `authz` AUSENTE no token. O hook está habilitado em Auth → Hooks → Custom Access Token?");
  process.exit(1);
}
console.log("claim authz:\n" + JSON.stringify(authz, null, 2));

if (authz.v !== 1) fails.push(`v esperado 1, veio ${authz.v}`);
if (typeof authz.superadmin !== "boolean") fails.push("superadmin ausente/!boolean");

const workspaces = authz.workspaces ?? {};
const wsIds = Object.keys(workspaces);
let entry = null;

if (expectedRole) {
  if (wsIds.length === 0) {
    fails.push("nenhum workspace no claim (usuário sem membership ativo?)");
  } else {
    let wsId = workspaceId;
    if (!wsId) {
      wsId = wsIds.find((id) => workspaces[id].role === expectedRole) ?? wsIds[0];
    }
    if (!workspaces[wsId]) {
      fails.push(`workspace ${wsId} ausente no claim (disponíveis: ${wsIds.join(", ")})`);
    } else {
      entry = workspaces[wsId];
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
}

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
