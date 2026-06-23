---
name: design-system-gen
description: Gera src/styles/globals.css (tokens CSS completos) e docs/design-system.md (componentes base documentados com variantes e estados) a partir de docs/brand.md. Chamada pela skill frontend-init na Fase 2 do planejamento — não ativar diretamente exceto se o usuário pedir explicitamente para regenerar o design system.
---

# SKILL: design-system-gen
# Gera tokens CSS, globals.css e documenta componentes base
# Chamada por: frontend-init — Fase 2
# Depende de: docs/brand.md

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
Ler o `docs/brand.md` gerado na Fase 1 e produzir:
1. `src/styles/globals.css` — todos os tokens CSS do projeto
2. `docs/design-system.md` — componentes base documentados com variantes e estados

---

## GERAÇÃO DO globals.css

Gere o arquivo `src/styles/globals.css` com esta estrutura completa:

```css
/* ============================================================
   [NOME DO PRODUTO] — Design System Tokens
   Gerado por: SDDS Frontend System
   Não edite manualmente — use docs/design-system.md como fonte
   ============================================================ */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── TEMA DARK (padrão) ─────────────────────────────────── */
:root {
  /* Backgrounds */
  --bg-primary:    [hex do brand.md];
  --bg-secondary:  [hex do brand.md];
  --bg-tertiary:   [hex do brand.md];
  --bg-elevated:   [hex do brand.md];

  /* Borders */
  --border:        [hex do brand.md];
  --border-strong: [hex do brand.md];

  /* Tipografia */
  --text-primary:   [hex do brand.md];
  --text-secondary: [hex do brand.md];
  --text-muted:     [hex do brand.md];

  /* Semânticas */
  --success:        [hex];
  --success-bg:     [hex com 10% opacidade];
  --success-border: [hex com 20% opacidade];
  --warning:        [hex];
  --warning-bg:     [hex com 10% opacidade];
  --warning-border: [hex com 20% opacidade];
  --error:          [hex];
  --error-bg:       [hex com 10% opacidade];
  --error-border:   [hex com 20% opacidade];
  --info:           [hex];
  --info-bg:        [hex com 10% opacidade];

  /* Accent */
  --accent:         [hex do brand.md];
  --accent-hover:   [hex derivado];
  --accent-muted:   [hex com 15% opacidade];
  --accent-text:    #000000; /* texto sobre o accent — preto se accent for claro */

  /* Tipografia */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Escala tipográfica */
  --text-xs:   11px;
  --text-sm:   13px;
  --text-base: 14px;
  --text-md:   16px;
  --text-lg:   18px;
  --text-xl:   22px;
  --text-2xl:  28px;
  --text-3xl:  36px;

  /* Border radius */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   14px;
  --radius-xl:   20px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.5);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.6);
  --shadow-accent: 0 0 20px [accent com 15% opacidade];

  /* Transições */
  --transition-fast:   150ms ease-out;
  --transition-base:   250ms ease-out;
  --transition-slow:   400ms ease-out;
  --transition-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ── TEMA LIGHT (se o produto suporta) ──────────────────── */
/* Omitir esta seção se o produto for dark-only */
[data-theme="light"] {
  --bg-primary:    [hex light];
  --bg-secondary:  [hex light];
  --bg-tertiary:   [hex light];
  --bg-elevated:   [hex light];
  --border:        [hex light];
  --border-strong: [hex light];
  --text-primary:  [hex light];
  --text-secondary:[hex light];
  --text-muted:    [hex light];
  /* accent e semânticas permanecem iguais */
}

/* ── RESET E BASE ───────────────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── CLASSES UTILITÁRIAS DO PROJETO ─────────────────────── */

/* Tipografia */
.text-xs     { font-size: var(--text-xs); }
.text-sm     { font-size: var(--text-sm); }
.text-base   { font-size: var(--text-base); }
.text-md     { font-size: var(--text-md); }
.text-lg     { font-size: var(--text-lg); }
.text-xl     { font-size: var(--text-xl); }
.text-2xl    { font-size: var(--text-2xl); }
.text-3xl    { font-size: var(--text-3xl); }
.font-mono   { font-family: var(--font-mono); }
.text-primary   { color: var(--text-primary); }
.text-secondary { color: var(--text-secondary); }
.text-muted     { color: var(--text-muted); }
.text-accent    { color: var(--accent); }
.text-success   { color: var(--success); }
.text-warning   { color: var(--warning); }
.text-error     { color: var(--error); }

/* Backgrounds */
.bg-primary   { background-color: var(--bg-primary); }
.bg-secondary { background-color: var(--bg-secondary); }
.bg-tertiary  { background-color: var(--bg-tertiary); }
.bg-elevated  { background-color: var(--bg-elevated); }

/* Borders */
.border-default { border: 1px solid var(--border); }
.border-strong  { border: 1px solid var(--border-strong); }

/* Cards */
.card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-sm);
}

/* Metric card */
.metric-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  transition: box-shadow var(--transition-fast);
}
.metric-card:hover {
  box-shadow: var(--shadow-md);
}
.metric-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}
.metric-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  font-family: var(--font-mono);
  line-height: 1.1;
  margin-bottom: 4px;
}
.metric-delta {
  font-size: var(--text-xs);
  color: var(--text-muted);
}
.metric-delta.up   { color: var(--success); }
.metric-delta.down { color: var(--error); }
.metric-delta.warn { color: var(--warning); }

/* Badges semânticos */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  font-weight: 500;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
}
.badge-success { background: var(--success-bg); color: var(--success); border-color: var(--success-border); }
.badge-warning { background: var(--warning-bg); color: var(--warning); border-color: var(--warning-border); }
.badge-error   { background: var(--error-bg);   color: var(--error);   border-color: var(--error-border); }
.badge-info    { background: var(--info-bg);     color: var(--info); }
.badge-muted   { background: var(--bg-tertiary); color: var(--text-muted); border-color: var(--border); }

/* Status dot */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}
.status-dot.online  { background: var(--success); animation: pulse-dot 2s infinite; }
.status-dot.waiting { background: var(--warning); animation: pulse-dot 1.5s infinite; }
.status-dot.error   { background: var(--error);   animation: pulse-dot 1s infinite; }
.status-dot.offline { background: var(--text-muted); }

@keyframes pulse-dot {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 currentColor; }
  50%       { opacity: 0.8; box-shadow: 0 0 0 5px transparent; }
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--border) 25%,
    var(--bg-elevated) 50%,
    var(--border) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Focus ring global */
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Scrollbar customizada (webkit) */
::-webkit-scrollbar       { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg-primary); }
::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: var(--radius-full); }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
```

