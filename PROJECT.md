# CRM Vendas WhatsApp — Documentação do Projeto

## Visão Geral

Plataforma SaaS multi-tenant para gestão de vendas via WhatsApp. Cada empresa (workspace) é isolada com dados próprios, permissões e nicho de mercado configurável.

---

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS v4 (config via CSS `@theme inline`) |
| Componentes | shadcn/ui + Radix UI |
| Backend / DB | Supabase (PostgreSQL + RLS + Realtime + Storage) |
| Autenticação | Supabase Auth + `@supabase/ssr` |
| Formulários | React Hook Form + Zod |
| Animações | Framer Motion |
| Toasts | Sonner |
| Anti-bot | Cloudflare Turnstile |
| Arquitetura | Clean Architecture + MVVM |

---

## Arquitetura

```
View (components/)
  ↓ props + callbacks
ViewModel (viewmodels/)
  ↓ chama UseCases
UseCase (usecases/)
  ↓ chama Repositories
Repository (repositories/)
  ↓ acessa
Supabase (lib/supabase/)
```

### Estrutura de pastas

```
src/
├── app/
│   ├── (auth)/         — login, registro, MFA, recuperação de senha
│   ├── (dashboard)/    — área autenticada (todas as features)
│   ├── (admin)/        — painel superadmin
│   └── api/            — route handlers
├── components/
│   ├── ui/             — componentes base (shadcn/ui + customizados)
│   └── [feature]/      — componentes por funcionalidade (View)
├── viewmodels/         — hooks de estado e lógica de apresentação
├── usecases/           — regras de negócio (um por caso de uso)
├── repositories/       — interface + implementação Supabase
├── lib/
│   ├── supabase/       — clientes browser/server/admin/middleware
│   ├── security/       — rate limit, Turnstile, CSRF, session policy
│   ├── audit/          — audit_log centralizado
│   ├── validations/    — schemas Zod compartilhados
│   └── utils/          — utilitários gerais
└── types/              — entidades de domínio e DTOs
```

---

## Banco de Dados — Mapa de Tabelas

O banco é compartilhado entre dois domínios: **CRM** (este projeto) e **WhatsApp API** (backend externo). A separação é feita por prefixo de nome.

### Domínio CRM (este projeto)

**Core**

| Tabela | Finalidade |
|---|---|
| `workspaces` | Tenant — cada empresa |
| `workspace_members` | Usuários por workspace + role |
| `workspace_roles` | Roles customizadas por workspace |
| `workspace_role_permissions` | Relação role ↔ permissão |
| `workspace_integrations` | Integrações ativas por workspace (ponte CRM ↔ WA API) |
| `profiles` | Perfil do usuário (espelha auth.users) |
| `permissions` | Permissões do sistema |
| `plans` | Planos de assinatura |
| `audit_logs` | Log de auditoria de ações críticas |
| `rate_limits` | Controle de rate limit por IP/email |

**Vendas / CRM**

| Tabela | Finalidade |
|---|---|
| `pipelines` | Funis de vendas |
| `stages` | Etapas de cada funil |
| `deals` | Negociações (cards do kanban) |
| `deal_activities` | Histórico de atividades por deal |
| `contacts` | Leads e contatos |
| `contact_tags` | Relação contato ↔ tag |
| `tags` | Tags livres por workspace |

**Nichos**

| Tabela | Finalidade |
|---|---|
| `business_niches` | Catálogo de nichos (hierárquico) |

**Módulo Autopeças**

| Tabela | Finalidade |
|---|---|
| `vehicle_brands` | Marcas de veículos (catálogo global) |
| `vehicle_categories` | Categorias de veículos |
| `vehicle_models` | Modelos de veículos |
| `auto_parts_catalog` | Catálogo de peças por workspace |
| `auto_parts_compatibility` | Peça ↔ veículo compatível |
| `auto_parts_workspace_pricing` | Precificação por workspace |
| `auto_parts_quotes` | Orçamentos de peças |
| `auto_parts_quote_items` | Itens de cada orçamento |
| `contact_profiles_auto_parts` | Perfil de contato p/ autopeças |

**Módulo Auto Sales**

| Tabela | Finalidade |
|---|---|
| `auto_sales_inventory` | Estoque de veículos |
| `auto_sales_inventory_pricing` | Precificação do estoque |
| `auto_sales_optional_items` | Opcionais dos veículos |
| `auto_sales_proposals` | Propostas de venda |

