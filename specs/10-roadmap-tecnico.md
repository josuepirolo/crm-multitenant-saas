# 10 — Roadmap Técnico

Estado base: 2026-05-22. Baseado no código real — sem especulação.

---

## Fase 1 — Fundação ✅ Completa

- [x] Autenticação (login, registro, MFA, reset)
- [x] Multi-tenant com RLS
- [x] RBAC básico (roles + permissões)
- [x] Estrutura Clean Architecture + MVVM
- [x] Design system com tokens CSS (dark/light mode)
- [x] Migrations iniciais do banco
- [x] CI local com Vitest

---

## Fase 2 — Segurança ✅ Completa (parcial)

- [x] Rate limiting (login, registro, reset, CEP)
- [x] Cloudflare Turnstile (anti-bot)
- [x] Audit log de ações críticas
- [x] Headers de segurança (CSP, HSTS, X-Frame-Options)
- [x] Cookies seguros (HttpOnly, Secure, SameSite)
- [x] Session timeout (inatividade + absoluto)
- [x] Suíte de testes de segurança e isolamento de tenant
- [ ] **Webhook HMAC-SHA256** — pendente
- [ ] **Supabase Vault para tokens WA** — pendente

---

## Fase 3 — Core CRM ✅ Completa

- [x] Módulo de Contacts (CRUD, filtros, paginação, soft delete)
- [x] Kanban / Deals (DnD otimista, pipeline, stages)
- [x] Dashboard com métricas
- [x] Settings completo (workspace, membros, nicho, RBAC, MFA, upload)
- [x] Admin (superadmin, impersonation, analytics)

---

## Fase 4 — Módulos de Nicho ✅ Completa

- [x] Autopeças (catálogo, compatibilidade, precificação, cotações)
- [x] Vendas de Veículos (inventário, opcionais, propostas)
- [x] Moda (produtos, variantes, estoque, precificação)
- [x] Catálogo global de veículos (marcas, modelos, categorias)
- [x] Temas visuais por nicho

---

## Fase 5 — Integração WhatsApp 🔴 Próxima prioridade

### 5a — Configuração da integração (tela)
- [ ] Tela `/settings/integrations` — listar, ativar, configurar integração WA
- [ ] Listar providers disponíveis (`wa_providers`)
- [ ] Criar/vincular instância (`wa_instances`)
- [ ] Salvar `wa_tenant_id` em `workspace_integrations`
- [ ] Supabase Vault para tokens de integração

### 5b — Chat / Inbox
- [ ] Leitura de conversas (`wa_conversations`) via `wa_tenant_id`
- [ ] Listagem de mensagens (`wa_messages`)
- [ ] Envio de mensagem via backend WA API
- [ ] Realtime (Supabase Realtime ou polling)

### 5c — Webhooks
- [ ] Endpoint de webhook para receber eventos do WA backend
- [ ] Validação HMAC-SHA256 da assinatura
- [ ] Processamento de eventos: nova mensagem, status de entrega, etc.
- [ ] Rate limit no endpoint de webhook

---

## Fase 6 — Relatórios e Analytics ⚠️ Parcial

- [x] Tracking de área (normalização de paths)
- [ ] Relatório de funil de vendas
- [ ] Relatório de conversão por stage
- [ ] Relatório de volume de conversas WA
- [ ] Relatório de performance por vendedor
- [ ] Dashboard de analytics com filtros de período

---

## Fase 7 — Testes complementares

- [ ] Testes automatizados do Kanban (DnD, otimista, rollback)
- [ ] Testes do módulo WA Integrations
- [ ] Testes end-to-end (Playwright) — não iniciados
- [ ] Testes de performance

---

## Fase 8 — Escalabilidade e Observabilidade

- [ ] Logs estruturados (JSON) em produção
- [ ] Métricas de API (latência, erros)
- [ ] Alertas automáticos para erros críticos
- [ ] Paginação cursor-based nas listagens grandes
- [ ] Cache de queries frequentes
- [ ] CDN para assets estáticos

---

## Fase 9 — Billing e Planos

- [ ] Integração com gateway de pagamento (Stripe recomendado)
- [ ] Ativação/desativação de features por plano
- [ ] Gestão de assinatura pelo workspace admin
- [ ] Trial period automático

---

## Fase 10 — Produção

- [ ] Pipeline de CI/CD configurado (GitHub Actions)
- [ ] Deploy automático para branch `prod`
- [ ] Variáveis de ambiente por ambiente (dev/prod)
- [ ] Documentação de deploy e runbook
- [ ] Backup e recovery testados

---

## Dependências entre fases

```
WA Integrations (5a) → Chat / Inbox (5b) → Webhooks (5c)
         ↓
    Analytics WA (6) — depende de dados de conversas
```

O restante pode ser desenvolvido em paralelo.
