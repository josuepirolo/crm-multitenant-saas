---
name: security-review-gate
description: Gate de revisão de segurança — OBRIGATÓRIO antes de alterar código sensível e antes de qualquer git commit/push. Roda um checklist objetivo contra as regras explícitas do projeto (.claude/rules/security.md, security-checklist.md, auditora.md). Ative sempre que for criar/alterar Server Actions, API Routes, repositories, queries Supabase, fluxos de auth/sessão/MFA, RLS/policies, uploads, webhooks, integrações externas, ou sempre que estiver prestes a commitar/dar push em qualquer uma dessas áreas.
---

# Skill: Security Review Gate — CRM Vendas WhatsApp

## Princípio fundamental

Este projeto **já tem regras de segurança explícitas e obrigatórias** — não são teoria genérica, são requisitos vivos:

- `.claude/rules/security.md` — padrões completos (multi-tenancy/RLS, auth/sessão, cookies, CORS, headers, validação, segredos, proteção contra ataques OWASP, checklist final)
- `.claude/rules/security-checklist.md` — checklist operacional vivo com status real (`[x]`/`[ ]`) do que está implementado
- `.claude/rules/auditora.md` — roteiro de auditoria de comunicação frontend↔backend e Clean Architecture

Esta skill existe para **forçar a consulta a essas regras em dois momentos críticos**: antes de escrever/alterar código sensível, e antes de consolidar isso em um commit. Pular essa etapa é como editar `getActiveWorkspaceContext` sem checar se o erro está sendo mascarado — o problema só aparece em produção.

## Quando ativar (gatilhos)

**Antes de alterar/criar código em:**
- Server Actions (`app/**/actions.ts`)
- API Routes / Route Handlers (`app/api/**`)
- Repositories (`src/repositories/`) e qualquer query Supabase
- Fluxos de autenticação, sessão, MFA, recovery, login/logout
- RLS policies, migrations que tocam permissões/tenant
- Upload de arquivos, webhooks, integrações externas (Z-API, etc.)
- Middleware/proxy (`src/proxy.ts`, `src/lib/supabase/middleware.ts`)
- Qualquer lugar que decida o que o usuário pode ver ou fazer

**Antes de qualquer `git commit` ou `git push`** que toque nessas áreas — mesmo que pareça uma mudança pequena.

## Checklist — ANTES de alterar código (consulta rápida às regras)

Releia mentalmente contra `.claude/rules/security.md`:

- [ ] `workspace_id`/tenant vem **sempre** do contexto autenticado (sessão/JWT) — nunca do client, nunca de parâmetro de URL/form sem revalidação
- [ ] RLS está ativa na(s) tabela(s) envolvidas — nunca desabilitar, nem "temporariamente"
- [ ] `service_role` não está sendo usado em fluxo de usuário comum (só Route Handlers/Server Actions específicos, documentados)
- [ ] Inputs validados com Zod **no servidor** (a validação client-side é só UX)
- [ ] Nenhum segredo (`service_role`, tokens de API, secrets de webhook) pode acabar em `NEXT_PUBLIC_*`, no bundle do client, ou em resposta ao cliente
- [ ] Erros expostos ao cliente são genéricos — detalhes (stack trace, mensagem interna do Supabase/GoTrue) só em `console.error` no servidor, **sem** senha/token/secret no log
- [ ] Cookies de sessão continuam `HttpOnly + Secure + SameSite=Lax`
- [ ] Mudança não abre brecha de IDOR (checar se o recurso pertence ao workspace do usuário autenticado antes de qualquer leitura/escrita)
- [ ] Se for rota/action sensível: rate limit aplicado (login, registro, reset, envio de mensagem, convite)

## Checklist — ANTES de commitar/dar push

- [ ] `git diff`/`git status`: nenhum `.env`, `credentials`, chave privada, token ou arquivo de segredo sendo staged
- [ ] Nenhum `console.log`/`console.error` novo expõe senha, token, secret, `service_role` ou PII desnecessária
- [ ] Se a mudança envolve schema/RLS/policy: existe migration versionada em `supabase/migrations/` (nunca SQL ad-hoc — ver skill [[migration-drift-guard]]; isso já causou um outage de produção em 2026-06-08)
- [ ] Se a mudança altera fluxo de auth/permissão/RLS: rodar a suíte de segurança (`src/tests/security/`) antes de finalizar — não quebrar os testes existentes
- [ ] Mensagem de commit não vaza segredo nem dado sensível (tokens, senhas, payloads de produção)
- [ ] Se uma decisão arquitetural de segurança foi tomada (ex: trocar estratégia de validação, mudar onde uma operação roda), está registrada em `.sdds/decisions/` — não deve ficar só na cabeça de quem implementou

## Como agir ao encontrar uma violação

1. **Não commitar.** Corrigir primeiro — segurança não é um "depois eu arrumo".
2. Se for um padrão recorrente (ex: erro mascarado, validação faltando), considerar se vale registrar como discovery em `.sdds/discoveries/` para não se repetir — três bugs de produção recentes (captcha, AAL2, outage `business_niches`) vieram exatamente de erros reais sendo mascarados sem log.
3. Se a correção for arquitetural (não um ajuste pontual), seguir a skill `arquitetura` antes de codar.

## Referência rápida — onde cada regra mora

| Preciso saber sobre... | Consultar |
|---|---|
| Estratégia de acesso ao Supabase (quando usar anon vs service_role, client vs server) | `.claude/rules/security.md` § "Estratégia de acesso ao Supabase" |
| Status real do que já está implementado vs pendente | `.claude/rules/security-checklist.md` |
| Cookies, sessão, CORS, headers HTTP | `.claude/rules/security.md` |
| Como auditar comunicação frontend↔backend de ponta a ponta | `.claude/rules/auditora.md` |
| Padrão de log de erro sem mascarar (regra de ouro nº3) | skill `migration-drift-guard` |
| Arquitetura/Clean Architecture/MVVM antes de implementar | skill `arquitetura` |

## Nota sobre o tom

Esta skill não substitui julgamento — é um lembrete estruturado para consultar regras que **já existem e são explícitas neste projeto**. Se uma regra do checklist não se aplica claramente ao caso, diga isso objetivamente em vez de marcar como ok por hábito.
