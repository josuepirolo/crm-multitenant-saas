---
name: migration-drift-guard
description: Guarda contra drift de schema no Supabase — toda alteração de banco em produção DEVE passar por migration versionada em supabase/migrations/, nunca por SQL ad-hoc. Ative sempre que o usuário pedir para criar/alterar/remover tabela, coluna, índice, policy, função, trigger ou qualquer DDL; ao investigar erros como PGRST200, "relationship not found in schema cache", 42P01/"relation does not exist"; ou ao auditar/diagnosticar o estado do banco de produção. Nasceu do incidente de 2026-06-08 (outage site-wide causado por DROP TABLE business_niches fora do framework de migrations, sem rastro).
---

# Skill: Migration Drift Guard — CRM Vendas WhatsApp

## Por que esta skill existe

Em 2026-06-08, a tabela `business_niches` foi removida da produção via SQL ad-hoc (SQL editor ou acesso equivalente fora do framework de migrations) — **sem deixar nenhum rastro** em `supabase_migrations.schema_migrations`. O código continuava dependendo dela (`business_niches(slug)` embedded select em `getActiveWorkspaceContext`), e o resultado foi um **outage site-wide**: todo usuário autenticado caía em `/no-workspace`, porque toda query de workspaces retornava `PGRST200` ("relationship not found in schema cache").

A causa raiz só foi descoberta porque havia diagnóstico (`console.error`) logando o erro real do Supabase em vez de mascará-lo. Documentado em `.sdds/discoveries/2026-06-08-business-niches-outage.md` e `.sdds/CURRENT_STATE.md` (risco R-007).

**Esta skill existe para que isso nunca se repita.**

## Regra de ouro nº 1 — Schema só muda por migration versionada

- **Proibido** executar DDL (`CREATE`, `ALTER`, `DROP`, `TRUNCATE`, mudanças de policy/trigger/função) diretamente em produção via SQL editor, `execute_sql` ou qualquer ferramenta de query direta.
- **Toda** alteração de schema nasce como arquivo em `supabase/migrations/YYYYMMDDHHMMSS_descricao.sql`, é commitada no repositório, e só então aplicada via `apply_migration` (a ferramenta de DDL — nunca `execute_sql`, que é só para leitura/diagnóstico).
- `execute_sql` (ou equivalente) só pode ser usado para: `SELECT`, `EXPLAIN`, leitura de `information_schema`/`pg_catalog`/`pg_constraint` — **nunca** para `CREATE`/`ALTER`/`DROP`.

## Regra de ouro nº 2 — Migrations devem ser idempotentes e reversíveis

Toda migration deve poder rodar mais de uma vez sem quebrar:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
- `INSERT ... ON CONFLICT DO NOTHING`
- `DROP ... IF EXISTS`

E sempre que possível, documentar no header da migration (comentário) **o que** ela faz e **por quê** — especialmente em correções emergenciais, para que o histórico explique o incidente (ex: `20260608120000_restore_business_niches.sql`).

## Regra de ouro nº 3 — Nunca mascarar erro do Supabase

Este foi o padrão que revelou os 3 últimos bugs de produção (captcha, AAL2, outage do `business_niches`): código que descarta `result.error` com `?? []` ou `?.campo` esconde o erro real e faz um problema de infraestrutura parecer "comportamento normal" (ex: "usuário sem workspace" em vez de "schema cache quebrado").

Sempre que uma função ler do Supabase:
```ts
const result = await supabase.from("tabela").select(...);
if (result.error) {
  console.error("[NomeDaFuncao] erro inesperado:", { message: result.error.message, code: result.error.code });
}
```
Logar **mensagem + código** do erro real — nunca apenas "deu errado" — e nunca incluir segredos/tokens no log.

## Checklist obrigatório antes de qualquer DDL

- [ ] Existe um arquivo `.sql` versionado em `supabase/migrations/` para esta mudança?
- [ ] O nome segue o padrão `YYYYMMDDHHMMSS_descricao_em_snake_case.sql`?
- [ ] A migration é idempotente (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, etc.)?
- [ ] RLS, policies, índices e triggers relacionados estão incluídos na mesma migration (não dependem de passo manual)?
- [ ] Foi commitada no repositório **antes ou junto** da aplicação?
- [ ] Aplicada via `apply_migration` (não `execute_sql`)?
- [ ] Existe plano de rollback ou de correção caso algo dê errado?

## Procedimento de auditoria de drift (rodar quando investigar instabilidade ou periodicamente)

Drift é quando a produção diverge do que o histórico de migrations diz que deveria existir — exatamente o que aconteceu com `business_niches`. Para detectar:

1. **Migrations aplicadas vs arquivos versionados**
   - `list_migrations` (produção) deve corresponder 1:1 aos arquivos em `supabase/migrations/`
   - Se uma migration está nos arquivos mas não na lista de aplicadas (ou vice-versa) → investigar imediatamente
2. **Tabelas esperadas vs tabelas reais**
   - Levantar tabelas referenciadas no código (`grep -r '\.from("' src/repositories/`)
   - Comparar com `information_schema.tables` em produção
   - Tabela referenciada pelo código mas ausente do banco → sintoma idêntico ao incidente do `business_niches`
3. **Constraints/FKs esperadas vs reais**
   - Conferir `pg_constraint` para FKs que o código pressupõe (embedded selects, joins)
   - FK ausente + tabela existente = sintoma de `PGRST200` sem a tabela estar realmente sumida
4. **Histórico de statements**
   - Buscar em `supabase_migrations.schema_migrations.statements` por `CREATE`/`DROP`/`ALTER` de uma tabela suspeita — ausência total de rastro é a assinatura de DDL ad-hoc

## Sinais de alerta (red flags) — investigar na hora

Se aparecer qualquer um destes, trate como possível drift de schema, não como "bug de usuário":

- `PGRST200` — "Could not find a relationship between X and Y in the schema cache"
- `42P01` — "relation ... does not exist"
- `42703` — "column ... does not exist"
- Erro de embedded select / join do PostgREST que "funcionava antes"
- Comportamento que afeta **todos** os usuários simultaneamente (não um usuário específico) logo após uma sessão de manutenção/debug no banco

## Quando ativar esta skill

- Pedido para criar, alterar, remover ou ajustar: tabela, coluna, índice, policy RLS, função, trigger, extensão, ou qualquer DDL
- Pedido para "rodar uma query rápida para corrigir/ajustar produção"
- Investigação de erros `PGRST200`, `42P01`, `42703`, "schema cache", "relation does not exist"
- Auditoria/diagnóstico do estado do banco de produção
- Qualquer menção a `apply_migration`, `execute_sql`, SQL editor do Supabase, ou "rodar SQL direto"

## Referências do projeto

- Incidente documentado: `.sdds/discoveries/2026-06-08-business-niches-outage.md`
- Migration de correção (modelo de migration emergencial bem documentada): `supabase/migrations/20260608120000_restore_business_niches.sql`
- Risco aberto correspondente: R-007 em `.sdds/CURRENT_STATE.md`
- Padrão de diagnóstico que revelou o incidente: `console.error` em `src/lib/workspace-context.ts` (`getActiveWorkspaceContext`)
