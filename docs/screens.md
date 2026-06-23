# Screens — CRM Vendas WhatsApp

> Documento gerado por reverse-engineering do código existente (2026-06-17). Mapeia as telas **já implementadas**, extraídas das rotas reais em `src/app/`. Não há telas planejadas/futuras listadas aqui além das marcadas explicitamente como parciais/placeholder.

## Mapa de navegação (rotas)

### Grupo `(auth)` — sem sidebar
| Rota | Tela |
|---|---|
| `/login` | Login |
| `/register` | Registro (desativado via feature flag `SELF_REGISTRATION_ENABLED`, código preservado) |
| `/mfa` | Desafio MFA no login |
| `/mfa/setup` | Configuração obrigatória de MFA (admin/owner) |
| `/reset-password` | Solicitar reset de senha |
| `/update-password` | Definir nova senha |

### Grupo `(dashboard)` — com Sidebar + shell completo
| Rota | Tela | Status |
|---|---|---|
| `/dashboard` | Dashboard principal (métricas, `LeadsChart`, `ContactsByStateCard`) | implementado |
| `/contacts` | Listagem/CRUD de contatos, import em massa | implementado |
| `/kanban` | Board de negociações (DnD) | implementado |
| `/chat` | Chat/Inbox | **REMOVIDO** — `whatsapp-coming-soon` no lugar (WA API é fonte de verdade, não há mais conversations/messages no CRM) |
| `/analytics` | Relatórios | parcial — tracking de área implementado, relatórios incompletos |
| `/settings` | Configurações do workspace (abas) | implementado |
| `/whatsapp` | Redirect/landing do módulo WA | implementado |
| `/whatsapp/conexao` | Status da instância, QR code, perfil/privacidade | implementado |
| `/whatsapp/grupos` | Listar/criar/gerenciar grupos WhatsApp | implementado |
| `/whatsapp/enviar` | Envio avulso de mensagem (texto/mídia) | implementado |
| `/whatsapp/campanhas` | Campanhas em massa (criar, audiência, disparar/pausar/cancelar) | implementado |
| `/auto-parts` | Catálogo de autopeças (nicho) | implementado |
| `/auto-parts/quotes` | Orçamentos (nicho auto-parts) | implementado |
| `/auto-sales` | Inventário de veículos (nicho) | implementado |
| `/auto-sales/proposals` | Propostas (nicho auto-sales) | implementado |
| `/fashion` | Catálogo de produtos (nicho moda) | implementado |
| `/fashion/stock` | Estoque (nicho moda) | implementado |

### Grupo `(admin)` — superadmin SaaS
| Rota | Tela |
|---|---|
| `/admin` | Painel superadmin |
| `/admin/workspaces` | Gestão de workspaces/tenants + impersonation |
| `/admin/analytics` | Analytics cross-tenant |

### Fora de grupo
| Rota | Tela |
|---|---|
| `/` | Landing/redirect |
| `/no-workspace` | Estado de erro — usuário sem workspace ativo |

## Navegação dinâmica por nicho
A sidebar resolve os itens de nicho em tempo real a partir de `workspace.nicheSlug` (`getNicheNav` em `sidebar.tsx`):
- `auto-parts` → Peças, Orçamentos
- `auto-sales` → Estoque, Propostas
- `automotive` (nicho pai) → todos os 4 itens automotivos
- `moda` → Produtos, Estoque

O módulo WhatsApp só aparece se `hasWhatsApp` (workspace tem `workspace_integrations` vinculado).

## Especificação de telas-chave

### Dashboard (`/dashboard`)
- **Layout:** grid de cards de métrica no topo, gráficos abaixo (`LeadsChart`, `DealsChart`, `ContactsByStateCard`)
- **Componentes:** `MetricCard`, gráficos `recharts`, seção "Negociações" atualmente oculta (módulo em validação)
- **Estados:** loading via skeleton de dashboard (grid de cards + área de gráfico), erro genérico, vazio (sem dados ainda)

