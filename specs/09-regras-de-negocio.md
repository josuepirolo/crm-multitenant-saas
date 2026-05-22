# 09 — Regras de Negócio

## Multi-tenant

| Código | Regra | Onde aplicada | Status |
|---|---|---|---|
| RN-001 | Cada workspace é completamente isolado — dados de um workspace nunca visíveis a outro | RLS + repositories | Implementado |
| RN-002 | `workspace_id` nunca vem do cliente — sempre do contexto autenticado (JWT) | `getWorkspaceContext()` em todas as actions | Implementado |
| RN-003 | Usuário pode pertencer a múltiplos workspaces | `workspace_members` | Implementado |
| RN-004 | Usuário tem um workspace "ativo" (`current_workspace_id` em `profiles`) | `profiles.current_workspace_id` | Implementado |

## Autenticação e acesso

| Código | Regra | Onde aplicada | Status |
|---|---|---|---|
| RN-010 | 2FA (TOTP) obrigatório para roles `owner` e `admin` | Middleware + `/mfa` | Implementado |
| RN-011 | Usuário sem workspace é redirecionado para `/no-workspace` | Guards | Implementado |
| RN-012 | Workspace sem nicho configurado mostra "Niche Setup Wall" | layout.tsx do dashboard | Implementado |
| RN-013 | Superadmin (`is_superadmin = true`) acessa todos os workspaces sem restrição de nicho | `requireSuperAdmin()` | Implementado |
| RN-014 | Impersonation só pode ser feita por superadmin e é auditada | `impersonation-actions.ts` | Implementado |

## RBAC e permissões

| Código | Regra | Onde aplicada | Status |
|---|---|---|---|
| RN-020 | Roles padrão: `owner`, `admin`, `manager`, `sales`, `support` | `types/index.ts` | Implementado |
| RN-021 | Owner tem permissão total no workspace — não pode ser removido por outros membros | Ponto em aberto: validar se há guard específico |
| RN-022 | Permissões configuráveis por workspace via RBAC customizado | `workspace_roles` + `workspace_role_permissions` | Implementado |
| RN-023 | Fallback para matriz hardcoded quando RBAC não configurado | `src/lib/permissions.ts` | Implementado |
| RN-024 | Membro desativado não pode ser reativado diretamente (migration `20260423`) | Migration SQL | Implementado |

## Contatos

| Código | Regra | Onde aplicada | Status |
|---|---|---|---|
| RN-030 | CPF e CNPJ validados pelo algoritmo da Receita Federal | `src/lib/validations/document.ts` | Implementado |
| RN-031 | Telefone e email são identificadores únicos por workspace | Migration unique constraint | Implementado |
| RN-032 | Contatos têm soft delete (`deleted_at`) — não são removidos fisicamente | `contact.repository.ts` | Implementado |
| RN-033 | Status do contato: `lead → prospect → customer → churned` | `ContactStatus` em `types/index.ts` | Implementado |

## Kanban / Deals

| Código | Regra | Onde aplicada | Status |
|---|---|---|---|
| RN-040 | Deal pertence a um pipeline e a um stage | `deals.pipeline_id` + `deals.stage_id` | Implementado |
| RN-041 | Mover card entre stages é operação otimista com rollback em caso de erro | `useKanbanViewModel` | Implementado |
| RN-042 | Status do deal: `open`, `won`, `lost`, `archived` | `DealStatus` em `types/index.ts` | Implementado |

## Multi-nicho

| Código | Regra | Onde aplicada | Status |
|---|---|---|---|
| RN-050 | Cada workspace tem exatamente um nicho configurado | `workspaces.business_niche_id` | Implementado |
| RN-051 | Nichos são hierárquicos (pai/filho) em `business_niches` | `business_niches.parent_id` | Implementado |
| RN-052 | UI dinâmica conforme nicho: módulos de menu e tema visual mudam | `niche-themes.ts` + guards de nicho | Implementado |
| RN-053 | Catálogo de veículos (`vehicle_brands`, `vehicle_models`) é global — compartilhado entre workspaces | Sem `workspace_id` nessas tabelas | Implementado |
| RN-054 | Precificação do catálogo é por workspace (`auto_parts_workspace_pricing`) | `workspace_id` nessa tabela | Implementado |

## Integração WhatsApp

| Código | Regra | Onde aplicada | Status |
|---|---|---|---|
| RN-060 | CRM não armazena conversas nem mensagens — WA API é fonte de verdade | ADR-001 | Implementado (banco) |
| RN-061 | Cada workspace tem no máximo uma integração ativa por provider | `workspace_integrations` | Ponto em aberto: sem constraint unique verificado |
| RN-062 | Frontend CRM é agnóstico ao provider WA (Z-API, Evolution, Meta) | ADR-001 | Decisão arquitetural |
| RN-063 | Tokens de integração WA devem ser armazenados via Supabase Vault | — | **PENDENTE** |

## Segurança e auditoria

| Código | Regra | Onde aplicada | Status |
|---|---|---|---|
| RN-070 | `audit_logs` é append-only — usuários comuns não podem alterar | RLS policy | Implementado |
| RN-071 | `metadata` do audit log nunca contém senha, token ou dado sensível | `audit-log.ts` | Implementado |
| RN-072 | Rate limit acionado gera entrada no audit log | `rate-limit.ts` | Implementado |
| RN-073 | Webhook recebido sem assinatura HMAC válida deve ser rejeitado | — | **PENDENTE** |
| RN-074 | Upload de arquivo valida MIME type, magic bytes e tamanho máximo | `upload-actions.ts` | Implementado |

## Hipóteses (não confirmadas no código)

> Marcadas como hipótese — verificar antes de assumir.

- H-001: Owner de workspace não pode ser removido por admin (provável, mas sem guard explícito identificado)
- H-002: Um workspace pode ter múltiplos pipelines ativos simultaneamente (tabela permite, sem constraint identificado)
- H-003: Tags são únicas por workspace (provável, mas não verificado constraint no banco)
