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
- [ ] Reset de senha (página + Server Action)
- [ ] Convite de membros para o workspace

## UI / Design
- [x] Tema light forçado nas telas de auth
- [x] Dark mode no dashboard com toggle
- [x] Tela de login — padrão Apple
- [x] Tela de registro — padrão Apple
- [ ] Página de reset de senha
- [ ] Página 404 customizada
- [ ] Loading global (skeleton / spinner)

## Dashboard
- [ ] Layout com sidebar colapsável
- [ ] Página inicial com métricas (cards + gráficos)
- [ ] Gráfico de conversões
- [ ] Gráfico de receita
- [ ] Gráfico de leads por período

## Leads
- [ ] Listagem com tabela (paginação, filtros, busca)
- [ ] Criar lead (modal / página)
- [ ] Editar lead
- [ ] Deletar lead
- [ ] Importar leads (CSV)

## Contatos
- [ ] Listagem de contatos
- [ ] Criar / editar / deletar contato
- [ ] Histórico de interações

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