---

## GERAÇÃO DO design-system.md

Após gerar o globals.css, gere `docs/design-system.md`:

```markdown
# Design System — [Nome do Produto]

> Fonte de verdade para todos os componentes do projeto.
> Sempre consulte este arquivo antes de criar um novo componente.

## Como usar
- Tokens: sempre via CSS variables (nunca hex hardcoded no JSX)
- Classes utilitárias: use as classes de `.card`, `.badge-*`, `.metric-card`, etc.
- shadcn/ui: use apenas para acessibilidade e comportamento — sobrescreva 100% da aparência

---

## Tokens de cor
[tabela com todos os tokens gerados no globals.css]

## Escala tipográfica
[tabela: token → px → uso]

## Componentes base

### Button
Variantes: primary | secondary | ghost | destructive
Estados: default | hover | active | focus | disabled | loading

```tsx
// Primary — ação principal da tela
<button className="btn-primary">Salvar</button>

// Secondary — ação secundária
<button className="btn-secondary">Cancelar</button>

// Ghost — ação terciária ou em toolbars
<button className="btn-ghost">Ver mais</button>

// Destructive — ação irreversível
<button className="btn-destructive">Excluir</button>
```

CSS obrigatório para cada variante:
- Cor de fundo, cor de texto, border
- Hover: mudança de fundo + shadow sutil
- Active: scale(0.97)
- Focus: outline via :focus-visible global
- Disabled: opacity 0.4 + cursor not-allowed
- Loading: spinner inline + texto "Carregando..."

### Input
Estados: default | focus | error | disabled

```tsx
<div className="input-group">
  <label className="input-label">Nome</label>
  <input type="text" className="input" placeholder="Digite aqui" />
  <span className="input-error">Campo obrigatório</span>
</div>
```

### Card
Variantes: default | elevated | metric | interactive

### Badge
Variantes: success | warning | error | info | muted

### Skeleton
```tsx
<div className="skeleton" style={{ width: '100%', height: '20px' }} />
```

### Toast
Posição: bottom-right
Stack: até 3 simultâneos
Auto-dismiss: 4 segundos
Variantes: success | warning | error | info

### Modal / Dialog
Animação: scale(0.95)→scale(1) + opacity(0)→opacity(1)
Backdrop: rgba(0,0,0,0.6) com blur(4px)
Fecha com: ESC + clique fora + botão X

### Avatar
Tamanhos: sm(24px) | md(32px) | lg(48px) | xl(64px)
Fallback: iniciais em bg colorido derivado do nome

---

## Padrões de layout

### Sidebar
- Collapsed: 64px (só ícones + tooltips)
- Expanded: 240px (ícones + labels)
- Estado persistido em localStorage
- Em mobile: drawer com overlay

### Topbar
- Height: 56px
- Conteúdo: título da página (esquerda) + ações contextuais (direita)
- Sticky no topo com z-index adequado

### Grid de métricas
- Desktop: repeat(auto-fit, minmax(200px, 1fr))
- Tablet: repeat(2, 1fr)
- Mobile: repeat(1, 1fr)
- Gap: 12px

---

## Estados globais obrigatórios

Todo componente de lista ou tabela deve ter:
- **Loading:** skeleton com shimmer
- **Empty:** ícone + mensagem + ação sugerida
- **Error:** mensagem específica + botão de retry

Formulários devem ter:
- Validação inline (não só no submit)
- Mensagem de erro abaixo do campo específico
- Label sempre visível (nunca só placeholder)

---

## O que está proibido

❌ Hex hardcoded fora do globals.css
❌ `className` com cores Tailwind genéricas (gray-*, zinc-*, blue-*)
❌ Componente shadcn sem sobrescrita visual
❌ Lista/tabela sem estado vazio
❌ Formulário sem validação inline
❌ Página sem skeleton de loading
❌ Botão sem estado de loading para ações assíncronas
```

---

## REGRAS DE EXECUÇÃO DESTA SKILL

- Preencha todos os tokens do globals.css com os hex reais do brand.md — zero placeholder
- Se o brand.md tiver "ambos" como tema, gere as duas seções (:root dark + [data-theme="light"])
- Se o brand.md tiver só dark, omita a seção light e adicione comentário explicando
- Sempre derive as versões -bg e -border das semânticas (15% e 30% de opacidade)
- Confirme com o usuário se a paleta gerada parece correta antes de salvar os arquivos
