# Discovery — Impersonação não isolava `workspace_id` em Server Actions (cross-tenant write)

## Data
2026-06-09

## Contexto
Usuário (superadmin) impersonou o workspace "Lekazis" (`23a8b0b2-3845-42a3-bb0b-bb9abbfdf8e6`) e importou uma planilha de ~3.100 contatos (na verdade processados em lotes, total acumulado de 8.485 ao longo do dia). Os contatos apareceram no workspace pessoal do superadmin, "PyTec" (`b5a71a25-c2d1-4395-9d66-ac059cff1ce0`), e não em Lekazis.

## Evidências
1. `getCurrentWorkspaceId()` e `getWorkspaceContext()` em `src/lib/guards.ts`, e `getUserRole()` em `src/lib/user-role.ts`, resolviam o tenant **exclusivamente** via `profiles.current_workspace_id` do usuário autenticado — nunca consultavam `getImpersonationContext()` (`src/lib/impersonation.ts`), que já existia e gerencia os cookies httpOnly `imp-wid`/`imp-by`/`imp-name` setados por `startImpersonation`.
2. `importContactsAction` (e as demais ~39 Server Actions que usam `getWorkspaceContext`) recebiam portanto sempre o `workspace_id` da empresa do superadmin, mesmo durante impersonação ativa.
3. SQL confirmou: 8.485 contatos em PyTec criados numa janela de 64s (09:54:25–09:55:29) no mesmo dia; Lekazis tinha apenas 1 contato antigo (2026-04-20).
4. A camada de UI/layout (`src/app/(dashboard)/layout.tsx`) já era impersonation-aware (via `resolveContext()`), então a *navegação* mostrava Lekazis corretamente — mas toda **escrita via Server Action** ia para o tenant real do usuário. Isso tornava o bug invisível em uso casual (visualização) e só aparecia em mutações.

## Conclusão
A feature de impersonação tinha duas metades desacopladas: o cookie de contexto (lido pelo layout para exibir o nome/seleção do workspace impersonado) e a resolução de tenant para autorização/dados (`getWorkspaceContext`/`getCurrentWorkspaceId`/`getUserRole`), que ignorava esse cookie por completo. Qualquer ação de escrita feita durante impersonação (não só import de contatos) gravava no workspace do superadmin, não no workspace impersonado — um vazamento cross-tenant na direção oposta ao normal (dados do tenant impersonado vazando para o tenant do operador).

## Nível de confiança
CONFIRMADO — reproduzido via SQL (contagem/timestamps dos 8.485 contatos), causa raiz identificada por leitura de código, corrigido e validado com suíte de segurança/tenant-isolation 307/307 passando.

## Impacto potencial
- **Segurança/multi-tenant**: qualquer Server Action protegida por `getWorkspaceContext`/`getCurrentWorkspaceId`/`getUserRole` (criação/edição/exclusão de contatos, deals, configurações de workspace, membros, etc.) executada durante impersonação gravava no tenant errado.
- **Dados**: 8.485 contatos foram criados indevidamente no workspace PyTec (do próprio superadmin). PyTec é workspace de teste/pessoal (confirmado pelo usuário) — registros removidos via `DELETE FROM contacts WHERE workspace_id = 'b5a71a25-c2d1-4395-9d66-ac059cff1ce0'` (FKs com `CASCADE`/`SET NULL` verificadas antes da exclusão; `contact_source_assignments` órfãos removidos junto via `CASCADE`).
- **Recorrência**: feature de impersonação é usada para suporte/operação em workspaces de clientes — qualquer ação realizada nesse modo até este fix poderia ter gravado dados no workspace do operador em vez do cliente.

## Correção aplicada
- Nova função `getValidatedImpersonatedWorkspaceId(userId)` em `src/lib/impersonation.ts`: lê o cookie de impersonação, valida que `impersonatedBy === userId` e que o usuário é `is_superadmin` confirmado no banco (defesa contra cookie forjado/órfão).
- `getCurrentWorkspaceId()` e `getWorkspaceContext()` (`src/lib/guards.ts`) e `getUserRole()` (`src/lib/user-role.ts`) agora chamam essa função primeiro; se houver impersonação válida, usam o workspace impersonado (acesso owner-like, ver `decisions/ADR-004-impersonation-owner-like-access.md`).
- Validado: `tsc --noEmit` limpo; `vitest run src/tests/security src/tests/tenant-isolation` → 307/307 passando.

## Próximos passos
- Criar testes automatizados específicos para `getValidatedImpersonatedWorkspaceId`, `getCurrentWorkspaceId`, `getWorkspaceContext` e `getUserRole` cobrindo: sem cookie, cookie de outro usuário, usuário não-superadmin, impersonação válida (pendente — próxima sessão).
- Usuário deve reimportar a planilha de contatos da Lekazis (workspace agora isolado corretamente durante impersonação).
- Considerar auditoria adicional: revisar se outras leituras (não só `getWorkspaceContext`) resolvem tenant de forma divergente durante impersonação (ex: RPCs chamadas diretamente fora de `guards.ts`).