**Módulo Moda**

| Tabela | Finalidade |
|---|---|
| `fashion_products` | Produtos de moda |
| `fashion_product_variants` | Variantes (cor, tamanho) |
| `fashion_variant_pricing` | Precificação por variante |
| `fashion_variant_stock` | Estoque por variante |
| `contact_profiles_fashion` | Perfil de contato p/ moda |

---

### Domínio WhatsApp API (backend externo — prefixo `wa_`)

Gerenciado pelo backend da API WhatsApp. O CRM **não escreve** nessas tabelas — apenas lê via joins autorizados.

| Tabela | Finalidade |
|---|---|
| `wa_tenants` | Tenants do backend WA (1 por integração) |
| `wa_tenant_members` | Membros por tenant WA |
| `wa_tenant_users` | Usuários por tenant WA |
| `wa_providers` | Providers disponíveis (Z-API, Evolution, Meta...) |
| `wa_instances` | Instâncias WhatsApp (números conectados) |
| `wa_conversations` | Conversas (fonte de verdade no WA backend) |
| `wa_messages` | Mensagens das conversas |
| `wa_contacts` | Contatos do WhatsApp |
| `wa_labels` | Labels de conversas |
| `wa_conversation_labels` | Relação conversa ↔ label |
| `wa_conversation_status_history` | Histórico de status de conversa |
| `wa_media` | Arquivos de mídia |
| `wa_message_events` | Eventos de mensagem (entrega, leitura...) |
| `wa_reactions` | Reações a mensagens |
| `wa_polls` | Enquetes |
| `wa_poll_votes` | Votos em enquetes |
| `wa_templates` | Templates de mensagem |
| `wa_automation_rules` | Regras de automação |
| `wa_call_logs` | Histórico de chamadas |
| `wa_presence_events` | Eventos de presença (online/offline) |
| `wa_raw_events` | Eventos brutos do webhook |
| `wa_pending_events` | Fila de eventos pendentes |
| `wa_webhook_metrics` | Métricas de webhook |
| `wa_daily_reports` | Relatórios diários |
| `wa_insights` | Insights e analytics |
| `wa_error_logs` | Log de erros do WA backend |
| `wa_subscriptions` | Assinaturas/planos WA |

---

### Ponte CRM ↔ WhatsApp API

```
workspaces  ──→  workspace_integrations  ──→  wa_tenants
                  (workspace_id)               (wa_tenant_id)
                                                    ↓
                                              wa_instances
                                              wa_conversations
                                              wa_messages
```

O frontend CRM consulta a integração ativa do workspace e usa o `wa_tenant_id` para navegar até instâncias, conversas e mensagens no domínio WA.

---

## Decisões Arquiteturais

| Decisão | Motivo |
|---|---|
| `conversations` e `messages` removidas do CRM | WhatsApp API é a fonte de verdade; armazenar localmente seria duplicação com risco de inconsistência |
| Tabelas WA prefixadas com `wa_` | Separação clara de domínios no banco compartilhado |
| `workspace_integrations` no CRM (não no WA backend) | O dono da relação negocial é o admin do workspace; ativar/desativar é responsabilidade do CRM |
| Frontend agnóstico ao provider | O CRM fala com abstração única — o provider (Z-API, Evolution, Meta) é configurado por workspace |
| Sem prefixo `crm_` nas tabelas | Prefixos por módulo já organizam (`auto_parts_`, `fashion_`, `wa_`); adicionar `crm_` seria ruído |

---

## Telas Implementadas

### Autenticação (`/auth`)

| Rota | Descrição |
|---|---|
| `/login` | Login com e-mail + senha + Cloudflare Turnstile |
| `/register` | Cadastro de nova empresa — nome, e-mail, senha, nicho |
| `/mfa` | Verificação do código TOTP (6 dígitos) |
| `/mfa/setup` | Configuração obrigatória de 2FA para admin/owner |
| `/reset-password` | Solicitar link de recuperação de senha |
| `/update-password` | Definir nova senha via link do e-mail |

### Dashboard (`/dashboard`)

| Rota | Descrição |
|---|---|
| `/dashboard` | Home — métricas de leads, deals e performance |
| `/contacts` | Lista de leads e contatos |
| `/kanban` | Board de negociações (drag & drop) |
| `/analytics` | Dashboards e relatórios de performance |
| `/settings` | Configurações da conta e do workspace |

### Módulos por Nicho

