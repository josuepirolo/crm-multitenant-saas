# Brand — CRM Vendas WhatsApp

> Documento gerado por reverse-engineering do código existente (2026-06-17). Não houve entrevista de descoberta — este arquivo descreve a identidade visual e de produto **já em produção**, extraída de `src/app/globals.css`, `.claude/rules/ui-design.md` e do código de componentes/telas.

## Nome do produto
**CRM Vendas WhatsApp** (`package.json` → `crm-vendas-whatsapp`)

## Proposta
SaaS multi-tenant de CRM com canal nativo de WhatsApp (via Z-API/BFF), com suporte a múltiplos nichos de negócio (genérico, autopeças, venda de veículos, moda).

## Tom e personalidade
- **Referência visual declarada:** padrão Apple (`.claude/rules/ui-design.md` → "Padrão Apple de design")
- Adjetivos: claro, denso quando necessário (dados de CRM), confiável, profissional, sem ruído visual
- Superfícies translúcidas (`backdrop-blur`), cantos arredondados (`rounded-xl`/`rounded-lg`), sombras sutis — nunca pesadas ou coloridas
- Motion suave (200–500ms, easing `cubic-bezier(0.25, 0.46, 0.45, 0.94)`), nunca decorativo

## Paleta gerada (tokens reais — `src/app/globals.css`)

Formato de cor: **OKLCH**. Tema claro em `:root`, escuro em `.dark`.

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` (branco puro) | `oklch(0.09 0 0)` (quase preto) | fundo da aplicação |
| `--foreground` | `oklch(0.13 0 0)` | `oklch(0.97 0 0)` | texto principal |
| `--primary` | `oklch(0.623 0.214 255.7)` — Apple Blue | `oklch(0.68 0.2 255.7)` | CTAs, links, foco |
| `--card` | `oklch(1 0 0)` | `oklch(0.13 0 0)` | superfície de cards |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.18 0 0)` | superfície secundária |
| `--muted` | `oklch(0.91 0 0)` | `oklch(0.23 0 0)` | fundos neutros, skeleton |
| `--accent` | `oklch(0.965 0 0)` | `oklch(0.18 0 0)` | hover/active de itens de nav |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` | erro, ações destrutivas |
| `--warning` | `oklch(0.666 0.179 58.318)` | `oklch(0.769 0.188 70.08)` | alertas |
| `--border` / `--input` | `oklch(0.905 0 0)` | `oklch(1 0 0 / 8%)` / `oklch(1 0 0 / 10%)` | bordas e inputs |
| `--sidebar` | `oklch(0.978 0 0)` | `oklch(0.11 0 0)` | fundo da sidebar |
| `--chart-1..5` | azul/verde/laranja/violeta/vermelho | variantes mais claras | gráficos (`recharts`) |

`--radius: 0.75rem` é a base — `--radius-sm/md/lg/xl/2xl/3xl/4xl` derivam dela via `calc()`.

### Temas por nicho (override parcial de `--primary`)
- `.theme-auto-parts` → `oklch(0.55 0.21 25)` (vermelho industrial)
- `.theme-fashion` → `oklch(0.65 0.22 350)` (rosa elegante)
- Nicho padrão (genérico/auto-sales) usa o `--primary` base (Apple Blue)

## Tipografia
- **Sans/display/corpo:** `var(--font-inter)` (Inter, via `next/font`)
- **Mono:** `var(--font-geist-mono)` (Geist Mono) — usado em dados tabulares/numéricos
- `font-feature-settings: "cv11", "ss01"` + antialiasing forçado no `body`
- Hierarquia (de `.claude/rules/ui-design.md`): títulos de página `text-3xl font-bold tracking-tight`, subtítulos `text-lg font-semibold`, labels/metadados `text-sm text-muted-foreground`

## Módulos do sistema (confirmados em `.sdds/CURRENT_STATE.md` e rotas)
| Módulo | Rota base | Status |
|---|---|---|
| Auth | `(auth)/login`, `register`, `mfa`, `reset-password` | implementado |
| Dashboard | `(dashboard)/dashboard` | implementado |
| Contacts | `(dashboard)/contacts` | implementado |
| Kanban | `(dashboard)/kanban` | implementado |
| Chat | `(dashboard)/chat` | placeholder (`whatsapp-coming-soon`) |
| Analytics | `(dashboard)/analytics` | parcial |
| Settings | `(dashboard)/settings` | implementado |
| WhatsApp | `(dashboard)/whatsapp/{conexao,grupos,enviar,campanhas}` | implementado (ADR-008) |
| Auto Parts | `(dashboard)/auto-parts{,/quotes}` | implementado (nicho) |
| Auto Sales | `(dashboard)/auto-sales{,/proposals}` | implementado (nicho) |
| Fashion | `(dashboard)/fashion{,/stock}` | implementado (nicho) |
| Admin | `(admin)/admin{,/workspaces,/analytics}` | implementado (superadmin) |

## Tela principal
`(dashboard)/dashboard` — métricas (cards), `LeadsChart`, `ContactsByStateCard`. Sidebar fixa (colapsável, 64px↔256px) com navegação universal + navegação dinâmica por nicho + sub-nav do WhatsApp (expansível).

## Stack de UI confirmada
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · `@base-ui/react` (não Radix puro) · `class-variance-authority` · `shadcn` CLI · `framer-motion` · `recharts` · `sonner` · `next-themes` (dark mode via classe).
