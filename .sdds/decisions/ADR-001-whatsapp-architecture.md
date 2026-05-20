# ADR-001 — Arquitetura de Integração WhatsApp

## Data
2026-05-20

## Status
ACEITO

## Contexto
O CRM precisa exibir conversas e mensagens WhatsApp. Duas abordagens possíveis:
1. Armazenar conversations/messages no banco CRM
2. Usar backend WhatsApp externo como fonte de verdade

## Decisão
O frontend CRM é **agnóstico ao provider WhatsApp** (Z-API, Evolution API, Meta Cloud API).
O backend WA é a fonte de verdade para conversas e mensagens.
O CRM armazena apenas a **relação de integração** (`workspace_integrations`), não os dados de comunicação.

## Consequências

**Positivas:**
- Trocar de provider não afeta o schema CRM nem o frontend
- Sem duplicação de dados com risco de inconsistência
- Backend WA pode evoluir independentemente
- Banco CRM mais limpo — sem tabelas de alto volume (mensagens)

**Negativas:**
- CRM depende de disponibilidade do WA backend para exibir conversas
- Queries cross-domain requerem cuidado com RLS e permissões
- Necessário definir contrato de leitura entre os domínios

## Ponte entre domínios

```
workspaces → workspace_integrations (wa_tenant_id) → wa_tenants → wa_instances/wa_conversations
```

## Arquivos relacionados
- `supabase/migrations/20260520000001_workspace_integrations.sql`
- `supabase/migrations/20260520000000_drop_conversations_messages.sql`
- `PROJECT.md` — seção "Ponte CRM ↔ WhatsApp API"
- `.sdds/discoveries/2026-05-20-wa-backend-architecture.md`
