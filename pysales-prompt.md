# 🎯 PROMPT MESTRE — PySales CRM (Design + Funcionalidades)

> Use este prompt em **dois modos**:
> - **MODO A — Criar do zero:** cole o documento inteiro.
> - **MODO B — Atualizar sistema existente:** cole a partir da seção **"DESIGN SYSTEM"** e diga: *"Aplique este design system e refatore as telas existentes (Inbox, Kanban, Dashboard, Contatos, Relatórios, Configurações) seguindo as especificações abaixo, sem quebrar a lógica de negócio atual."*

---

## 🧠 VISÃO DO PRODUTO

Crie/atualize o **PySales** — um SaaS de CRM para gestão inteligente de atendimentos via **WhatsApp**, com classificação automática por **IA**, **inbox** integrado e **kanban** operacional em **tempo real**.

**Posicionamento:** Gestão inteligente de conversas e dados para previsibilidade de comportamento do cliente e aumento de vendas com inteligência de negócio.

**Personas:** Atendente (operacional), Gestor de Atendimento (analítico), Admin (configuração).

**Princípios de UX:**
1. **Velocidade** — toda ação otimista, feedback imediato (<100ms).
2. **Inteligência visível** — IA aparece em badges, sumários e sugestões, nunca escondida.
3. **Densidade controlada** — muita informação por tela, mas com hierarquia tipográfica clara.
4. **Tempo real** — pulsos "live", atualizações suaves, indicadores de sincronização por card.

---

## 🎨 DESIGN SYSTEM (copiar literalmente)

### Stack visual
- **Tema:** Dark mode por padrão (não opcional).
- **Tipografia:** `Inter` (UI) + `JetBrains Mono` (números, telefones, IDs).
- **Border radius:** 6 / 10 / 14 / 20 px.
- **Sombras:** glow verde sutil (`0 0 24px rgba(37,211,102,0.25)`) + elevação dramática.

### Paleta de cores (tokens semânticos — usar SEMPRE via classes, nunca cor hardcoded)

```css
/* src/styles.css — :root e .dark */
--bg-primary:    #0a0a0a;   /* fundo geral */
--bg-secondary:  #111111;   /* sidebar, cards */
--bg-tertiary:   #1a1a1a;   /* sub-cards, inputs */
--bg-elevated:   #222222;   /* hover, popovers */
--border:        #2a2a2a;
--border-strong: #3a3a3a;
--foreground:    #ffffff;
--muted-foreground: #a1a1aa;

/* Marca */
--primary:       #25d366;   /* verde WhatsApp — ação principal */
--primary-foreground: #000000;

/* Semânticos */
--success: #25d366;
--warning: #f59e0b;
--error:   #ef4444;
--info:    #3b82f6;
--ai:      #8b5cf6;   /* violeta = IA / inteligência */

/* Categorias de atendimento */
--cat-sac:        #ef4444;  /* vermelho */
--cat-inbound:    #25d366;  /* verde */
--cat-outbound:   #3b82f6;  /* azul */
--cat-financeiro: #f59e0b;  /* âmbar */
--cat-logistica:  #a1a1aa;  /* cinza */

/* Charts */
--chart-1..5: #25d366, #3b82f6, #f59e0b, #8b5cf6, #ef4444;

/* Shadows */
--shadow-glow-green: 0 0 24px rgba(37, 211, 102, 0.25);
--shadow-elevated:   0 8px 32px rgba(0, 0, 0, 0.6);
```

