---
name: frontend-init
description: Orquestradora do sistema de planejamento de frontend (SDDS Frontend System). Verifica o estado dos artefatos de frontend (docs/brand.md, src/styles/globals.css, docs/design-system.md, docs/screens.md, CLAUDE.md) e decide automaticamente entre iniciar planejamento do zero, completar o que falta, ou carregar contexto existente. Ative quando o usuário digitar /frontend-init, pedir para "iniciar frontend" ou "verificar contexto de frontend".
---

# SKILL: FRONTEND-INIT v2
# Guardião de contexto + orquestradora do sistema de planejamento de frontend

## Função
Verificar o estado atual dos artefatos de frontend do projeto e decidir
automaticamente o que fazer: iniciar do zero, completar o que falta, ou
carregar o contexto existente e confirmar que está pronto para codar.

## Stack fixada
Next.js 14+ (App Router) · TypeScript strict · Tailwind CSS v3 · shadcn/ui · Zustand · React Query v5

## Artefatos que gerencia
- `docs/brand.md`            — identidade visual do produto
- `src/styles/globals.css`   — tokens CSS completos
- `docs/design-system.md`    — componentes base documentados
- `docs/screens.md`          — arquitetura de telas e fluxos
- `CLAUDE.md`                — configuração do projeto

## SDDS Context

Antes de iniciar qualquer tarefa:
1. Leia `.sdds/CURRENT_STATE.md` — estado atual consolidado do projeto
2. Leia `.sdds/INDEX.md` — roteador para specs relevantes
3. Leia `.sdds/specs/[módulo-afetado].md` — regras do módulo antes de tocar qualquer arquivo

Durante a execução:
- Nunca criar arquivos fora da estrutura definida em `.sdds/specs/`
- Nunca usar `--no-verify`, `--force` em branches protegidas, ou ignorar erros de hook
- Se uma decisão arquitetural for tomada, sinalizar para o usuário registrar em `.sdds/decisions/`

Após concluir:
- Reportar: arquivos alterados, decisões tomadas, perguntas em aberto
- Sugerir ao usuário rodar `/sdds-update` se a sessão foi substantiva
- Se `README.md` precisar de atualização (nova feature adicionada/alterada), dizer explicitamente

---

## PROTOCOLO — FASE 0: DIAGNÓSTICO (sempre executa primeiro)

Ao ser ativada, antes de qualquer outra ação, execute o diagnóstico completo.
Nunca assuma que os arquivos existem ou não existem — sempre verifique.

### Passo 0.1 — Verificar existência dos artefatos

Tente ler cada um dos 5 artefatos e classifique cada um como:
- ✅ COMPLETO   — arquivo existe e tem todos os campos obrigatórios preenchidos
- ⚠️ INCOMPLETO — arquivo existe mas tem campos vazios, placeholders ou seções faltando
- ❌ AUSENTE    — arquivo não existe

Campos obrigatórios por artefato:

**docs/brand.md — obrigatório ter:**
- Nome do produto
- Paleta gerada (todos os tokens --bg-*, --text-*, --accent, --success, --warning, --error, --info)
- Tipografia (display, corpo, mono)
- Tom e personalidade (adjetivos + referência visual)
- Módulos do sistema (lista)
- Tela principal identificada

**src/styles/globals.css — obrigatório ter:**
- Seção :root com todos os tokens de cor
- Tokens de tipografia (--font-sans, --font-mono, escala --text-*)
- Tokens de espaçamento (--radius-*, --shadow-*)
- Tokens de transição (--transition-*)
- Classes utilitárias (.card, .badge-*, .metric-card, .skeleton)
- Reset base (body com font-family e background)

**docs/design-system.md — obrigatório ter:**
- Tabela de tokens de cor
- Documentação de Button (variantes + estados)
- Documentação de Input
- Documentação de Card
- Lista de componentes compartilhados
- Padrões de layout (Sidebar, Topbar, Grid)
- Seção "O que está proibido"

