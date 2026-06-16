# CRM Vendas WhatsApp

SaaS multi-tenant para gestão de vendas com foco em WhatsApp: leads/contatos, equipe por workspace, dashboard e base preparada para inbox e integrações.

## Stack

- **App:** Next.js 16 (App Router), React 19, TypeScript  
- **UI:** Tailwind CSS, shadcn/ui, Radix, Framer Motion  
- **Dados / auth:** Supabase (PostgreSQL, RLS, Auth, Storage)  
- **Formulários:** React Hook Form + Zod  
- **Testes:** Vitest  

Versões exatas: veja `package.json`.

## Documentação no repositório

| Documento | Conteúdo |
|-----------|----------|
| [`CLAUDE.md`](CLAUDE.md) | Visão do produto, estrutura de pastas, skills do assistente, comandos |
| [`.claude/checklist.md`](.claude/checklist.md) | Checklist macro de features (o que está feito / pendente) |
| [`docs/security.md`](docs/security.md) | Rate limit, auditoria, headers, CSP, hardening de erros |
| [`docs/security/rbac.md`](docs/security/rbac.md) | Modelo RBAC por workspace |
| [`docs/security/ddl-audit.md`](docs/security/ddl-audit.md) | Auditoria de DDL em produção (event triggers, R-007) |
| [`docs/settings-admin.md`](docs/settings-admin.md) | Settings, convite de membros, painel super-admin |
| [`.claude/supabase-production-checklist.md`](.claude/supabase-production-checklist.md) | SMTP, URLs, RLS e secrets antes de produção |

Regras detalhadas de arquitetura, UI e segurança estão em `.claude/rules/` (referenciadas pelo `CLAUDE.md`).

## Estrutura (resumo)

```
src/
├── app/           # Rotas App Router — (auth), (dashboard), (admin), api/
├── components/    # UI por feature + components/ui (design system)
├── viewmodels/    # Hooks MVVM
├── usecases/      # Casos de uso
├── repositories/  # Acesso a dados (Supabase)
├── lib/           # Supabase, security, audit, validações, guards
└── types/         # Tipos de domínio
```

## Primeiros passos

```bash
npm install
cp .env.example .env.local   # se existir; preencher variáveis Supabase e demais
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor após build |
| `npm run lint` | ESLint (inclui regra `no-restricted-imports` que bane `createClient` direto em `src/app/(dashboard)/**`, exigindo `getScopedSupabaseClient()` para suportar impersonação — ver `.sdds/decisions/ADR-004-impersonation-owner-like-access.md`) |
| `npm run typecheck` | TypeScript sem emit |
| `npm test` | Vitest (uma execução) |
| `npm run test:watch` | Vitest em modo watch |

## Estado atual do produto (alto nível)

Implementado com mais profundidade: autenticação (incl. Turnstile com reset automático após falha, mensagens específicas por tipo de erro), dashboard com métricas e gráficos, **módulo de contatos** (incl. carteira de clientes: assigned_to por responsável, compartilhamento pontual via contact_access, RLS por portfolio, origem obrigatória, gerenciamento de origens, criação de nova origem disponível em qualquer etapa do fluxo de importação (preview e resultado), e importação em massa via planilha XLSX/CSV com preview de 10 linhas, detecção automática de coluna de origem, lotes automáticos de 2.000 linhas sem limite máximo, barra de progresso, suporte a múltiplas origens por contato e resumo detalhado do resultado da importação — criados, já existentes, inválidos e duplicados na planilha), **configurações do workspace** (empresa, membros, perfil do usuário com avatar, MFA na UI conforme `settings`), **RBAC**, **painel super-admin** (com aviso/contador de expiração de sessão também no `/admin`; mapeamento 1 workspace : N instâncias WhatsApp via `wa_tenant_id` em `/admin/workspaces`, ver `.sdds/decisions/ADR-005-admin-wa-tenant-mapping.md`), camadas de **rate limit**, **auditoria** e **headers de segurança** descritas em `docs/security.md`. **Integração WhatsApp**: **console no sidebar** (menu WhatsApp, visível só se o workspace tiver vínculo) com rotas `/whatsapp/conexao` (conexão, status ao vivo, QR de pareamento renderizado localmente, reiniciar/desconectar, perfil/privacidade/foto do número), `/whatsapp/grupos` (listar grupos, criar grupo com participantes, renomear, gerenciar participantes), `/whatsapp/enviar` (envio avulso de mensagem de texto ou mídia para número ou grupo) e `/whatsapp/campanhas` (criar campanha, definir audiência por lista de telefones, disparar/pausar/retomar/cancelar). BFF via Server Actions + JWT (`WA_BACKEND_URL`, ADR-006, ADR-007, ADR-008); anti-IDOR via `authorizeWaOperation`; audit logging para todas as ações operacionais. A aba "Integrações" em `/settings` permanece como atalho.

Ainda em estágio inicial (placeholders ou não iniciado): **inbox/chat WhatsApp**, webhooks Z-API, **analytics** avançado — ver `.sdds/specs/whatsapp-console.spec.md` e `.claude/checklist.md`.

Após mudanças relevantes, rode `npm test` e `npm run typecheck` antes de commitar; a suíte de testes evolui junto com o código.

## Licença

Projeto privado (`private: true` no `package.json`).
