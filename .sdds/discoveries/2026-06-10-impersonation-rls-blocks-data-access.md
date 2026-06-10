# Discovery — Impersonação resolvia `workspaceId` corretamente, mas RLS bloqueava leituras/escritas (segunda metade do bug de impersonação)

## Data
2026-06-10

## Contexto
Após o fix de 2026-06-09 (`discoveries/2026-06-09-impersonation-tenant-isolation-bug.md`, ADR-004), `getWorkspaceContext`/`getCurrentWorkspaceId`/`getUserRole` passaram a resolver `workspaceId = <impersonado>` corretamente. Mesmo assim, ao impersonar o workspace **Lekazis** (`23a8b0b2-3845-42a3-bb0b-bb9abbfdf8e6`):

1. `ContactSourcesSheet` ("Gerenciar origens") não mostrava as 11 `contact_sources` já remediadas para `workspace_id = lekazis` no banco (ver addendum em `discoveries/2026-06-09-impersonation-tenant-isolation-bug.md`).
2. Reimportar a planilha de contatos da Lekazis (ação pendente do fix anterior) falhava silenciosamente / não persistia.

## Causa raiz
Todos os Server Actions de `contacts/` continuavam usando `const supabase = await createClient()` — cliente **RLS-bound ao `auth.uid()` real** (o superadmin), via `@supabase/ssr` + anon key + cookies de sessão.

As policies de RLS de `contact_sources`/`contacts`/etc. são `workspace_id IN (SELECT my_workspace_ids())`, e `my_workspace_ids()` (`SECURITY DEFINER`) só retorna os workspaces onde `auth.uid()` tem uma linha em `workspace_members`. O superadmin (`6fcc2412-3708-499f-bed7-546531cc428b`) só é membro de **PyTec** (`b5a71a25-c2d1-4395-9d66-ac059cff1ce0`).

Resultado durante impersonação de Lekazis:
- `workspaceId` resolvido = Lekazis (correto, app layer — ADR-004).
- `supabase = createClient()` continuava RLS-bound ao superadmin, que não é membro de Lekazis.
- SELECTs com `.eq("workspace_id", lekazisId)` retornavam `[]` (RLS filtra fora todas as linhas).
- INSERTs com `workspace_id: lekazisId` seriam rejeitados pelo `WITH CHECK` da policy.

Ou seja, o fix de ADR-004 resolveu apenas a metade "qual `workspaceId` usar" (app layer), mas não a metade "qual cliente Supabase usar para executar a query com esse `workspaceId`" (data layer).

## Evidências
- `listContactSources()` retornava `data: []` mesmo com os 11 `contact_sources` confirmados em `workspace_id = lekazisId` no banco (remediados em 2026-06-09 23:40).
- Nenhum erro era lançado — RLS simplesmente filtra linhas no SELECT, então o sintoma era "lista vazia", não uma exceção.

## Correção aplicada
Novo helper `getScopedSupabaseClient()` em `src/lib/guards.ts`:

```ts
export async function getScopedSupabaseClient(): Promise<SupabaseClient> {
  const { data: { user } } = await getCachedUser();
  if (user) {
    const impersonatedId = await getValidatedImpersonatedWorkspaceId(user.id);
    if (impersonatedId) return createAdminClient();
  }
  return createClient();
}
```

- Sem impersonação (>99% do tráfego): comportamento idêntico a `createClient()` — zero mudança.
- Com impersonação validada (cookie + `is_superadmin` confirmado no banco — mesmo gate de ADR-004): retorna `createAdminClient()` (`service_role`, bypassa RLS). O isolamento multi-tenant continua garantido porque todo `workspace_id` usado nas queries vem de `ctx.workspaceId`/`getCurrentWorkspaceId()` (já resolvidos, nunca do client) — a barreira de segurança passa a ser a validação de impersonação, não o RLS, exatamente como já decidido em ADR-004 para o app layer.

Aplicado (substituindo `createClient()` por `getScopedSupabaseClient()`) em todos os pontos de `contacts/` que já usavam `getWorkspaceContext`/`getCurrentWorkspaceId`:
- `src/app/(dashboard)/contacts/actions.ts` (14 actions, ~15 call sites)
- `src/app/(dashboard)/contacts/import-actions.ts` (`importContactsAction` — desbloqueia a reimportação da Lekazis)
- `src/app/(dashboard)/contacts/niche-profile-actions.ts` (`upsertAutoPartsProfile`, `upsertFashionProfile`)

## Validação
- `tsc --noEmit` limpo.
- `vitest run src/tests/security src/tests/tenant-isolation` → 326/326 passando (era 323; +3 novos testes de `getScopedSupabaseClient` em `workspace-context-impersonation.test.ts`; `actions-auth.test.ts` precisou adicionar `getScopedSupabaseClient` ao mock de `@/lib/guards`).

## Nível de confiança
CONFIRMADO — causa raiz explica os dois sintomas relatados (origens invisíveis + reimport bloqueado), consistente com o comportamento de RLS (`my_workspace_ids()`) e com a remediação de dados de 2026-06-09 (linhas existem no banco, mas filtradas no SELECT).

## Impacto remanescente — R-009 (ABERTO)
O mesmo padrão (`createClient()` após `getWorkspaceContext`/`getCurrentWorkspaceId`, sem `getScopedSupabaseClient()`) ainda existe em **~15 arquivos fora de `contacts/`** — qualquer um desses, ao ser usado durante impersonação de um workspace onde o superadmin não é membro, terá o mesmo sintoma (leituras vazias / escritas rejeitadas por RLS):

- `src/app/(dashboard)/kanban/actions.ts`
- `src/app/(dashboard)/settings/actions.ts`
- `src/app/(dashboard)/settings/niche-actions.ts`
- `src/app/(dashboard)/settings/rbac-actions.ts`
- `src/app/(dashboard)/settings/upload-actions.ts`
- `src/app/(dashboard)/area-tracking-actions.ts`
- `src/app/(dashboard)/auto-parts/actions.ts`
- `src/app/(dashboard)/auto-parts/page.tsx`
- `src/app/(dashboard)/auto-parts/quotes/page.tsx`
- `src/app/(dashboard)/auto-sales/actions.ts`
- `src/app/(dashboard)/auto-sales/page.tsx`
- `src/app/(dashboard)/auto-sales/proposals/page.tsx`
- `src/app/(dashboard)/fashion/actions.ts`
- `src/app/(dashboard)/fashion/page.tsx`
- `src/app/(dashboard)/fashion/stock/page.tsx`
- `src/app/(dashboard)/dashboard/page.tsx`

Correção: aplicar o mesmo replace `createClient()` → `getScopedSupabaseClient()` (drop-in, mesma assinatura `Promise<SupabaseClient>`) nesses arquivos, em sessão futura.

## Arquivos relacionados
- `src/lib/guards.ts` (`getScopedSupabaseClient`)
- `src/tests/security/workspace-context-impersonation.test.ts` (`describe("getScopedSupabaseClient")`)
- `discoveries/2026-06-09-impersonation-tenant-isolation-bug.md`
- `decisions/ADR-004-impersonation-owner-like-access.md` (addendum desta sessão)