**docs/screens.md — obrigatório ter:**
- Mapa de navegação (rotas)
- Especificação de cada tela (mínimo: layout, componentes, estados)
- Estrutura de pastas
- Ordem de implementação

**CLAUDE.md — obrigatório ter:**
- Descrição do projeto preenchida (não placeholder)
- Stack declarada
- Import de ui-execution-rules.md

### Passo 0.2 — Montar relatório de diagnóstico

Após verificar todos os artefatos, apresente ao usuário:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SDDS Frontend — Diagnóstico do Projeto
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

docs/brand.md          [status]
src/styles/globals.css [status]
docs/design-system.md  [status]
docs/screens.md        [status]
CLAUDE.md              [status]

[Se tudo ✅]:
  Contexto completo encontrado. Carregando...

[Se algum ❌ ou ⚠️]:
  Encontrei [N] artefato(s) que precisam de atenção.
  Veja o plano de ação abaixo.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Passo 0.3 — Decidir caminho

Com base no diagnóstico, siga o caminho correto:

**→ CAMINHO A:** Todos ✅ → ir para FASE A (carregar e confirmar)
**→ CAMINHO B:** Todos ❌ → ir para FASE B (iniciar do zero)
**→ CAMINHO C:** Mix de ✅ ⚠️ ❌ → ir para FASE C (completar o que falta)

---

## CAMINHO A — Contexto completo: carregar e confirmar

Quando todos os 5 artefatos estão ✅ COMPLETO.

### A.1 — Carregar contexto
Leia todos os artefatos e extraia:
- Nome e propósito do produto
- Paleta de cores ativa
- Módulos existentes
- Telas especificadas
- Última tela ou componente trabalhado (se mencionado no CLAUDE.md)

### A.2 — Apresentar resumo ao usuário

```
Contexto frontend carregado com sucesso.

Produto:    [nome] — [tagline]
Tema:       [dark/light/ambos]
Accent:     [hex] ([nome da cor])
Módulos:    [lista em linha]
Telas:      [N] telas especificadas
Stack:      Next.js 14 · Tailwind · shadcn/ui · Zustand · React Query

Tudo pronto para codificação. O que vamos construir?
```

### A.3 — Manter contexto ativo
A partir deste momento, a skill `ui-execution-rules` está implicitamente ativa.
Todas as respostas de código seguem as regras do design system carregado.
Não é necessário re-importar ou re-explicar as regras.

---

## CAMINHO B — Projeto do zero: executar todas as fases

Quando todos os 5 artefatos estão ❌ AUSENTE.

### B.0 — Abertura
```
Nenhum artefato de frontend encontrado. Vou conduzir o planejamento completo.

Fase 1 — Descoberta de marca e produto
Fase 2 — Geração do design system
Fase 3 — Arquitetura de telas
Fase 4 — Configuração final

Vamos começar com as perguntas sobre o produto.
```

### B.1 — Executar brand-discovery
Ative a skill `brand-discovery` completamente.
Apresente as perguntas em blocos como definido na skill.
Ao final, gere e salve `docs/brand.md`.
Confirme com o usuário: "docs/brand.md gerado. Posso avançar para o design system?"

### B.2 — Executar design-system-gen
Leia `docs/brand.md` e ative a skill `design-system-gen`.
Gere `src/styles/globals.css` e `docs/design-system.md`.
Confirme com o usuário antes de avançar.

### B.3 — Executar screen-architecture
Leia `docs/brand.md` + `docs/design-system.md`.
Ative a skill `screen-architecture`.
Gere `docs/screens.md`.
Confirme com o usuário antes de avançar.

### B.4 — Gerar CLAUDE.md final
Gere o `CLAUDE.md` com:
- Descrição do projeto (extraída do brand.md)
- Stack fixada
- Estrutura de pastas (extraída do screens.md)
- `@import .claude/skills/ui-execution-rules/SKILL.md`
- Referências aos docs gerados

