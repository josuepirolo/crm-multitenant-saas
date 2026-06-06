---
name: frontend-crm
description: Meta-skill de frontend para o CRM Vendas WhatsApp. Orquestra frontend-design, web-design-guidelines e vercel-react-best-practices na ordem certa. Use quando o usuário pedir para criar, construir, implementar, redesenhar, melhorar, auditar ou revisar qualquer componente, página, tela, layout, UI ou interface do CRM. Também ative quando mencionar visual, design, estilo, aparência, responsividade ou performance de frontend.
---

# frontend-crm — Meta-skill de Frontend

Orquestra as 3 skills de frontend do projeto na sequência correta conforme a intenção detectada.

## Stack do projeto

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · shadcn/ui · Radix UI · Framer Motion · Supabase

Tokens CSS centralizados em `src/app/globals.css`. Design system: padrão Apple (cantos arredondados, espaçamento generoso, superfícies translúcidas, motion suave). Nunca usar cores Tailwind literais — sempre tokens (`bg-background`, `text-foreground`, etc.).

## Detecção de intenção

Antes de qualquer ação, classifique o pedido em um dos 3 modos:

### Modo CRIAR
**Gatilhos:** "criar", "construir", "implementar", "adicionar", "novo componente", "nova página", "nova tela", "novo layout"

**Sequência:**
1. Leia `.sdds/CURRENT_STATE.md` e a spec do módulo afetado em `.sdds/specs/`
2. Aplique **frontend-design**: defina direção estética, tipografia, paleta, motion
3. Implemente seguindo **vercel-react-best-practices**: Server vs Client Components, parallel fetching, Suspense boundaries, sem rerenders desnecessários
4. Siga obrigatoriamente a skill **arquitetura** (Clean Architecture + MVVM) e **performance** (skeleton, toast.promise, useTransition)

### Modo AUDITAR
**Gatilhos:** "auditar", "revisar", "checar", "review", "está correto", "melhorar", "o que está errado", "verificar UI"

**Sequência:**
1. Leia `.sdds/CURRENT_STATE.md`
2. Aplique **web-design-guidelines**: busca as regras em `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` e audita os arquivos indicados
3. Aplique **vercel-react-best-practices**: identifique rerenders, bundle desnecessário, falta de Suspense
4. Liste achados no formato `arquivo:linha — problema — impacto`

### Modo REDESIGN
**Gatilhos:** "redesenhar", "melhorar visual", "refatorar UI", "modernizar", "deixar mais bonito", "está feio", "precisa melhorar"

**Sequência:**
1. Leia `.sdds/CURRENT_STATE.md` e o arquivo/componente atual
2. **web-design-guidelines** — audite o que existe (entenda os problemas antes de criar)
3. **frontend-design** — proponha nova direção estética com base nos problemas encontrados
4. **vercel-react-best-practices** — garanta que a implementação nova não introduce regressões de performance
5. Siga **arquitetura** e **performance** do projeto

## Regras inegociáveis do projeto

- Nunca hardcodar cores Tailwind (`gray-*`, `white`, `black`) — use sempre tokens CSS
- Skeleton loading obrigatório em toda listagem ou dashboard
- Animações via Framer Motion: 200ms micro-interações, 350ms transições, easing `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
- Dark mode testado em todos os componentes
- Mobile (375px) e desktop (1280px+) obrigatórios
- Toasts com `toast.promise()` para toda ação assíncrona
- `"use client"` apenas quando necessário — preferir Server Components

## Checklist antes de entregar

- [ ] Tokens CSS usados (nenhuma cor literal)
- [ ] Skeleton implementado
- [ ] Dark mode funcional
- [ ] Responsivo (mobile + desktop)
- [ ] Animações com Framer Motion
- [ ] Toasts configurados
- [ ] TypeScript sem erros (`npx tsc --noEmit`)
- [ ] Camadas Clean Architecture respeitadas (View → ViewModel → UseCase → Repository)

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
