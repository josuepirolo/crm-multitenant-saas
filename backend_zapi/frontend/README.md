# 📦 Bundle de handoff — Frontend / CRM

Esta pasta reúne **tudo que o time de frontend/CRM precisa** para implementar a
integração WhatsApp e a arquitetura de autorização. É um pacote de entrega:
pode baixar a pasta inteira e repassar. Documentos fora desta pasta
(`docs/*.md`, `.sdds/`) são **internos do backend WA** — não fazem parte do
handoff.

Atualizado em **2026-06-15**. Fonte de verdade: `.sdds/contracts/` no backend.

## O que tem aqui (ordem de leitura sugerida)

| # | Documento | Para quê | Quem usa |
|---|-----------|----------|----------|
| 1 | **`frontend-whatsapp-integration.md`** | Modelo workspace↔wa_tenant, catálogo de endpoints, onboarding, matriz de permissões, §2.5 console operacional. | Frontend (UI) |
| 2 | **`wa-backend-integration-contracts.md`** | `WA_BACKEND_URL` + contratos request/response: §1–§2 Integrações (instâncias, perfil/privacidade); **§3–§8 console operacional** (contatos, grupos, mensagens, chat, campanhas, upload). | Frontend (UI / BFF) |
| 3 | **`authz-architecture-and-crm-handoff.md`** | Claim `authz` v1, checklist CRM (hook, migration), Fase 1 validada. | Frontend/CRM |
| 4 | **`authz-hook-verification.sql`** | Pré-checagem do hook + dry-run por papel. | CRM (Supabase) |

## Dois fluxos de trabalho

- **Integrações v2.3 (conexão, QR, perfil)** → docs **1 + 2** §1–§2. Live em produção.
- **Console operacional (sidebar: grupos, chat, campanhas)** → docs **1** §2.5 + **2** §3–§8.
- **Autorização cross-service** → doc **3** (e2e §5.4 validado 2026-06-15).

## Módulos cobertos em `wa-backend-integration-contracts.md`

| § | Módulo | Status backend |
|---|--------|----------------|
| 1 | management-instances | ✅ |
| 2 | account-settings | ✅ |
| 3 | contact-management (sync WA) | ✅ |
| 4 | group-management | ✅ |
| 5 | send-messages | ✅ |
| 6 | conversations (chat) | ✅ |
| 7 | campaigns | ✅ |
| 8 | media-uploads | ✅ |

## O que fica no backend WA (não é deste bundle)

- Implementação dos routers, webhooks, workers — repo `api-zapi-multitenant`.
- Authz Fase 2 operacional (`groups:*`, `messages:send`, `campaigns:*`) — proposta alinhada; pendente no backend.

## Dúvidas

Abrir issue ou pedir export adicional no repo do backend WA. Recado CRM de referência:
`REQUEST-operational-contracts-groups-messages-campaigns.md` (raiz do repo WA).