### B.5 — Resumo final
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Planejamento de frontend concluído!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Gerado:
  ✅ docs/brand.md
  ✅ src/styles/globals.css
  ✅ docs/design-system.md
  ✅ docs/screens.md
  ✅ CLAUDE.md

Próximo passo recomendado:
  Implementar AppShell (Sidebar + Topbar + layout base)
  → docs/screens.md → seção "Ordem de implementação"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## CAMINHO C — Artefatos parciais: completar o que falta

Quando há mix de ✅ ⚠️ ❌.

### C.1 — Montar plano de ação específico

Para cada artefato com problema, descreva exatamente o que falta:

```
Encontrei o seguinte:

✅ docs/brand.md          — completo, carregado
⚠️ src/styles/globals.css — existe mas faltam os tokens --shadow-* e classes .badge-*
❌ docs/design-system.md  — não encontrado
✅ docs/screens.md        — completo, carregado
⚠️ CLAUDE.md              — existe mas a descrição do projeto é placeholder

Plano de ação:
  1. Completar src/styles/globals.css (tokens faltando)
  2. Gerar docs/design-system.md do zero
  3. Atualizar CLAUDE.md com descrição real do projeto

Posso executar tudo agora. Confirma?
```

### C.2 — Aguardar confirmação do usuário
Não execute nada sem confirmação explícita.
Se o usuário quiser pular algum item do plano, aceite e registre.

### C.3 — Executar apenas o que falta

Para cada artefato ❌ AUSENTE:
→ Ative a skill correspondente do zero

Para cada artefato ⚠️ INCOMPLETO:
→ Leia o arquivo existente
→ Identifique exatamente o que falta (não regere o arquivo inteiro)
→ Adicione apenas as seções/campos ausentes
→ Preserva o que já estava correto

Mapeamento artefato → skill:
- `docs/brand.md`            → skill `brand-discovery`
- `src/styles/globals.css`   → skill `design-system-gen`
- `docs/design-system.md`    → skill `design-system-gen`
- `docs/screens.md`          → skill `screen-architecture`
- `CLAUDE.md`                → gerado pela orquestradora (não tem skill própria)

### C.4 — Confirmar ao final de cada correção
Após cada artefato corrigido ou gerado, confirme com o usuário antes de avançar.

### C.5 — Relatório final do Caminho C
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Contexto frontend atualizado!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Corrigido/gerado agora:
  ✅ src/styles/globals.css  — tokens completados
  ✅ docs/design-system.md   — gerado
  ✅ CLAUDE.md               — descrição atualizada

Já existia e está ok:
  ✅ docs/brand.md
  ✅ docs/screens.md

Contexto completo. O que vamos construir?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## REGRAS GERAIS DE ORQUESTRAÇÃO

- **Diagnóstico primeiro, sempre** — nunca pule o Passo 0.1, mesmo que o usuário
  diga "já tenho tudo" ou "pode começar direto"
- **Nunca regere um artefato completo para corrigir algo parcial** — cirurgicamente
  adicione só o que falta
- **Nunca invente dados do negócio** — se o brand.md não tiver uma informação
  necessária para outra fase, pergunte ao usuário, não assuma
- **Aproveite contexto da conversa** — se o usuário já descreveu o produto antes
  de ativar esta skill, use essas informações nas perguntas do brand-discovery
  (pule o que já foi respondido, informe quais perguntas foram puladas)
- **Confirmação entre fases** — nunca avance de uma fase para outra sem
  confirmação explícita do usuário
- **Em caso de dúvida entre opções visuais** — apresente as duas com exemplos
  ASCII e deixe o usuário escolher; nunca decida sozinho em questões de identidade
- **Artefatos são a fonte de verdade** — em toda sessão posterior (após /clear),
  o contexto vem dos arquivos, não da memória da conversa anterior
