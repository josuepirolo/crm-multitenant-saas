# 📦 Bundle de handoff — Frontend / CRM

Esta pasta reúne **tudo que o time de frontend/CRM precisa** para implementar a
integração WhatsApp e a arquitetura de autorização. É um pacote de entrega:
pode baixar a pasta inteira e repassar. Documentos fora desta pasta
(`docs/*.md`, `.sdds/`) são **internos do backend WA** — não fazem parte do
handoff.

Gerado a partir do repositório do backend WA (`api-zapi-multitenant`) em
2026-06-13. Fonte de verdade dos contratos: `.sdds/contracts/` do backend.

## O que tem aqui (ordem de leitura sugerida)

| # | Documento | Para quê | Quem usa |
|---|-----------|----------|----------|
| 1 | **`frontend-whatsapp-integration.md`** | Hierarquia superadmin/workspace/wa_tenant/membros, catálogo de endpoints de administração, fluxo de onboarding e matriz de permissões. Visão geral. | Frontend (UI) |
| 2 | **`wa-backend-integration-contracts.md`** | `WA_BACKEND_URL` + contratos request/response dos endpoints (`management-instances` com `/status` e `/qrcode`, `account-settings`). É o que destrava tipar a v2.1 sem adivinhar shape de JSON. | Frontend (UI) |
| 3 | **`authz-architecture-and-crm-handoff.md`** | Arquitetura de autorização cross-service, **contrato do claim `authz`** (a congelar) e **checklist de implementação do lado CRM** (migration, Custom Access Token Hook, seed). | Frontend/CRM (banco + Auth) |

## Dois fluxos de trabalho distintos

- **Construir a UI de Integrações agora** → docs **1 + 2**. Não dependem da
  arquitetura de autorização; o backend WA já está no ar em
  `https://messageapi.py.tec.br`.
- **Implementar a autorização correta no CRM** → doc **3**. Tem uma decisão
  pendente sinalizada no topo (gramática da chave de permissão) que precisa ser
  fechada antes da migration.

## O que fica no backend WA (não é deste bundle)

- A **Fase 0** (gate por papel nas rotas de conexão/identidade) é implementada
  no backend WA — ver `.sdds/specs/wa-rbac-gate.md` e
  `.sdds/decisions/ADR-008-...` no repo do backend. O frontend não precisa fazer
  nada nessa parte além de alinhar a UI (mostrar ações de escrita só p/
  owner/admin).

## Dúvidas

Falta o contrato completo de algum endpoint (provisioning, media-uploads) no
mesmo formato? Pedir ao time do backend WA que exporta para cá.
