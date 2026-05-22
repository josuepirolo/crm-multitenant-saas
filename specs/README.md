# /specs — Especificação Técnica do Projeto

Documentação viva do **CRM Vendas WhatsApp**. Gerada a partir do código real em 2026-05-22.

Serve para:
- Entender o que existe hoje sem precisar ler todo o código
- Guiar novos engenheiros (humanos ou LLMs) a continuar sem alucinar
- Evitar retrabalho e decisões duplicadas
- Recriar o projeto do zero se necessário

## Ordem de leitura recomendada

| # | Arquivo | O que você vai aprender |
|---|---|---|
| 0 | `00-visao-geral-do-projeto.md` | O que é, para quem, estado atual |
| 1 | `01-stack-tecnologica.md` | Stack completa com versões |
| 2 | `02-arquitetura-do-sistema.md` | Camadas, fluxo de dados, riscos |
| 3 | `03-estrutura-de-diretorios.md` | O que fica em cada pasta |
| 4 | `04-modelagem-e-dados.md` | Banco, entidades, multi-tenant |
| 5 | `05-autenticacao-e-seguranca.md` | Auth, sessão, RLS, RBAC |
| 6 | `06-fluxos-principais.md` | Fluxos end-to-end por feature |
| 7 | `07-integracoes.md` | Supabase, WA API, Turnstile, CEP |
| 8 | `08-padroes-de-codigo.md` | Convenções, nomenclatura, regras |
| 9 | `09-regras-de-negocio.md` | RN por módulo |
| 10 | `10-roadmap-tecnico.md` | O que falta e em que ordem fazer |
| 11 | `11-como-recriar-o-projeto-do-zero.md` | Passo a passo completo |
| 12 | `12-checklist-de-evolucao.md` | Checklist para evolução segura |
| 13 | `13-decisoes-arquiteturais.md` | ADRs simplificados |

> **Atenção:** Estes documentos descrevem o projeto real. Não inventam funcionalidades.
> Pontos em aberto são marcados explicitamente como `Ponto em aberto`.
> Riscos são marcados como `Risco identificado`.
