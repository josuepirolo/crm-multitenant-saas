#!/usr/bin/env node

/**
 * Migration runner — executa migrations pendentes no Supabase remoto.
 * Uso: node supabase/migrate.mjs
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("❌  Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// ── Bootstrap: tabela de controle de migrations ──────────
async function bootstrap() {
  const { error } = await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        name       TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  });

  // Se a função exec_sql não existe ainda, cria via REST direto
  if (error?.message?.includes("exec_sql")) {
    await createExecSqlFunction();
    await bootstrap();
  }
}

async function createExecSqlFunction() {
  // Usa o endpoint de SQL do Supabase Management API
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
    body: JSON.stringify({ sql: "SELECT 1" }),
  });

  if (!res.ok) {
    // Precisa criar a função exec_sql primeiro via SQL Editor manual
    console.warn("⚠️  Criando função exec_sql no banco...");
    await seedExecSqlFunction();
  }
}

async function seedExecSqlFunction() {
  const res = await fetch(
    `${SUPABASE_URL.replace("supabase.co", "supabase.co")}/rest/v1/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        Prefer: "return=minimal",
      },
    }
  );
  // Fallback: instrui o usuário a criar manualmente
  console.log(`
📋  Execute este SQL no Supabase SQL Editor UMA VEZ para habilitar o runner:

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

  `);
  process.exit(0);
}

// ── Lê migrations aplicadas ──────────────────────────────
async function getApplied() {
  const { data, error } = await supabase
    .from("_migrations")
    .select("name")
    .order("id");

  if (error) return [];
  return data.map((r) => r.name);
}

// ── Executa um arquivo SQL via RPC ───────────────────────
async function runMigration(name, sql) {
  console.log(`\n⏳  Aplicando: ${name}`);

  const { error } = await supabase.rpc("exec_sql", { sql });

  if (error) {
    console.error(`❌  Falhou: ${error.message}`);
    process.exit(1);
  }

  await supabase.from("_migrations").insert({ name });
  console.log(`✅  Aplicada: ${name}`);
}

// ── Main ─────────────────────────────────────────────────
async function main() {
  console.log("🚀  Migration runner iniciado\n");

  await bootstrap();

  const applied = await getApplied();
  const migrationsDir = join(__dirname, "migrations");

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pending = files.filter((f) => !applied.includes(f));

  if (pending.length === 0) {
    console.log("✨  Nenhuma migration pendente.");
    return;
  }

  console.log(`📦  ${pending.length} migration(s) pendente(s):`);
  pending.forEach((f) => console.log(`    • ${f}`));

  for (const file of pending) {
    const sql = readFileSync(join(migrationsDir, file), "utf-8");
    await runMigration(file, sql);
  }

  console.log("\n🎉  Todas as migrations aplicadas com sucesso!");
}

main().catch((err) => {
  console.error("❌ ", err.message);
  process.exit(1);
});