| Rota | Nicho | Descrição |
|---|---|---|
| `/auto-parts` | Autopeças | Gestão de peças e cotações |
| `/auto-parts/quotes` | Autopeças | Cotações de peças |
| `/auto-sales` | Vendas de Veículos | Gestão de veículos |
| `/auto-sales/proposals` | Vendas de Veículos | Propostas de venda |
| `/fashion` | Moda | Catálogo de produtos |
| `/fashion/stock` | Moda | Controle de estoque |

### Admin (`/admin`)

| Rota | Descrição |
|---|---|
| `/admin` | Painel superadmin — visão geral |
| `/admin/workspaces` | Lista e gestão de workspaces (empresas) |
| `/admin/analytics` | Relatório de uso por workspace |

### Outras

| Rota | Descrição |
|---|---|
| `/` | Redirect para `/dashboard` ou `/login` |
| `/no-workspace` | Fallback — usuário sem workspace vinculado |

---

## Features Implementadas

### Multi-tenancy
- Isolamento total por `workspace_id` em todas as tabelas
- RLS ativo em todas as tabelas
- `workspace_id` derivado do contexto autenticado (nunca do cliente)

### Multi-nicho
- Cadastro com seleção de nicho obrigatória
- "Niche Setup Wall" — workspaces sem nicho são bloqueados até configuração
- Superadmin dispensa configuração de nicho
- Módulos de UI dinâmicos por nicho (autopeças, veículos, moda)
- Temas visuais por nicho via CSS variables

### Autenticação e Segurança
- Login com e-mail + senha
- 2FA obrigatório para admin/owner (TOTP via Supabase Auth)
- Rate limiting por IP e e-mail (login, registro, reset de senha)
- Cloudflare Turnstile (anti-bot) em todas as ações públicas
- Session timeout (inatividade + absoluto)
- Audit log para ações críticas (login, logout, 2FA, membros, workspace)
- Cookies HttpOnly + Secure + SameSite=Lax
- Headers de segurança: CSP, HSTS, X-Frame-Options, Permissions-Policy

### RBAC (Controle de Acesso)
- Roles padrão: owner, admin, vendedor
- Permissões granulares por workspace (workspace_roles + permissions)
- Fallback para matriz hardcoded quando sem RBAC configurado

### Admin (Superadmin)
- Listagem e gestão de todos os workspaces
- Impersonação de workspace (acesso sem credenciais)
- Relatório de uso agregado por workspace e drill-down de usuários
- Gestão de nichos (CRUD com hierarquia pai/filho)

### Settings
- Dados gerais do workspace
- Segmento/nicho com dropdowns dependentes (hierarquia N-nível)
- Perfil do usuário
- 2FA (ativar/desativar)
- Gestão de membros e permissões

### UI/UX
- Dark mode / Light mode com tokens CSS centralizados
- Skeleton loading em todas as listagens e dashboards
- Toasts com `toast.promise()` para ações assíncronas
- Animações com Framer Motion
- Layout responsivo (mobile + desktop)
- Sidebar colapsável

---

## Segurança — Status Atual

| Item | Status |
|---|---|
| RLS em todas as tabelas CRM | ✅ |
| Rate limit (login, register, reset) | ✅ |
| Cloudflare Turnstile | ✅ |
| 2FA obrigatório para admin | ✅ |
| Audit log | ✅ |
| Headers de segurança (CSP, HSTS) | ✅ |
| Cookies seguros | ✅ |
| service_role isolado (nunca no cliente) | ✅ |
| Integração WhatsApp (via provider externo) | ⏳ Pendente |
| Webhooks CRM (HMAC) | ⏳ Pendente |

---

## Integração WhatsApp — Status

O backend da API WhatsApp já está provisionado no mesmo banco Supabase com 27 tabelas `wa_*`. A integração com o CRM está pendente:

- [ ] Tela de configuração de integração WA no CRM (`/settings/integrations`)
- [ ] Listar providers disponíveis (`wa_providers`)
- [ ] Criar `workspace_integrations` ao onboarding WA
- [ ] Exibir conversas e mensagens via WA API (leitura das tabelas `wa_*`)
- [ ] Linkar deal do kanban a uma conversa WA (`wa_conversations`)

---

## Scripts Utilitários

| Script | Uso |
|---|---|
| `node scripts/create-tenant.mjs` | Cria empresa + owner completo interativamente (onboarding manual) |

---

## Variáveis de Ambiente Necessárias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```
