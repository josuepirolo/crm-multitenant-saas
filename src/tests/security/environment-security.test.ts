import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

function getAllSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) {
      return getAllSourceFiles(fullPath);
    }
    return entry.isFile() && (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) ? [fullPath] : [];
  });
}

const SRC = join(process.cwd(), "src");
const ADMIN_FILE = join(SRC, "lib/supabase/admin.ts").replace(/\\/g, "/");

function normalise(p: string) {
  return p.replace(/\\/g, "/");
}

// ─── service_role ─────────────────────────────────────────────────────────────

describe("service_role — isolado em admin.ts", () => {
  it("SUPABASE_SERVICE_ROLE_KEY só existe em src/lib/supabase/admin.ts", () => {
    const all = getAllSourceFiles(SRC).map(normalise);
    const violators = all
      .filter((f) => f !== ADMIN_FILE)
      .filter((f) => !f.includes("/tests/"))
      .filter((f) => readFileSync(f, "utf-8").includes("SUPABASE_SERVICE_ROLE_KEY"));

    expect(violators, `SERVICE_ROLE_KEY vazou para: ${violators.join(", ")}`).toHaveLength(0);
  });

  it("viewmodels não importam createAdminClient", () => {
    const vmDir = join(SRC, "viewmodels");
    const files = getAllSourceFiles(vmDir).map(normalise);
    const violators = files.filter((f) =>
      readFileSync(f, "utf-8").includes("createAdminClient")
    );
    expect(violators, `ViewModel importando admin: ${violators.join(", ")}`).toHaveLength(0);
  });

  it("componentes não importam createAdminClient nem supabase/admin", () => {
    const dir = join(SRC, "components");
    const files = getAllSourceFiles(dir).map(normalise);
    const violators = files.filter((f) => {
      const content = readFileSync(f, "utf-8");
      return content.includes("createAdminClient") || content.includes("supabase/admin");
    });
    expect(violators, `Componente importando admin: ${violators.join(", ")}`).toHaveLength(0);
  });

  it("service_role não aparece fora de admin.ts e testes (exceto em comentários documentados)", () => {
    const all = getAllSourceFiles(SRC).map(normalise);
    const violators = all
      .filter((f) => f !== ADMIN_FILE)
      .filter((f) => !f.includes("/tests/"))
      .filter((f) => {
        const content = readFileSync(f, "utf-8");
        // Aceita menção a service_role apenas em linhas de comentário
        const nonCommentLines = content
          .split("\n")
          .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"));
        return nonCommentLines.some((line) => line.includes("service_role") || line.includes("SERVICE_ROLE"));
      });
    expect(violators, `service_role em código não-comentado: ${violators.join(", ")}`).toHaveLength(0);
  });
});

// ─── NEXT_PUBLIC_ — apenas vars intencionais ──────────────────────────────────

describe("NEXT_PUBLIC_ — nenhuma chave privada exposta", () => {
  const FORBIDDEN_PUBLIC = [
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE",
    "NEXT_PUBLIC_WEBHOOK_SECRET",
    "NEXT_PUBLIC_ZAPI_TOKEN",
    "NEXT_PUBLIC_ZAPI_SECRET",
  ];

  it("nenhuma variável sensível usa prefixo NEXT_PUBLIC_", () => {
    const all = getAllSourceFiles(SRC).map(normalise).filter((f) => !f.includes("/tests/"));
    const violators: string[] = [];

    for (const file of all) {
      const content = readFileSync(file, "utf-8");
      for (const forbidden of FORBIDDEN_PUBLIC) {
        if (content.includes(forbidden)) {
          violators.push(`${file} → ${forbidden}`);
        }
      }
    }

    expect(violators, `Chaves sensíveis públicas: ${violators.join(", ")}`).toHaveLength(0);
  });
});

// ─── Server-only não vaza para client ─────────────────────────────────────────

describe("importações server-only — não aparecem em client components", () => {
  it("supabase/server não é importado em componentes", () => {
    const dir = join(SRC, "components");
    const files = getAllSourceFiles(dir).map(normalise);
    const violators = files.filter((f) =>
      readFileSync(f, "utf-8").includes("supabase/server")
    );
    expect(violators, `Componente usando supabase/server: ${violators.join(", ")}`).toHaveLength(0);
  });

  it("createClient server não é importado em viewmodels", () => {
    const dir = join(SRC, "viewmodels");
    const files = getAllSourceFiles(dir).map(normalise);
    const violators = files.filter((f) =>
      readFileSync(f, "utf-8").includes("lib/supabase/server")
    );
    expect(violators, `ViewModel usando supabase/server: ${violators.join(", ")}`).toHaveLength(0);
  });
});
