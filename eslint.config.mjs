import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // R-009: durante impersonação, createClient() é RLS-bound ao superadmin e
  // bloqueia leitura/escrita no workspace impersonado. Server Actions/pages do
  // dashboard devem usar getScopedSupabaseClient() (src/lib/guards.ts).
  {
    files: ["src/app/(dashboard)/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/supabase/server",
              importNames: ["createClient"],
              message:
                "Use getScopedSupabaseClient() de @/lib/guards em vez de createClient() — garante o client correto (RLS ou service_role) durante impersonação. Ver R-009.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
