# Design System — CRM Vendas WhatsApp

> Documento gerado por reverse-engineering do código existente (2026-06-17). Reflete os componentes e padrões **já implementados** em `src/components/ui/` e `.claude/rules/ui-design.md`. Não inventa variantes que não existem no código.

## Stack base
Tailwind CSS v4 · `@base-ui/react` (primitivos headless — não Radix) · `class-variance-authority` (cva) · `shadcn` CLI · `tailwind-merge` via `cn()` (`src/lib/utils.ts`)

## Tabela de tokens de cor

Ver `docs/brand.md` para a paleta completa. Todos os tokens são CSS variables em `src/app/globals.css`, mapeados no Tailwind v4 via bloco `@theme inline`. **Nunca usar cor literal do Tailwind** (`gray-*`, `slate-*`, `white`, `black`) em componentes — sempre os tokens semânticos abaixo:

| Categoria | Tokens disponíveis |
|---|---|
| Fundo | `bg-background`, `bg-card`, `bg-popover`, `bg-muted`, `bg-secondary`, `bg-accent`, `bg-sidebar` |
| Texto | `text-foreground`, `text-card-foreground`, `text-muted-foreground`, `text-popover-foreground`, `text-primary`, `text-destructive` |
| Borda | `border-border`, `border-input` |
| Estado/feedback | `bg-destructive`, `text-destructive`, `bg-warning`, `text-warning-foreground` |
| Foco | `ring-ring`, `focus-visible:ring-ring/50` |
| Gráficos | `--chart-1` a `--chart-5` (via `recharts`) |

## Componentes base documentados

### Button (`src/components/ui/button.tsx`)
Primitivo: `@base-ui/react/button`. Variantes via `cva`.

| Variant | Aparência |
|---|---|
| `default` | `bg-primary text-primary-foreground`, hover `bg-primary/80` |
| `outline` | borda `border-border`, fundo `bg-background`, hover `bg-muted` |
| `secondary` | `bg-secondary`, hover `bg-secondary/80` |
| `ghost` | sem fundo, hover `bg-muted` |
| `destructive` | `bg-destructive/10 text-destructive`, hover `bg-destructive/20` |
| `link` | texto `text-primary` com underline no hover |

| Size | Altura |
|---|---|
| `xs` | `h-6` |
| `sm` | `h-7` |
| `default` | `h-8` |
| `lg` | `h-9` |
| `icon` / `icon-xs` / `icon-sm` / `icon-lg` | quadrado, sem padding lateral |

Estados cobertos nativamente: `hover`, `focus-visible` (ring 3px), `disabled` (opacity 50% + pointer-events-none), `aria-invalid` (ring destructive), `active` (translate-y-px). Ícones internos (`svg`) herdam `size-4` automaticamente salvo override.

### Input (`src/components/ui/input.tsx`)
`h-9`, `rounded-md`, `border-input`, `bg-transparent` (dark: `bg-input/30`). Estados: `focus-visible` (ring 3px `ring-ring/50`), `disabled` (opacity 50%, cursor not-allowed), `aria-invalid` (ring destructive). Suporta `file:` (input type file estilizado inline).

### Select (`src/components/ui/select.tsx`)
Primitivo `@base-ui/react/select`. `SelectTrigger` (`size: "sm" | "default"`), `SelectContent` com portal + posicionamento automático, animações `data-open`/`data-closed` (fade + zoom). Popup usa `bg-popover` + `ring-1 ring-foreground/10`.

### Card (`src/components/ui/card.tsx`)
`rounded-xl`, `bg-card`, `ring-1 ring-foreground/10` (não usa `border`, usa `ring` para a borda sutil). Subcomponentes: `CardHeader`, `CardTitle` (`font-heading text-base font-medium`), `CardDescription`, `CardAction` (slot posicionado no grid), `CardContent`, `CardFooter` (`bg-muted/50`, borda superior). Suporta `size: "default" | "sm"` (compacta paddings).

