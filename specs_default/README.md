# specs_default — Bootstrap Next.js seguro

Pacote portável de **especificações, práticas e skills** para iniciar projetos **Next.js (App Router)** com:

- Clean Architecture + MVVM
- Supabase Auth (+ decisão documentada para JWT customizado)
- Segurança reforçada (HttpOnly, RLS, Server Actions autenticadas, CSP)
- UI modular centralizada (tokens CSS, design system)
- Skills para **Claude Code** e **Cursor**

> **Idiomas:** conteúdo principal em **PT-BR**. Índices resumidos em [EN](i18n/en/INDEX.md) e [ES](i18n/es/INDEX.md).

> **SDDS:** este pacote **não** inclui o framework SDDS (memória viva). Copie `specs_default/` para a raiz do novo projeto e adapte.

---

## Como usar (humano ou LLM)

**Guia completo para projeto novo:** [`COMO-USAR-PROJETO-NOVO.md`](COMO-USAR-PROJETO-NOVO.md) ← leia isto primeiro ao copiar o pacote.

Resumo:

1. Leia [`INDEX.md`](INDEX.md) — roteador por tarefa
2. Execute [`00-bootstrap-new-project.md`](00-bootstrap-new-project.md) — checklist D0
3. Preencha [`TECH_STACK.template.md`](TECH_STACK.template.md) com versões **confirmadas**
4. Responda [`auth/decision-supabase-vs-custom-jwt.md`](auth/decision-supabase-vs-custom-jwt.md)
5. Copie [`env/env.example`](env/env.example) → `.env.local` na raiz do app
6. Instale skills de [`skills/`](skills/README.md) no harness Claude/Cursor do novo repo
7. Antes do primeiro commit sensível: [`security/security-checklist.md`](security/security-checklist.md)

---

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `architecture/` | Clean Arch, MVVM, pastas, regras de import |
| `auth/` | Supabase Auth vs JWT custom, cookies/sessão |
| `security/` | App Router, env, CSP, rate limit, erros, checklist |
| `env/` | `env.example` comentado (copiar → `.env.local`) |
| `ui/` | Design system, tokens, estados, pastas de componentes |
| `tooling/` | ESLint, hooks Git, CI mínimo |
| `testing/` | Harness de testes de segurança |
| `performance/` | Next.js / React (RSC, waterfalls) |
| `addons/supabase/` | SSR auth, RLS, migrations |
| `decisions/` | Template ADR |
| `skills/` | Claude (`SKILL.md`) + Cursor (`.mdc` / commands) |
| `i18n/` | Índices EN / ES |

---

## Origem

Extraído e generalizado a partir de práticas validadas em produção (CRM multitenant Next.js + Supabase). Sem regras de negócio de produto específico.
