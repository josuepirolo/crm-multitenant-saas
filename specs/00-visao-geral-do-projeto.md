# 00 — Visão Geral do Projeto

## Nome
CRM Vendas WhatsApp (`crm-vendas-whatsapp`)

## Objetivo principal
Plataforma SaaS multi-tenant para gestão de vendas via WhatsApp. Cada empresa (workspace) opera em ambiente totalmente isolado, com dados, permissões e identidade visual próprios.

## Problema que resolve
Pequenas e médias empresas que usam WhatsApp como canal principal de vendas não têm CRM adequado: perdem leads, não controlam o funil, não rastreiam atividades por contato e dependem da memória do vendedor.

## Público-alvo
PMEs brasileiras com equipe de vendas usando WhatsApp — inicialmente com foco em nichos verticais: autopeças, vendas de veículos e moda.

## Estado atual (2026-05-22)

### Módulos prontos
| Módulo | Estado |
|---|---|
| Autenticação | Completo — login, cadastro, MFA TOTP, reset de senha |
| Contacts | Completo — CRUD, filtros, paginação, soft delete, RLS |
| Kanban / Deals | Completo — drag & drop otimista, pipeline, rollback |
| Settings | Completo — workspace, membros, RBAC, MFA, nicho, upload de logo |
| Admin (superadmin) | Completo — gestão de workspaces, impersonation, analytics, nichos |
| Auto Parts | Completo — catálogo de peças, precificação, cotações |
| Auto Sales | Completo — inventário de veículos, propostas de venda |
| Fashion | Completo — produtos, variantes, estoque |
| Dashboard | Completo — métricas de leads, deals e performance |
| Analytics | Parcial — tracking de área implementado; relatórios de funil ausentes |
| Segurança base | Completo — RLS, rate limit, Turnstile, audit log, headers |

### Módulos pendentes
| Módulo | Estado |
|---|---|
| WA Integrations | Pendente — banco preparado (`workspace_integrations`), sem UI |
| Chat / Inbox | Placeholder vazio — aguarda integração WA |
| Webhook HMAC | Pendente — endpoint sem validação de assinatura |
| Supabase Vault | Pendente — tokens WA sem criptografia segura |

## Repositório
`github.com/josuepirolo/crm-multitenant-saas` (privado)
Branches: `dev` (desenvolvimento), `prod` (produção)

## Características arquiteturais distintivas
- **Multi-tenant real**: isolamento por `workspace_id` + RLS no banco — não é só filtragem no código
- **Multi-nicho**: UI, módulos e tema visual mudam conforme o nicho configurado no workspace
- **WA agnóstico ao provider**: o CRM não fala direto com Z-API/Evolution/Meta — usa backend WA externo como fonte de verdade
- **Clean Architecture + MVVM**: camadas formalmente separadas; View não acessa banco
