# Discovery — Recursão infinita em RLS entre `contacts` e `contact_access` (`42P17`)

## Data
2026-06-08

## Contexto
Durante a validação da feature de importação em massa de contatos, a suíte completa (`npx vitest run`) apresentou 3 falhas em `src/tests/integration/authenticated-rls.test.ts` (testes ao vivo contra o banco de produção `gkzqhlaltnlcpzcapayb`):

```
AssertionError: expected { code: '42P17', ... } to be null
message: 'infinite recursion detected in policy for relation "contacts"'
```

Confirmado via `git stash` que o problema **já existia antes** das alterações de importação em massa — não foi introduzido nesta sessão, apenas detectado por ela.

## Evidências
1. `git log -S "contact_access" -- supabase/migrations` apontou para a migration `20260602000000_contact_portfolio.sql` (aplicada em produção como `20260602050348_contact_portfolio`), que introduziu a tabela `contact_access` (compartilhamento pontual de carteira) e reescreveu as policies de `contacts`.
2. Leitura da migration revelou um ciclo de referência cruzada entre as duas tabelas:
   - `contacts_select_portfolio` / `contacts_update_portfolio` / `contacts_delete_portfolio` continham `OR id IN (SELECT contact_id FROM contact_access WHERE user_id = auth.uid())`
   - `contact_access_select` continha `EXISTS (SELECT 1 FROM contacts WHERE id = contact_access.contact_id AND workspace_id IN (SELECT my_workspace_ids()))`
   - `contact_access_insert` / `contact_access_delete` continham `EXISTS (... FROM contacts c JOIN workspace_members wm ...)`
3. Toda referência a uma tabela dentro de uma expressão `USING`/`WITH CHECK` de policy RLS **ativa a RLS dessa tabela** — formando o ciclo: avaliar `contacts` → consulta `contact_access` → avalia policy de `contact_access` → consulta `contacts` → ... → `42P17`.
4. Esse é exatamente o **mesmo padrão de bug** já identificado e corrigido uma vez neste projeto em `workspace_members` (ver `supabase/migrations/20260428_fix_workspace_members_rls_recursion.sql`), cuja correção usou funções `SECURITY DEFINER` (que bypassam RLS na tabela consultada) para quebrar o ciclo — receita já estabelecida com `my_workspace_ids()`/`is_admin_in_workspace()`/`my_role_in_workspace()`.

## Conclusão
A migration `contact_portfolio` (2026-06-02) introduziu compartilhamento de contatos via `contact_access`, mas escreveu as novas policies com subqueries diretas e cruzadas entre `contacts` e `contact_access`, recriando — sem perceber — o mesmo erro estrutural já corrigido para `workspace_members` um mês antes. O bug ficava "silencioso" porque só se manifesta quando o Postgres efetivamente precisa avaliar as branches `OR has_contact_access(...)`/`EXISTS (...)` das policies (ex: usuário sem papel de owner/admin/manager e sem ser o `assigned_to` direto) —旅casos cobertos pelos testes de integração `authenticated-rls.test.ts`, mas que não bloqueiam o app no caminho feliz (owner/admin sempre passam pela branch `EXISTS workspace_members ... role IN (...)` antes de chegar à branch problemática, então erros podem não aparecer em uso manual casual).

## Correção aplicada
`supabase/migrations/20260608170406_fix_contacts_contact_access_rls_recursion.sql` — aplicada via `apply_migration` (Supabase MCP, versionada e rastreada em `supabase_migrations.schema_migrations`, **não** SQL ad-hoc). Adiciona:
- `has_contact_access(p_contact_id UUID) RETURNS BOOLEAN` — `SECURITY DEFINER`, bypassa RLS de `contact_access`
- `contact_workspace_id(p_contact_id UUID) RETURNS UUID` — `SECURITY DEFINER`, bypassa RLS de `contacts`

E recria as 6 policies afetadas (`contacts_select/update/delete_portfolio`, `contact_access_select/insert/delete`) substituindo as subqueries cruzadas por essas funções — preservando exatamente as mesmas regras de acesso (owner/admin/manager veem tudo, contato sem `assigned_to` é visível a todos, responsável vê o seu, compartilhamento explícito via `contact_access`).

**Resultado**: suíte completa 365/365 passando (antes: 362/365, com as 3 falhas de recursão).

## Nível de confiança
CONFIRMADO — reproduzido nos testes ao vivo, corrigido, e validado com a suíte completa passando 100% após a correção.

## Impacto potencial
- **Funcional**: qualquer query a `contacts` ou `contact_access` que precisasse avaliar a branch de compartilhamento (`has_contact_access`/`contact_access_select`) falhava com erro `42P17` em vez de retornar dados — afeta usuários com papel `sales`/`support`/`member` (não-gestores) tentando ver contatos compartilhados explicitamente com eles, e qualquer fluxo de leitura/gestão de `contact_access`.
- **Estrutural/recorrência**: é a **segunda vez** que esse exato padrão de bug (subquery cruzada entre tabelas em policies RLS sem `SECURITY DEFINER`) aparece no projeto — primeira em `workspace_members` (2026-04-28), agora em `contacts`/`contact_access` (introduzido 2026-06-02, detectado 2026-06-08). Vale documentar a receita `SECURITY DEFINER` como **padrão obrigatório** para qualquer nova policy que precise referenciar outra tabela com RLS, evitando uma terceira ocorrência.

## Recomendação
Ao escrever uma nova RLS policy que precise consultar outra tabela (além da própria), **sempre** encapsular essa consulta numa função `SECURITY DEFINER STABLE` dedicada — nunca fazer `EXISTS (SELECT ... FROM outra_tabela ...)`/`IN (SELECT ... FROM outra_tabela ...)` diretamente dentro de `USING`/`WITH CHECK`, mesmo que pareça inofensivo. Considerar adicionar isso como checklist item na skill `migration-drift-guard` ou equivalente.
