# SDDS RUNTIME ENTRYPOINT

Before any task, read and follow:

- `_sdds_private/00A_SDDS_LLM_RUNTIME_ADAPTER.md`
- `_sdds_private/00_SDDS_SESSION_ORCHESTRATOR.md`

Do not bypass SDDS.
Do not implement before specs/contracts/harness.
Use `.sdds/` as public project memory (sanitized, operational). SDDS runtime and governance live in `_sdds_private/`.

# CLAUDE.md

<available_skills>
<skill>
<name>direto</name>
<description>Ativa um modo de resposta direta, curta e sem rodeios. Use sempre que o usuário pedir respostas concisas, disser "seja direto", "sem enrolação", "vai direto ao ponto", ou quando claramente não quer explicações longas. Prefira este modo por padrão em perguntas simples e objetivas.</description>
<location>.claude/skills/direto/SKILL.md</location>
</skill>

<skill>
<name>economico</name>
<description>Ativa modo de economia de tokens e execução direta. Use quando o usuário pedir para economizar tokens, evitar exploração desnecessária, reduzir chamadas de ferramentas, ou quando a tarefa for simples o suficiente para não precisar de contexto adicional. Ative também quando o usuário disser "economico", "modo econômico" ou "não explore demais".</description>
<location>.claude/skills/economico/SKILL.md</location>
</skill>

<skill>
<name>patch</name>
<description>Ativa modo de patch mínimo — resolve o problema com a menor alteração possível. Use quando o usuário pedir uma correção pontual, um fix rápido, ou disser "não mexa em mais nada", "só corrija isso", "patch mínimo". Ideal para bugs isolados onde reescrever ou refatorar seria excessivo.</description>
<location>.claude/skills/patch/SKILL.md</location>
</skill>

<skill>
<name>arquitetura</name>
<description>Guia de arquitetura Clean Architecture + MVVM do CRM Vendas WhatsApp. OBRIGATÓRIO antes de qualquer código — sem exceção. Ative sempre que o usuário pedir para criar ou alterar módulo, feature, página, componente, Server Action, repositório, usecase ou viewmodel. Também ative em revisões, refatorações e auditorias. Gere sempre um plano estruturado por camadas antes de escrever qualquer linha. Esta skill deve ser a primeira a ser carregada em toda sessão de implementação.</description>
<location>.claude/skills/arquitetura/SKILL.md</location>
</skill>

<skill>
<name>performance</name>
<description>Análise de performance e UX do CRM Vendas WhatsApp. OBRIGATÓRIO em toda implementação ou alteração de código — seja um componente, Server Action, query, migration ou qualquer mudança mínima. Sempre ative junto com a skill de arquitetura: arquitetura define a estrutura, performance garante que nenhuma operação bloqueie o usuário. Ative também quando mencionar "lento", "travando", "fila", "background", "otimista", "UX" ou quando houver risco de o usuário esperar por uma operação assíncrona.</description>
<location>.claude/skills/performance/SKILL.md</location>
</skill>

<skill>
<name>auditoria</name>
<description>Auditoria profissional completa do CRM Vendas WhatsApp — frontend, backend, comunicação, segurança, Clean Architecture, MVVM, design system e hardcode. Ative quando o usuário pedir auditoria, revisão geral, diagnóstico do projeto ou quiser saber se o código está seguro e consistente. Produz diagnóstico executivo com evidências por arquivo, mapa arquitetural real, problemas priorizados e plano de correção. Não responde com teoria genérica — audita o código real.</description>
<location>.claude/skills/auditoria/SKILL.md</location>
</skill>

<skill>
<name>skill-creator</name>
<description>Cria, melhora e avalia skills. Usar quando o usuário quiser criar uma nova skill ou melhorar uma existente.</description>
<location>.claude/skills/skill-creator/SKILL.md</location>
</skill>
</available_skills>

## Uso obrigatório de skills

As skills abaixo são **obrigatórias** nas seguintes situações — não são opcionais:

| Situação | Skills obrigatórias |
|---|---|
| Criar módulo, feature, página ou componente | `arquitetura` → `performance` |
| Refatorar ou revisar código existente | `arquitetura` → `performance` |
| Qualquer alteração de código (mesmo mínima) | `performance` |
| Correção pontual / fix rápido | `patch` → `performance` |
| Auditar o projeto (diagnóstico, revisão geral, segurança) | `auditoria` |
| Criar ou melhorar uma skill | `skill-creator` |
| Resposta curta / sem enrolação | `direto` |
| Economizar tokens / execução direta | `economico` |

