# ADR-004 — Impersonação concede acesso "owner-like" ao workspace impersonado

## Data
2026-06-09

## Status
ACEITO

## Contexto
Bug crítico identificado e corrigido nesta sessão (ver `discoveries/2026-06-09-impersonation-tenant-isolation-bug.md`): `getWorkspaceContext()`, `getCurrentWorkspaceId()` e `getUserRole()` não consultavam o cookie de impersonação, fazendo com que escritas durante impersonação fossem gravadas no workspace do superadmin em vez do workspace impersonado.

Ao corrigir, era preciso decidir **com qual nível de permissão** o superadmin opera dentro do workspace impersonado, já que ele tipicamente **não é** `workspace_member` desse workspace (logo não tem `role`/`workspace_role_id` lá).

Opções consideradas (apresentadas ao usuário via pergunta direta):
1. Acesso owner-like (bypass total de RBAC, igual a um `owner` do workspace impersonado).
2. Exigir que o superadmin também seja `workspace_member` do workspace alvo (com role explícita).
3. Não mexer agora / tratar caso a caso por módulo.

Usuário escolheu a opção 1 ("Sim, acesso owner-like (Recomendado)").

## Decisão
Durante impersonação validada (`getValidatedImpersonatedWorkspaceId(userId)` retorna não-nulo):
- `getWorkspaceContext(module, action)` retorna `{ workspaceId: <impersonado>, userId }` imediatamente, **sem** consultar `workspace_members`/RBAC granular — equivalente a "permitido" para qualquer `module`/`action`.
- `getCurrentWorkspaceId()` retorna o workspace impersonado.
- `getUserRole(workspaceId)` retorna `"owner"` quando `workspaceId` é o workspace impersonado.

A validação em si (`getValidatedImpersonatedWorkspaceId`) é a barreira de segurança: só retorna não-nulo se (a) o cookie `imp-by` corresponde ao `userId` da sessão atual **e** (b) esse `userId` é confirmado `is_superadmin = true` no banco via `service_role` (não confia em claim do cookie). `startImpersonation` já exige `requireSuperAdmin()` para ser chamado e gera audit log.

## Consequências

**Positivas:**
- Simples e previsível: durante impersonação, o superadmin pode fazer no workspace do cliente qualquer coisa que um owner desse workspace poderia — alinhado ao propósito da feature (suporte/operação).
- Não exige criar `workspace_members` fantasmas para o superadmin em todo workspace que ele precise impersonar.
- A trilha de auditoria de `startImpersonation`/`stopImpersonation` (já existente) cobre quem impersonou o quê e quando.

**Negativas:**
- Bypass total de RBAC granular durante impersonação — uma role customizada restritiva do workspace impersonado não tem efeito sobre o superadmin (irrelevante na prática, pois ele nunca é membro real desse workspace).
- Ações sensíveis feitas durante impersonação (ex: criar/excluir membros, alterar billing) agora são **possíveis** via `getWorkspaceContext`, onde antes seriam bloqueadas (porque o superadmin não era membro). Isso é a correção do bug, mas amplia a superfície de ações reais possíveis durante impersonação — vale considerar audit log dedicado por ação crítica realizada em modo impersonado (hoje só `startImpersonation`/`stopImpersonation` são auditados especificamente).

## Gatilho de revisão
Se for necessário restringir o que um superadmin pode fazer durante impersonação (ex: permitir leitura/edição de contatos mas bloquear gestão de membros/billing), introduzir uma lista de `module`/`action` excluídos do bypass owner-like dentro de `getWorkspaceContext`, mantendo a resolução de `workspaceId` impersonado mas caindo no fluxo RBAC normal para esses módulos.

## Arquivos relacionados
- `src/lib/impersonation.ts` (`getValidatedImpersonatedWorkspaceId`)
- `src/lib/guards.ts` (`getCurrentWorkspaceId`, `getWorkspaceContext`)
- `src/lib/user-role.ts` (`getUserRole`)
- `src/app/(admin)/admin/impersonation-actions.ts` (`startImpersonation`/`stopImpersonation`, já auditados)
- `discoveries/2026-06-09-impersonation-tenant-isolation-bug.md`