### Regras de uso de cor
- **Verde (#25d366)** APENAS para: ações primárias, status "online/live", categoria Venda Inbound, sentimento positivo.
- **Violeta (#8b5cf6)** APENAS para: features de IA (sumários, classificação, sugestões) — sempre acompanhado de ícone `Sparkles`.
- **NUNCA** usar `text-white`, `bg-black`, `bg-[#...]` em componentes. Apenas tokens (`bg-bg-secondary`, `text-foreground`, `text-muted-foreground`, `border-border`).

### Animações utilitárias obrigatórias
- `pulse-dot` — bolinha verde "live" pulsante (2s loop).
- `shimmer` — skeleton loaders.
- `animate-fade-in` — entrada suave de cards (250ms).
- `animate-slide-in` — drawers/painéis laterais (300ms).

### Componentes-base (shadcn/ui customizados)
- **Avatar:** iniciais coloridas com gradiente determinístico baseado em hash do nome.
- **CategoryBadge:** pill com dot colorido + label + sub-label menor em mono.
- **SentimentBadge:** emoji (😊 😐 🤔 😤) + label colorida.
- **MetricCard:** valor grande tabular-nums + label + delta (▲/▼ %).
- **StatusDot:** bolinha 6px com `pulse-dot` quando ativo.

---

## 🧱 STACK TÉCNICO

- **Framework:** TanStack Start v1 (React 19 + Vite 7) — file-based routing em `src/routes/`.
- **Estilo:** Tailwind v4 via `@import "tailwindcss"` em `src/styles.css` (sem `tailwind.config.js`).
- **Componentes:** shadcn/ui completo já instalado.
- **Ícones:** `lucide-react`.
- **Charts:** `recharts`.
- **Drag-and-drop:** HTML5 nativo (`draggable`, `onDragStart`, `onDrop`) — leve, sem libs.
- **Toasts:** `sonner` (tema dark, bottom-right).
- **Estado:** `useState`/`useEffect` para mock; quando real, TanStack Query + `createServerFn`.

---

## 📐 ARQUITETURA DE ROTAS

```
src/routes/
├── __root.tsx              # shell html/head/body
├── index.tsx               # redirect → /dashboard
├── login.tsx               # tela pública de login
└── _app.tsx                # layout autenticado (sidebar + outlet + Toaster)
    ├── _app.dashboard.tsx
    ├── _app.inbox.tsx
    ├── _app.kanban.tsx
    ├── _app.contacts.tsx
    ├── _app.reports.tsx
    └── _app.settings.tsx
```

**Sidebar fixa à esquerda (240px):** logo PySales (verde) + nav vertical com ícones + label + indicador ativo (barra verde 2px à esquerda) + footer com avatar do usuário e menu.

---

## 📺 TELAS — ESPECIFICAÇÃO

### 1. LOGIN
- Split 50/50: esquerda formulário, direita gradiente verde + frase de marca.
- Logo PySales no topo, campos email/senha, botão verde "Entrar", link "Esqueci minha senha".

### 2. DASHBOARD (`/dashboard`)
- Header: saudação ("Olá, [nome]") + filtro de período (Hoje / 7d / 30d / Custom).
- **Linha 1 — 4 MetricCards:** Contatos ativos, Em atendimento, Aguardando resposta, Finalizados hoje (com delta % vs período anterior).
- **Linha 2 — 2 gráficos:**
  - Volume 7d (AreaChart com gradiente verde).
  - Distribuição por categoria (DonutChart com cores das categorias).
- **Linha 3 — 2 painéis:**
  - Top 5 atendentes (lista com avatar + nome + atendimentos + tempo médio).
  - Feed de atividade IA em tempo real (cada item: badge categoria + nome cliente + tempo + sentimento) — auto-scroll suave a cada 5s.

### 3. INBOX (`/inbox`) — 3 colunas
- **Coluna 1 (320px):** Lista de conversas. Busca + filtros (Não lidas / Atribuídas / Categoria). Cada item: avatar + nome + última mensagem (truncada) + timestamp + badge unread + dot categoria.
- **Coluna 2 (flex):** Chat. Header com avatar + nome + telefone (mono) + ações (atribuir, fechar, abrir WhatsApp). Bolhas de mensagem estilo WhatsApp (recebidas à esquerda cinza, enviadas à direita verde). Input fixo no rodapé com upload, emoji, áudio e botão enviar verde.
- **Coluna 3 (340px):** Detalhe do contato. Avatar grande, nome, telefone (clique copia), tags, **Sumário IA** (card violeta com ícone Sparkles), histórico de interações.

### 4. KANBAN (`/kanban`) — TEMPO REAL
- 4 lanes: **Conversas Iniciadas → Em Atendimento → Aguardando Resposta → Finalizada**.
- Cards arrastáveis (HTML5 nativo) com **drag otimista**: move na UI imediatamente, badge de sync no canto (spinner → check, ou error + rollback se falhar ~7%).
- Header com pill "Live" verde pulsante (`Wifi` + ping animado).
- Cada card: CategoryBadge + alerta de urgência (>30min) + avatar + nome + telefone + sumário IA (2 linhas) + SentimentBadge + tempo + ações on-hover (Atribuir, Abrir).
- Highlight verde de 2.2s em cards recém-atualizados.
- Stream simulado de movimentos de outros operadores a cada ~7s + toast discreto inferior esquerdo ("Ana Paula moveu para Atendimento").

### 5. CONTATOS (`/contacts`)
- Tabela densa com busca global + filtros (tag, cidade, sentimento).
- Colunas: Avatar+Nome, Telefone (mono), Email, Tags, Último sentimento, Última atividade, Cidade, Ações.
- Click na linha abre **Drawer lateral** com perfil completo + histórico + nota interna.

### 6. RELATÓRIOS (`/reports`)
- Volume 7d (line chart), Heatmap de horários (7d × 24h) com gradiente verde, Tempo médio de resposta por atendente (bar chart horizontal), Taxa de resolução, Distribuição de sentimentos.

### 7. CONFIGURAÇÕES (`/settings`)
- Sidebar interna com 6 seções: **Workspace, WhatsApp, Equipe, Kanban, IA, Notificações**.
- Cada seção em card com formulários shadcn (Input, Switch, Select, Textarea).
- IA: configurar prompt de classificação, categorias custom, threshold de confiança.

---

## ⚡ COMPORTAMENTOS OBRIGATÓRIOS

1. **Tudo otimista:** UI atualiza ANTES da resposta do servidor; rollback com toast se falhar.
2. **Tempo real visível:** pill "Live", pulsos, highlights de updates, feed de eventos.
3. **IA com personalidade visual:** badges violeta, ícone `Sparkles`, sumários em cards destacados.
4. **Hover states ricos:** todos os cards/botões interativos têm `hover:` + `transition`.
5. **Telefones:** formatar `+55 (43) 99989-6056`, sempre em `font-mono-num`, clique copia com toast.
6. **Botão WhatsApp:** sempre verde com `hover:shadow-glow-green` + `scale-[1.02]`.
7. **Drag-and-drop:** card rotaciona 1°, escala 1.02, opacidade 0.5 enquanto arrasta; lane destino vira borda dashed verde.
8. **Empty states:** sempre presentes, com ilustração mínima + CTA.
9. **Skeletons:** usar `shimmer` em todo loading inicial (nunca spinners chatos).
10. **Responsividade:** funcional de 1280px+; mobile é fora de escopo nesta v1.

---

## 📦 MOCK DATA (criar em `src/lib/mock-data.ts`)

Tipar `Conversation`, `Contact`, `Lane`, `Category`, `Sentiment`. Gerar ~12 conversas distribuídas pelas 4 lanes com nomes BR femininos e masculinos realistas, categorias variadas, sumários IA plausíveis. Exportar também `metrics`, `volume7d`, `categoryDist`, `topAttendants`, `activityFeed`.

---

## ✅ CHECKLIST FINAL

- [ ] Dark mode default, tokens semânticos em `src/styles.css`.
- [ ] Sidebar 240px com indicador ativo verde.
- [ ] 7 rotas funcionais com `<head>` único (title/meta) por rota.
- [ ] Kanban com drag otimista + sync badge + simulação real-time.
- [ ] Inbox 3 colunas com sumário IA violeta.
- [ ] Dashboard com 4 metrics + 2 charts + 2 painéis.
- [ ] Toaster sonner dark no `_app.tsx`.
- [ ] Zero `text-white` / `bg-black` / cores hex em componentes.
- [ ] Recharts com cores `--chart-1..5`.
- [ ] Telefones em `font-mono-num` formatados.

---

> **Critério de qualidade:** cada pixel deve comunicar **velocidade, inteligência e confiança**. O PySales precisa parecer construído por um time de design world-class — não um dashboard genérico, mas uma ferramenta que vendedores e atendentes vão querer usar todos os dias.
