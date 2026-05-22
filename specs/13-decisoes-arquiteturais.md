# 13 — Decisões Arquiteturais (ADRs)

Formato simplificado. ADRs completos em `.sdds/decisions/`.

---

## ADR-001 — WhatsApp API como fonte de verdade

**Status:** Aceita

**Decisão:** O CRM não armazena conversas nem mensagens. O backend WhatsApp externo é a fonte de verdade. O CRM armazena apenas a relação de integração (`workspace_integrations`).

**Contexto:** Precisávamos exibir conversas WA no CRM. A alternativa era replicar `conversations` e `messages` localmente.

**Motivo:** Replicação cria duplicação com risco de inconsistência. Trocar de provider (Z-API → Evolution → Meta) afetaria o schema CRM. O backend WA já tem todo o modelo de dados necessário.

**Consequências:**
- CRM depende de disponibilidade do backend WA para exibir conversas
- Queries cross-domain requerem cuidado com RLS e permissões
- Trocar de provider não afeta código CRM

**Arquivos:** `supabase/migrations/20260520000000_drop_conversations_messages.sql`, `supabase/migrations/20260520000001_workspace_integrations.sql`

---

## ADR-002 — Tailwind CSS v4 com configuração via CSS

**Status:** Aceita

**Decisão:** Usar Tailwind v4 com `@theme inline` no CSS — sem `tailwind.config.js`.

**Contexto:** Tailwind v4 mudou o modelo de configuração para CSS-first.

**Motivo:** Tokens de design centralizados em `globals.css` — um lugar para alterar todo o tema.

**Consequências:** ferramentas que esperam `tailwind.config.js` podem não funcionar sem adaptação.

---

## ADR-003 — Server Actions como padrão para mutações

**Status:** Aceita

**Decisão:** Mutações (criar, editar, deletar) são implementadas como Server Actions, não como Route Handlers (`/api/...`).

**Motivo:** Reduz surface de ataque (sem endpoint HTTP exposto), mais simples de manter, autenticação herdada do contexto da sessão.

**Exceções:** webhooks de entrada (`/api/webhook/...`) e integrações externas que precisam de endpoint REST.

---

## ADR-004 — Multi-tenant via workspace_id + RLS

**Status:** Aceita

**Decisão:** Isolamento de tenant por `workspace_id` em todas as tabelas + Row Level Security no PostgreSQL.

**Motivo:** RLS é a barreira final — mesmo se o código falhar, o banco protege. Não depender apenas de filtragem no código.

**Consequências:** toda nova tabela deve ter `workspace_id` e políticas RLS correspondentes.

---

## ADR-005 — Clean Architecture + MVVM

**Status:** Aceita

**Decisão:** Arquitetura em camadas formais: View → ViewModel → UseCase → Repository → Supabase.

**Motivo:** Separação de responsabilidades facilita testes, manutenção e troca de implementações. UI não conhece banco. Regra de negócio não conhece framework.

**Consequências:** mais arquivos e mais boilerplate. Compensado por testabilidade e clareza.

---

## ADR-006 — Banco compartilhado CRM + WA backend

**Status:** Aceita

**Decisão:** CRM e backend WhatsApp usam o mesmo banco Supabase. Separação por prefixo (`wa_`).

**Contexto:** o backend WA foi provisionado no mesmo projeto Supabase.

**Motivo:** simplifica queries cross-domain, reduz latência, sem necessidade de API intermediária para leitura de dados WA.

**Consequências:** operações no banco afetam ambos os domínios. Prefixo `wa_` é contrato de separação.

---

## ADR-007 — Sem interfaces explícitas de repositório

**Status:** Aceita (mas com recomendação)

**Decisão:** Repositórios são classes concretas sem interface `IRepository` separada.

**Motivo:** pragmatismo — o projeto não precisa trocar de banco no curto prazo.

**Consequências:** testes de UseCase precisam de mock do módulo Supabase em vez de injetar interface. Dificulta testes unitários puros.

**Recomendação técnica:** extrair interfaces quando a cobertura de testes de UseCase for necessária.

---

## ADR-008 — i18n apenas em português do Brasil

**Status:** Aceita

**Decisão:** Sem suporte a múltiplos idiomas. Toda a UI, mensagens de erro e labels são em pt-BR.

**Motivo:** público-alvo 100% brasileiro no momento. Adicionar i18n sem demanda real seria prematuridade.

**Consequências:** internacionalização futura exige refatoração.

---

## ADR-009 — Git apenas local (sem GitLab CI/CD configurado)

**Status:** Aceita

**Decisão:** Repositório no GitHub (`josuepirolo/crm-multitenant-saas`), sem pipeline de CI/CD configurado.

**Motivo:** projeto em desenvolvimento ativo; CI/CD será configurado antes do deploy em produção.

**Pendência:** configurar GitHub Actions para rodar `npm test` e `npm run typecheck` em PRs.

---

## ADRs recomendadas (não tomadas ainda)

| Código | Decisão pendente | Status |
|---|---|---|
| ADR-010 | Supabase Vault para tokens de integração WA | Recomendada |
| ADR-011 | Estratégia de leitura cross-domain CRM ↔ WA (qual client, qual policy) | Pendente |
| ADR-012 | Estratégia de webhook (HMAC, queue, idempotência) | Pendente |
| ADR-013 | Gateway de pagamento (Stripe ou equivalente) para billing | Pendente |
