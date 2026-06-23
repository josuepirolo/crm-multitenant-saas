---
name: screen-architecture
description: Mapeia telas, fluxos, componentes e estrutura de pastas do produto, gerando docs/screens.md a partir de docs/brand.md e docs/design-system.md. Chamada pela skill frontend-init na Fase 3 do planejamento — não ativar diretamente exceto se o usuário pedir explicitamente para remapear a arquitetura de telas.
---

# SKILL: screen-architecture
# Mapeia telas, fluxos, componentes e estrutura de pastas
# Chamada por: frontend-init — Fase 3
# Depende de: docs/brand.md + docs/design-system.md

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

## Função
Ler os documentos gerados nas fases anteriores e produzir:
1. Mapa de navegação completo
2. Especificação de cada tela (layout, componentes, estados, dados)
3. Estrutura de pastas do projeto
4. Ordem de implementação recomendada

Tudo salvo em `docs/screens.md`.

---

## PROTOCOLO DE EXECUÇÃO

### Passo 1 — Confirmar módulos
Leia `docs/brand.md` e extraia a lista de módulos do produto.
Apresente ao usuário e pergunte:

```
Baseado no que você descreveu, o sistema terá estes módulos:
[lista extraída do brand.md]

Quer adicionar, remover ou renomear algum antes de continuar?
```

### Passo 2 — Perguntas de estrutura (se necessário)
Se as respostas do brand-discovery não deixaram claro, pergunte:

```
A. O sistema tem área pública (landing, login) separada da área logada?
B. Existe onboarding/wizard de configuração inicial?
C. Quais módulos têm subrotas? (ex: /contatos/:id)
D. Existe alguma tela de tempo real? (dashboard ao vivo, chat, notificações)
```

### Passo 3 — Gerar screens.md
Com todas as informações, gere o arquivo completo.

---

## ESTRUTURA DO screens.md

```markdown
# Arquitetura de Telas — [Nome do Produto]

## Mapa de navegação

[Gerar mapa ASCII com todas as rotas]

Exemplo:
/
├── /login
├── /onboarding (se houver)
└── /app
    ├── /dashboard
    ├── /[modulo-1]
    │   └── /[modulo-1]/:id
    ├── /[modulo-2]
    └── /settings
        ├── /settings/workspace
        └── /settings/[subseção]

## Layout global

[Descrever o shell da aplicação]

Sidebar:
- Collapsed: 64px | Expanded: 240px
- Items: [lista com ícone sugerido e rota de cada módulo]
- Footer: avatar + nome + status online

Topbar:
- Height: 56px
- Esquerda: título da página atual
- Direita: ações contextuais (variam por tela)

Main content:
- Ocupa o espaço restante (flex-1)
- Padding: 24px desktop, 16px mobile

---

## Telas

### TELA [N] — [Nome da tela]

**Rota:** /app/[rota]
**Perfis com acesso:** [todos | admin | atendente | etc]
**Tela principal do produto:** [sim/não]

**Layout:**
[ASCII wireframe da tela]

**Componentes necessários:**
- [ComponenteA] — [o que faz]
- [ComponenteB] — [o que faz]

**Estados obrigatórios:**
- Loading: [o que mostrar]
- Empty: [mensagem + ação]
- Error: [mensagem + retry]

**Dados necessários:**
- [dado 1]: [de onde vem — API endpoint ou mock]
- [dado 2]: [de onde vem]

**Ações do usuário:**
- [ação 1] → [o que acontece]
- [ação 2] → [o que acontece]

**Notas de UX:**
- [observação importante sobre esta tela específica]

---
[repetir bloco acima para cada tela]

---

## Componentes compartilhados

[Lista de componentes que aparecem em mais de uma tela]

| Componente | Usado em | Variantes |
|------------|----------|-----------|
| [nome]     | [telas]  | [variantes] |

---

## Estrutura de pastas

src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          ← shell: sidebar + topbar
[gerar restante baseado nos módulos do produto]
│   └── layout.tsx
├── components/
│   ├── ui/                     ← shadcn components (não editar)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── AppShell.tsx
│   ├── shared/                 ← componentes do design system
│   │   ├── MetricCard.tsx
│   │   ├── Badge.tsx
│   │   ├── StatusDot.tsx
│   │   ├── Avatar.tsx
│   │   ├── Skeleton.tsx
│   │   └── EmptyState.tsx
[gerar pastas por módulo baseado nas telas]
├── hooks/
│   ├── use[Modulo].ts          ← um hook por módulo principal
│   └── useDebounce.ts
├── stores/
│   ├── uiStore.ts              ← sidebar state, theme, toasts
[gerar stores por módulo se necessário]
├── lib/
│   ├── api.ts                  ← cliente HTTP base
│   ├── utils.ts                ← helpers gerais
│   └── constants.ts            ← constantes do projeto
├── types/
│   ├── [modulo].ts             ← tipos por módulo
│   └── api.ts                  ← tipos de resposta da API
└── styles/
    └── globals.css             ← gerado pelo design-system-gen

---

## Ordem de implementação recomendada

[Gerar lista ordenada baseada no que o usuário disse ser a tela principal
e nas dependências entre telas]

Fase 1 — Fundação (fazer primeiro, tudo depende disso):
1. globals.css + design tokens
2. AppShell (Sidebar + Topbar + layout)
3. Componentes shared (MetricCard, Badge, StatusDot, Avatar, Skeleton, EmptyState)

Fase 2 — Tela principal (validar o design system na prática):
4. [Tela principal identificada no brand.md]
5. [Segunda tela mais usada]

Fase 3 — Telas secundárias:
6. [restante em ordem de prioridade]

Fase 4 — Telas de configuração e admin:
[settings, onboarding, etc]

---

## Dados mockados para desenvolvimento

[Gerar exemplos de dados mock para cada módulo principal,
baseados nos campos que o usuário descreveu]

Exemplo:
```typescript
// src/lib/mocks/[modulo].ts
export const mock[Entidade]s = [
  {
    id: '[modulo]_001',
    // campos derivados do que o usuário descreveu
  }
]
```

---

## Notas de responsividade

| Breakpoint | Sidebar | Layout principal | Observações |
|------------|---------|------------------|-------------|
| Mobile <768px | Drawer | Coluna única | [nota específica do produto] |
| Tablet 768-1024px | Drawer | [layout] | [nota] |
| Laptop 1024-1280px | Collapsed 64px | [layout] | [nota] |
| Desktop 1280px+ | Expanded 240px | [layout] | [nota] |

```

---

## REGRAS DE EXECUÇÃO DESTA SKILL

- Gerar wireframes ASCII para todas as telas com layout não-trivial
- Toda tela deve ter estados de loading, empty e error documentados
- Componentes compartilhados devem ser identificados antes de gerar as pastas
  (evita duplicação no código)
- A ordem de implementação deve sempre começar pelo AppShell e shared components
- Se o usuário identificou uma "tela principal" no brand.md, ela vai para a Fase 2
- Dados mock devem ser tipados — gerar a interface TypeScript junto com o mock
- Nunca inventar funcionalidades que o usuário não mencionou —
  se houver dúvida, documentar como "a confirmar" e perguntar