A skill de `arquitetura` sempre precede a de `performance`. Nenhuma linha de código é escrita sem passar pelas duas.

## Projeto
**CRM Vendas WhatsApp** — plataforma SaaS para gestão de vendas via WhatsApp. Permite gerenciar leads, contatos, conversas, funis de vendas e análise de performance. Público-alvo: empresas e equipes de vendas que usam WhatsApp como canal principal.

## Stack
- **Framework:** Next.js 16 (App Router) — conferir `package.json` para versão exata; APIs podem divergir do material antigo de Next 15
- **Linguagem:** TypeScript
- **Estilo:** Tailwind CSS
- **Componentes:** shadcn/ui + Radix UI
- **Backend/DB:** Supabase (PostgreSQL + Realtime + Storage)
- **Autenticação:** Supabase Auth
- **Formulários:** React Hook Form + Zod
- **Animações:** Framer Motion

## Funcionalidades principais
- Bate-papo WhatsApp integrado (inbox de conversas)
- Gestão de leads e contatos
- Kanban de negociações
- Funis de vendas personalizáveis
- Dashboards e analytics
- Multi-tenant (SaaS — cada empresa é um workspace isolado)

## Estrutura de pastas relevante
```
src/
├── app/                  # Apresentação — rotas Next.js (App Router)
│   ├── (auth)/           # login, registro, recuperação de senha
│   ├── (dashboard)/      # área autenticada
│   └── api/              # route handlers
├── components/
│   ├── ui/               # componentes base (shadcn/ui)
│   └── [feature]/        # componentes visuais por funcionalidade (View)
├── viewmodels/           # MVVM — hooks de estado e lógica de apresentação
├── usecases/             # Regras de negócio — um arquivo por caso de uso
├── repositories/         # Acesso a dados — interface + implementação Supabase
├── lib/
│   ├── supabase/         # Infraestrutura — clientes Supabase (browser, server, middleware)
│   ├── validations/      # Schemas Zod
│   └── utils/            # utilitários gerais
└── types/                # Entidades de domínio e DTOs
```

## Comandos essenciais
- `npm run dev`       — inicia o servidor de desenvolvimento
- `npm run build`     — build de produção
- `npm run lint`      — verifica lint
- `npm run typecheck` — verifica tipos TypeScript
- `npm test`          — suíte Vitest (segurança, RLS, isolamento, etc.)

## Componentes reutilizáveis obrigatórios (`src/components/ui/`)

Antes de criar qualquer input para estes tipos de dado, **use o componente existente**. Nunca duplique lógica de máscara, validação ou formatação.

| Campo | Componente | Importação |
|---|---|---|
| Telefone BR (fixo/celular + WhatsApp) | `<PhoneField>` | `@/components/ui/phone-field` |
| E-mail | `<EmailField>` | `@/components/ui/email-field` |
| CPF / CNPJ | `<DocumentField>` | `@/components/ui/document-field` |
| Endereço completo + CEP lookup | `<AddressFields>` | `@/components/ui/address-fields` |
| Download app autenticador (QR/badge) | `<AppStoreBadges>` | `@/components/ui/app-store-badges` |

Todos aceitam `value`, `onChange`, `disabled`, `error` e `label`. Integram com react-hook-form via `watch()`/`setValue()`.

---

## Convenções do projeto
- Nomenclatura: PascalCase para componentes, camelCase para hooks e utilitários
- Imports absolutos a partir de `src/`
- Commits em português no padrão Conventional Commits (feat:, fix:, chore:, etc.)
- Nunca commitar direto na `main`
- Cada workspace (empresa) é isolado via `workspace_id` em todas as tabelas

## Contexto adicional
- Produto SaaS multi-tenant — segurança e isolamento de dados entre workspaces é prioridade
- Supabase Realtime para atualização ao vivo das conversas e kanban
- Foco em visual de alta qualidade — dashboards ricos, UI moderna e responsiva

@import .claude/rules/ui-design.md
@import .claude/rules/security.md
@import .claude/rules/architecture.md