### Contacts (`/contacts`)
- **Layout:** tabela com filtros, paginação
- **Componentes:** `ContactsTable`, `ContactFilters`, `ContactModal`, `ImportContactsDialog` + `ImportResultSummary`, `AssignContactDialog`, `ContactAccessSheet`, `ContactSourcesSheet`, `DeleteConfirmDialog`
- **Estados:** loading (skeleton de tabela), erro, vazio (CTA para criar/importar), progresso de import em lote (até 2000 linhas)

### Kanban (`/kanban`)
- **Layout:** colunas com scroll horizontal (mín. 280px cada), DnD via `@dnd-kit`
- **Componentes:** `KanbanBoard`, `KanbanColumn`, `DealCard`, `DealDialog`, `KanbanEmptyState`, `KanbanSkeleton`
- **Estados:** loading (skeleton fiel ao layout de colunas), vazio por coluna, otimista com rollback em erro de mutação

### WhatsApp — Grupos (`/whatsapp/grupos`)
- **Layout:** lista de grupos + sheet lateral de gerenciamento
- **Componentes:** `WaGruposClient`, `WaCreateGroupDialog`, `WaManageGroupSheet` (participantes, nome, descrição)
- **Estados:** loading, erro contextualizado via `mapWaError` (mensagens específicas por HTTP status 400/403/409/422), revalidação otimista após mutação

### WhatsApp — Campanhas (`/whatsapp/campanhas`)
- **Layout:** lista de campanhas + dialog de criação (audiência, mensagem)
- **Componentes:** `WaCampanhasClient`, `WaCreateCampaignDialog`
- **Estados:** ações de ciclo de vida (disparar/pausar/retomar/cancelar) com feedback via toast

### Settings (`/settings`)
- **Layout:** abas (`SettingsTabs`)
- **Componentes:** `WorkspaceGeneralForm`, `WorkspaceProfileForm`, `WorkspaceNicheForm`, `MembersTable`, `InviteMemberModal`, `TwoFactorSection`, `IntegrationsTab` (sub-componentes WA: `WaInstanceCard`, `WaAccountDialog`, `QrCodeDialog`, `WaPrivacySection`, `WaStatusBadge`)

### Admin (`/admin/workspaces`)
- **Layout:** tabela de workspaces + painel de detalhe lateral
- **Componentes:** `WorkspacesTable`, `WorkspaceDetailPanel`, `WorkspaceIntegrationsSection`, `AdminSidebar`, `AdminStatsCards`, `AdminAnalyticsClient`

## Estrutura de pastas (real, `src/`)
```
src/
├── app/                          # rotas Next.js (route groups: (auth), (dashboard), (admin))
│   ├── (auth)/{login,register,mfa,reset-password,update-password}/
│   ├── (dashboard)/{dashboard,contacts,kanban,chat,analytics,settings,
│   │                 whatsapp/{conexao,grupos,enviar,campanhas},
│   │                 auto-parts/{quotes},auto-sales/{proposals},fashion/{stock}}/
│   ├── (admin)/admin/{workspaces,analytics}/
│   └── no-workspace/
├── components/
│   ├── ui/                       # primitivos do design system (button, card, input...)
│   ├── dashboard/                 # sidebar, métricas, banners
│   ├── contacts/ kanban/ settings/ admin/ whatsapp/
│   └── auto-parts/ auto-sales/ fashion/   # componentes por nicho
├── viewmodels/                   # hooks use*ViewModel (MVVM)
├── usecases/                     # regras de negócio
├── repositories/                 # abstração Supabase
├── lib/                          # infra (supabase, security, whatsapp, themes...)
├── hooks/                        # hooks genéricos não-ViewModel
├── types/                        # entidades de domínio
└── tests/                        # suíte de testes (vitest)
```

## Ordem de implementação (referência histórica, já concluída)
1. Auth + guards + RLS multi-tenant
2. Dashboard + Contacts (CRUD base)
3. Kanban
4. Settings + Admin (RBAC, impersonation)
5. Nichos (Auto Parts → Auto Sales → Fashion)
6. WhatsApp/BFF (conexão → grupos → envio → campanhas, ADR-005/006/008)

Próximos módulos pendentes (ver `.sdds/CURRENT_STATE.md` → Riscos): Analytics completo, Chat/Inbox (decisão: permanece removido, WA API é fonte de verdade), testes automatizados de Kanban.