### Table (`src/components/ui/table.tsx`)
Wrapper com scroll horizontal automático (`overflow-auto`). `TableRow` com hover `bg-muted/40` e borda `border-border/50`. `TableHead` em `text-xs text-muted-foreground`.

### Badge (`src/components/ui/badge.tsx`)
Variantes: `default` (`bg-primary`), `secondary` (`bg-muted`), `destructive` (`bg-destructive/10`), `outline` (transparente, `ring-border`). Todas usam `ring-1 ring-inset` em vez de `border`.

### Skeleton (`src/components/ui/skeleton.tsx`)
`animate-pulse bg-muted rounded-md`. Usado em todos os loading states (ver `src/components/kanban/KanbanSkeleton.tsx` como referência de skeleton de página completa).

## Lista de componentes compartilhados (`src/components/ui/`)
`address-fields`, `app-store-badges`, `badge`, `button`, `card`, `document-field`, `email-field`, `input`, `label`, `modal-overlay`, `motion` (wrapper Framer Motion), `phone-field` (integra `react-phone-number-input` — ver bloco `.phone-input-wrapper` em `globals.css`), `select`, `skeleton`, `table`, `theme-toggle`, `mfa-banner`, `password-input`, `session-timer`.

## Padrões de layout

### Sidebar (`src/components/dashboard/sidebar.tsx`)
- Desktop (`md+`): fixa, colapsável (`w-64` ↔ `w-16`), toggle flutuante na borda direita
- Mobile (`<md`): drawer com overlay (`bg-black/50 backdrop-blur-sm`), botão hamburger fixo `top-4 left-4`
- Estrutura: logo (h-16) → workspace switcher (se multi-tenant) → nav universal (`BASE_NAV`) → nav dinâmica por nicho (`NICHE_NAV`, baseada no `nicheSlug` do workspace) → sub-nav WhatsApp (expansível, `WA_SUB_NAV`, só renderiza se `hasWhatsApp`) → Configurações (fixo no fim) → Admin SaaS (se superadmin) → tema + logout
- Item ativo: `bg-accent text-accent-foreground`; inativo: `text-muted-foreground`

### Shell do Dashboard (`src/app/(dashboard)/layout.tsx`)
- Não há "Topbar" como componente separado — o cabeçalho é composto por banners condicionais empilhados acima do `<main>`: `ImpersonationBanner` (se impersonando) → `MfaBanner` (se aplicável)
- `<main>` centralizado com `max-w-[1920px] mx-auto`, scroll vertical próprio (`overflow-y-auto`)
- `SessionTimer` flutuante (renderiza só se cookies de expiração de sessão existirem)
- `AreaTracker` invisível (telemetria de área ativa) + `Toaster` (`sonner`, `position="bottom-right"`, `richColors`)
- Tema por nicho aplicado via classe no container raiz (`getNicheThemeClass`) — sobrescreve `--primary` e tokens de sidebar

### Grid
Sem componente de grid dedicado — uso direto de utilitários Tailwind (`grid grid-cols-*`) por tela. Padrão observado em dashboards: 4 colunas desktop / 2 tablet / 1 mobile para cards de métrica (`MetricCard`), conforme `.claude/rules/ui-design.md`.

## O que está proibido
- Cor Tailwind literal em qualquer componente de UI (`gray-*`, `slate-*`, `zinc-*`, `white`, `black`) — sempre tokens semânticos
- `localStorage`/`sessionStorage` para qualquer dado de sessão/tema sensível
- `dangerouslySetInnerHTML` sem sanitização
- Animar `color-scheme` via inline style/JS — controlado só pelo CSS cascade (`:root`/`.dark`)
- Componentes de UI (`components/`) chamando Supabase diretamente ou contendo lógica de negócio (ver `.claude/rules/architecture.md`)
- Ignorar estados obrigatórios (hover/focus/disabled/loading/error/empty) em componente interativo novo
- Sombras coloridas ou pesadas — sempre `shadow-sm`/`shadow-md` sutis (padrão Apple)
