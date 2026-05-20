# Discovery — Backend WhatsApp já provisionado no mesmo Supabase

## Data
2026-05-20

## Contexto
Durante limpeza do banco (drop de conversations/messages), foi descoberto que o backend da API WhatsApp já criou 27 tabelas com prefixo `wa_` no mesmo projeto Supabase do CRM.

## Evidências
- `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'` retornou 44 tabelas
- 27 com prefixo `wa_`: wa_tenants, wa_instances, wa_conversations, wa_messages, wa_providers, wa_contacts, wa_labels, wa_automation_rules, wa_templates, wa_media, wa_message_events, wa_reactions, wa_polls, wa_poll_votes, wa_call_logs, wa_presence_events, wa_raw_events, wa_pending_events, wa_webhook_metrics, wa_daily_reports, wa_insights, wa_error_logs, wa_subscriptions, wa_conversation_labels, wa_conversation_status_history, wa_tenant_members, wa_tenant_users
- `workspace_integrations` já existe com coluna `wa_tenant_id` (FK lógica para wa_tenants)

## Conclusão
O banco é compartilhado entre dois domínios distintos no mesmo Supabase:
- **CRM** (este projeto): tabelas sem prefixo + prefixos de módulo
- **WA API** (backend externo): tabelas prefixadas com `wa_`

A separação é por nomenclatura, não por schema PostgreSQL.
A ponte entre domínios é `workspace_integrations.wa_tenant_id → wa_tenants.id`.

## Nível de confiança
CONFIRMADO

## Impacto potencial
- CRM não deve escrever em tabelas `wa_*` — apenas ler via joins autorizados
- RLS das tabelas `wa_*` é responsabilidade do WA backend
- Trocar de provider WA não afeta o schema CRM
- Módulo de Integração WA no frontend precisa de spec antes de implementar

## Arquivos relacionados
- `supabase/migrations/20260520000001_workspace_integrations.sql`
- `PROJECT.md` — seção "Banco de Dados — Mapa de Tabelas"

## Próximos passos
- Criar spec do módulo WA Integrations (02_CREATE_MODULE_SPEC)
- Definir quais tabelas wa_* o CRM pode ler e como (RLS cross-domain?)
- Avaliar se deals precisam de campo `wa_conversation_id`
