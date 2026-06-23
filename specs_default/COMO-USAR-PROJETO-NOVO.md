# Como usar `specs_default` em um projeto Next.js novo

> **Audiência:** LLMs (Cursor, Claude Code, etc.) e desenvolvedores no D0 do scaffold.  
> **Idioma:** PT-BR (índices EN/ES em `i18n/en/`, `i18n/es/`).  
> **Importante:** este pacote **não** inclui SDDS — memória viva é framework separado; não crie `.sdds/` só porque copiou `specs_default/`.

---

## Ordem de execução (LLM — siga nesta sequência)

### Passo 1 — Copiar o pacote

Copie a pasta **`specs_default/` inteira** para a **raiz** do novo repositório.

```
novo-projeto/
├── specs_default/     ← copiado integralmente
├── src/               ← será criado no scaffold
├── package.json
└── ...
```

Não renomeie subpastas internas (`architecture/`, `security/`, `skills/`, etc.) — os links entre specs dependem desses caminhos.

---

### Passo 2 — Intake do projeto

Leia e **conduza** (perguntando ao dev) o questionário:

→ [`questions/new-project-intake.md`](questions/new-project-intake.md)

Registre respostas no `TECH_STACK.template.md` e em ADR se houver JWT custom ou multi-tenant.

---

### Passo 3 — Decisão de autenticação

Leia e **resolva** com o dev (não assuma):

→ [`auth/decision-supabase-vs-custom-jwt.md`](auth/decision-supabase-vs-custom-jwt.md)

**Padrão embutido:** Supabase Auth + cookies HttpOnly via `@supabase/ssr`.  
**JWT custom / híbrido (BFF + claims):** só após ADR usando [`decisions/adr-template.md`](decisions/adr-template.md).

---

### Passo 4 — Instalar skills no harness

Copie do pacote para o **novo repo**:

| Origem | Destino no novo projeto |
|---|---|
| `specs_default/skills/claude/*/SKILL.md` | `.claude/skills/<nome>/SKILL.md` |
| `specs_default/skills/cursor/rules/*.mdc` | `.cursor/rules/` |
| `specs_default/skills/cursor/commands/*.md` | `.cursor/commands/` |

Detalhes: [`skills/README.md`](skills/README.md)

Referencie no `CLAUDE.md` / `AGENTS.md` do novo projeto (ex.: `@import .claude/skills/ui-execution-rules/SKILL.md`).

**Regra:** skills devem ser pasta `nome/SKILL.md` com frontmatter YAML (`name`, `description`) — nunca `.md` solto em `.claude/skills/`.

---

### Passo 5 — Variáveis de ambiente

1. Abra [`env/env.example`](env/env.example)
2. Copie o conteúdo para **`.env.local`** na **raiz do app Next.js** (mesmo nível que `package.json`)
3. Preencha valores reais (Supabase dashboard, secrets server-only)
4. **Nunca** commite `.env.local`

Leia também: [`security/env-and-secrets.md`](security/env-and-secrets.md)

#### Nota técnica — nome do arquivo env

O template está em **`specs_default/env/env.example`** (sem ponto inicial no nome).

Motivo: em alguns ambientes de geração de código, arquivos chamados `.env.example` na árvore de specs podem ser bloqueados ou ignorados pelo tooling.

**Ao usar no projeto novo:**

```bash
# Opção A — conteúdo na raiz com nome convencional
cp specs_default/env/env.example .env.local

# Opção B — manter template versionado no repo
cp specs_default/env/env.example .env.example
# depois: cp .env.example .env.local e preencher
```

Ambas são válidas. O que **não** pode: commitar secrets ou colocar `SUPABASE_SERVICE_ROLE_KEY` em variável `NEXT_PUBLIC_*`.

---

### Passo 6 — Bootstrap D0

Execute o checklist completo:

→ [`00-bootstrap-new-project.md`](00-bootstrap-new-project.md)

Inclui: pastas MVVM, `globals.css` com tokens, middleware Supabase, headers CSP, ESLint guardrails, estados UI.

Roteador geral: [`INDEX.md`](INDEX.md)

---

### Passo 7 — Antes do primeiro commit sensível

→ [`security/security-checklist.md`](security/security-checklist.md)

Ative mentalmente a skill `security-review-gate` ao tocar Server Actions, RLS, auth ou `.env`.

---

## Decisões já embutidas (não redecidir sem ADR)

| Tema | Decisão padrão |
|---|---|
| **Auth** | Supabase Auth; JWT custom só via fluxo em `auth/decision-supabase-vs-custom-jwt.md` |
| **Arquitetura** | Clean Architecture + MVVM — ver `architecture/clean-arch-mvvm.md` |
| **UI** | Tokens centralizados em `src/app/globals.css`; componentes `shared/`; estados loading/empty/error obrigatórios — ver `ui/` |
| **Segurança** | Cookies HttpOnly; RLS em tabelas user-facing; Server Actions autenticadas no corpo; CSP + headers; rate limit em auth; webhooks com HMAC; anti-IDOR (tenant do server) — ver `security/` |
| **i18n specs** | PT-BR fonte; índices resumidos EN/ES em `i18n/en/INDEX.md` e `i18n/es/INDEX.md` |
| **Migrations DB** | Versionadas em `supabase/migrations/` — ver `addons/supabase/migrations-policy.md` |
| **SDDS** | **Fora deste pacote** — não misturar com memória viva do CRM origem |

---

## O que a LLM deve ler antes de gerar código

Ordem mínima:

1. [`TECH_STACK.template.md`](TECH_STACK.template.md) — **versões confirmadas** (perguntar se `A_CONFIRMAR`)
2. [`architecture/clean-arch-mvvm.md`](architecture/clean-arch-mvvm.md)
3. [`architecture/folder-structure.md`](architecture/folder-structure.md)
4. [`addons/supabase/auth-ssr.md`](addons/supabase/auth-ssr.md) (se Supabase)
5. [`ui/tokens-and-globals.md`](ui/tokens-and-globals.md)
6. Skill [`skills/claude/arquitetura/SKILL.md`](skills/claude/arquitetura/SKILL.md)

---

## Anti-patterns (LLM — não faça)

| ❌ | ✅ |
|---|---|
| Criar `.sdds/` automaticamente ao copiar specs | Usar só `specs_default/` até o dev pedir SDDS |
| Assumir Next/React versão latest | Confirmar `TECH_STACK.template.md` |
| `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` server-only |
| Supabase direto em `components/` | Server Action → UseCase → Repository |
| Pular intake/decisão auth | Passos 2 e 3 obrigatórios |
| Hex / `gray-*` no JSX | `var(--token)` |

---

## Checklist rápido (copiar/colar)

```
[ ] specs_default/ na raiz do novo repo
[ ] new-project-intake.md respondido
[ ] decision-supabase-vs-custom-jwt.md resolvido (+ ADR se JWT custom)
[ ] TECH_STACK.template.md preenchido
[ ] skills Claude + Cursor instaladas
[ ] env/env.example → .env.local (secrets preenchidos, não commitados)
[ ] 00-bootstrap-new-project.md concluído
[ ] security-checklist.md antes do deploy
```

---

## Referência cruzada

| Documento | Propósito |
|---|---|
| [`README.md`](README.md) | Visão geral do pacote |
| [`INDEX.md`](INDEX.md) | Roteador por tarefa |
| [`skills/claude/frontend-bootstrap/SKILL.md`](skills/claude/frontend-bootstrap/SKILL.md) | Skill orquestradora de bootstrap |
