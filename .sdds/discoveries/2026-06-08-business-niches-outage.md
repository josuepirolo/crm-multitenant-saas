# Discovery — Outage site-wide por DDL ad-hoc não rastreada (`business_niches`)

## Data
2026-06-08

## Contexto
Usuário relatou cair em `/no-workspace` ("Nenhuma empresa ativa") logo após login + MFA, mesmo com workspace "PyTec" ativo e válido no banco. Reprodução em log limpo (sem concorrência de abas) descartou hipótese de race condition de sessão.

## Evidências
1. Log de diagnóstico (adicionado em `getActiveWorkspaceContext`, `src/lib/workspace-context.ts`) revelou erro real do Supabase, antes mascarado por `?? []`/`?.campo`:
   `{ message: "Could not find a relationship between 'workspaces' and 'business_niches' in the schema cache", code: 'PGRST200' }`
2. `pg_constraint` mostrou **zero FK constraints** em `workspaces` referenciando `business_niches`.
3. `information_schema.columns` confirmou que a coluna `business_niche_id` ainda existe em `workspaces` (órfã).
4. Query direta `select count(*) from business_niches` retornou `42P01: relation "business_niches" does not exist` — a tabela estava completamente ausente, não apenas sem FK.
5. `list_migrations` não lista `20260427_business_niches` (a migration original que criou a tabela).
6. Três migrations posteriores (`20260502_seed_auto_parts_niche`, `20260504010000_fix_automotive_niche_hierarchy`, `20260504070000_*`) referenciam `business_niches` e constam como aplicadas com sucesso — prova de que a tabela existiu em produção até pelo menos 2026-05-04.
7. Busca completa em `supabase_migrations.schema_migrations.statements` por qualquer `CREATE`/`DROP TABLE business_niches` não retornou nenhum resultado.
8. `git blame` confirma que o código com `business_niches(slug)` embedded select foi adicionado em 2026-05-04 (commit `377bd9d`, feature de multi-nicho) e está ativo desde então.
9. Busca em `audit_logs` pelo UUID do nicho órfão do PyTec (`bfa1f52d-d271-4253-8b0a-6ae293e62b8b`) não retornou nada — não há trilha de auditoria do valor original.

## Conclusão
A tabela `business_niches` foi **removida da produção via SQL ad-hoc/direto (SQL editor ou acesso equivalente fora do framework de migrations)**, sem deixar nenhum rastro em `supabase_migrations.schema_migrations`, em algum momento entre 2026-05-04 e a data do incidente. Como o código de `getActiveWorkspaceContext` — chamado em **todo** fluxo de login — depende de `business_niches(slug)` via embedded select, o PostgREST retornava `PGRST200` para **toda** query de workspaces, fazendo `getActiveWorkspaceContext` devolver `workspaces: []` para **qualquer usuário autenticado**, redirecionando geral para `/no-workspace`. Não era um bug de sessão nem específico de usuário — era um **outage site-wide**.

## Nível de confiança
CONFIRMADO

## Impacto potencial
- **Crítico/operacional**: derruba o login de toda a base de usuários sem aviso, sem alerta e sem rastro de causa no histórico de migrations.
- **Estrutural**: revela que não existe nenhuma proteção/detecção contra DDL executada fora do framework de migrations em produção — drift de schema pode ocorrer silenciosamente e ser catastrófico.
- **Dados**: a referência `workspaces.business_niche_id` do workspace PyTec ficou órfã e teve que ser zerada (sem possibilidade de recuperação do valor original).

## Arquivos relacionados
- `src/lib/workspace-context.ts` — `getActiveWorkspaceContext` (ponto de falha; logging de diagnóstico adicionado e mantido permanentemente)
- `supabase/migrations/20260427_business_niches.sql` — migration original (template usado para restauração)
- `supabase/migrations/20260608120000_restore_business_niches.sql` — migration de restauração aplicada em produção (projeto `gkzqhlaltnlcpzcapayb`): recria tabela, RLS, índices, trigger, FK `workspaces_business_niche_id_fkey`, zera órfão do PyTec, repopula 27 nichos (seed original + auto-parts + hierarquia automotive), `NOTIFY pgrst, 'reload schema'`
- `src/repositories/niche.repository.ts`, `src/repositories/admin.repository.ts`, `setup-niche-action.ts`, `niche-actions.ts`, `register/page.tsx`, `(dashboard)/layout.tsx` — consumidores de `business_niches`, todos desbloqueados pela restauração sem necessidade de alteração de código

## Próximos passos
- Pedir ao usuário para reconfirmar login → `/dashboard` (sem `/no-workspace`).
- PyTec: re-selecionar nicho de negócio via Settings (valor anterior irrecuperável).
- Avaliar processo/governança para impedir ou detectar DDL ad-hoc em produção: restringir acesso ao SQL editor, ou rotina periódica comparando `list_migrations` com `information_schema.tables`/`pg_constraint` para flagar drift não rastreado (ver risco R-007 em `CURRENT_STATE.md`).
