# Checklist do Projeto — CRM Vendas WhatsApp

## Fundação
- [x] Scaffold Next.js 15 + TypeScript + Tailwind + shadcn/ui
- [x] Clean Architecture + MVVM documentado nas regras
- [x] Design system com tokens CSS (sem hardcode)
- [x] Padrão Apple documentado como regra
- [x] Regras de segurança documentadas
- [x] Regras de arquitetura documentadas

## Backend / Banco de dados
- [x] Supabase conectado (Auth + DB)
- [x] Schema inicial — 11 tabelas (workspaces, profiles, contacts, deals, conversations, messages, etc.)
- [x] RLS ativo em todas as tabelas
- [x] Trigger `handle_new_user` — cria profile automaticamente
- [x] Sistema de migrations versionado (Supabase CLI)
- [x] Checklist de configuração de produção documentado

## Autenticação
- [x] Login com e-mail e senha
- [x] Registro com criação automática de workspace
- [x] Middleware de proteção das rotas do dashboard
- [x] Cookies HttpOnly + Secure (Supabase SSR)
- [x] Tratamento de confirmação de e-mail
- [x] Reset de senha (solicitar + redefinir + /auth/callback)
- [x] Cloudflare Turnstile (proteção contra bots)
- [x] Sessão única por usuário (sessions_single_per_user)
- [x] Sign out com invalidação de sessão no servidor (scope: global)
- [ ] Convite de membros para o workspace

## UI / Design
- [x] Tema light forçado nas telas de auth
- [x] Dark mode no dashboard com toggle (segue sistema + manual)
- [x] Tela de login — padrão Apple
- [x] Tela de registro — padrão Apple
- [x] Toggle show/hide senha + aviso de CapsLock
- [x] E-mail/campos mantidos após erro de submit
- [x] Página de reset de senha
- [x] Página de redefinição de senha
- [x] Página 404 customizada
- [x] Skeleton loading do dashboard

## Dashboard
- [x] Página inicial com métricas (4 cards — leads, deals, conversas, conversão)
- [x] Gráfico de leads por período (AreaChart — recharts)
- [x] Gráfico de negociações por status (PieChart donut — recharts)
- [x] Tabela de contatos recentes
- [ ] Gráfico de receita
- [ ] Gráfico de conversões por funil

## Permissões e papéis
- [x] Enum de roles: owner, admin, manager, sales, support
- [x] Matriz de permissões estática por módulo e ação
- [x] Guard `requirePermission()` nas Server Actions
- [x] Hook `usePermissions()` para controle de UI
- [x] Soft delete em todas as entidades (deleted_at)

## Contatos (ex-Leads — módulo unificado em /contacts)
- [x] Repositório + Use Cases (CRUD + soft delete)
- [x] Server Actions com guard de permissão
- [x] ViewModel com paginação, filtros e estado de modal
- [x] Filtros: busca por nome/email/telefone + tabs de status
- [x] Tabela com skeleton loading, avatar, badge de status
- [x] Criar / editar contato (modal com react-hook-form + zod)
- [x] Remover contato (soft delete com dialog de confirmação)
- [x] Pessoa Física / Jurídica com toggle
- [x] CPF com máscara + validação de dígitos verificadores
- [x] CNPJ com máscara + validação de dígitos verificadores
- [x] Telefone internacional (PhoneInput, seletor de país, E.164)
- [x] Unicidade: phone, email, CPF/CNPJ por workspace (DB + backend + frontend)
- [x] Normalização automática via trigger no banco
- [ ] Histórico de interações
- [ ] Importar contatos (CSV)

## Negociações (Kanban)
- [ ] Board kanban com colunas por estágio
- [ ] Drag & drop de cards
- [ ] Criar / editar negociação
- [ ] Filtros por pipeline / responsável

## Funil de Vendas
- [ ] Criar / editar pipelines
- [ ] Gerenciar estágios do funil
- [ ] Métricas por estágio

## Chat / Inbox WhatsApp
- [ ] Layout painel duplo (lista + conversa)
- [ ] Listagem de conversas
- [ ] Envio e recebimento de mensagens
- [ ] Integração WhatsApp (webhook)
- [ ] Realtime com Supabase

## Analytics
- [ ] Relatório de vendas por período
- [ ] Taxa de conversão por funil
- [ ] Performance por usuário
- [ ] Exportar relatório (PDF / CSV)

## Configurações
- [ ] Perfil do usuário (nome, avatar, senha)
- [ ] Configurações do workspace (nome, logo, slug)
- [ ] Membros da equipe (convidar, remover, alterar role)
- [ ] Integrações (WhatsApp, SMTP)
- [ ] Plano e billing

## Produção
- [ ] SMTP próprio configurado no Supabase
- [ ] Templates de e-mail personalizados
- [ ] Site URL e redirect URLs configurados
- [ ] Domínio customizado
- [ ] Backup automático ativado
- [ ] Repositório no GitHub
- [ ] Deploy (Vercel / Railway)
