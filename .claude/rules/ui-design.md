# UI/UX Standards

## Princípio fundamental
Antes de escrever qualquer linha de código de interface, analise e aplique as melhores práticas de UI/UX disponíveis para o framework ou linguagem em uso. Qualidade visual e experiência do usuário não são opcionais — são requisitos de qualidade equivalentes ao código funcional.

## Análise obrigatória antes de codar
Para qualquer tarefa de frontend, responda internamente antes de começar:
1. Qual é o framework/stack em uso? (React, Vue, Angular, Svelte, vanilla, etc.)
2. Quais são as melhores design systems e component libraries para esse stack?
3. Qual padrão de layout resolve melhor o problema do usuário?
4. Quais interações e estados precisam ser considerados (hover, focus, loading, empty, error)?
5. A hierarquia visual está clara? O olho do usuário sabe onde ir primeiro?

## Princípios de design a aplicar sempre

### Hierarquia e layout
- Defina uma hierarquia visual clara: um elemento primário por tela/seção
- Use espaçamento generoso — prefira padding/margin maiores ao invés de compactar
- Grid systems: prefira CSS Grid para layouts 2D, Flexbox para 1D
- Respeite alinhamentos — nunca misture alinhamentos sem intenção
- Grupos relacionados ficam juntos, elementos distintos têm separação clara

### Tipografia
- Máximo 2-3 fontes por projeto; prefira system fonts se não há especificação
- Escala tipográfica consistente (ex: 12/14/16/20/24/32/48px)
- Line-height: 1.4-1.6 para corpo de texto, 1.1-1.3 para títulos
- Contraste de peso: use bold apenas para hierarquia real, não decoração

### Cores
- Defina paleta semântica: primary, secondary, success, warning, error, neutral
- Contraste mínimo WCAG AA: 4.5:1 para texto normal, 3:1 para texto grande
- Nunca use mais de 4-5 cores na mesma tela
- Estados interativos: hover escurece 10-15%, active 20%, disabled 40% opacidade

### Componentes e estados
Todo componente interativo deve ter todos os estados implementados:
- Default → Hover → Active/Pressed → Focus → Disabled → Loading → Error → Empty
- Feedback visual imediato (< 100ms) para qualquer interação do usuário
- Loading states: skeleton screens para conteúdo, spinner para ações
- Estados vazios: nunca deixe uma lista/tabela vazia sem mensagem e ação sugerida

### Formulários
- Labels sempre visíveis (nunca só placeholder)
- Validação inline com mensagem de erro clara e específica
- Agrupe campos relacionados
- Botão primário no final, alinhado ao fluxo de leitura
- Auto-focus no primeiro campo quando o formulário é o objetivo principal

### Feedback e microinterações
- Transitions: 150-300ms para hover/focus, 300-500ms para aparecimento de elementos
- Easing: ease-out para elementos que aparecem, ease-in para os que somem
- Nunca use animações sem propósito funcional

### Acessibilidade (mínimo obrigatório)
- Todos os elementos interativos com foco visível e navegação por teclado
- Imagens com alt text descritivo
- ARIA labels quando o texto visível não é suficiente
- Não depender só de cor para comunicar estado

## Padrões por framework

### React
- Prefira Tailwind CSS para estilo utilitário ou CSS Modules para escopo isolado
- shadcn/ui ou Radix UI para componentes acessíveis prontos
- Framer Motion para animações complexas
- React Hook Form + Zod para formulários com validação

### Vue
- Tailwind CSS ou scoped styles com BEM
- PrimeVue, Vuetify ou Headless UI para componentes
- VeeValidate para formulários

### Angular
- Angular Material como base ou PrimeNG
- Reactive Forms para formulários complexos

### Svelte / SvelteKit
- Tailwind CSS com svelte-add
- Melt UI ou shadcn-svelte para componentes headless

### Vanilla / Web Components
- CSS custom properties para theming
- Design tokens como base para consistência

## Dark mode
- Suporte obrigatório — usar `class` strategy do Tailwind (`darkMode: 'class'`) com shadcn/ui
- Nunca usar cores hardcoded — sempre usar CSS variables semânticas (`--background`, `--foreground`, `--primary`, etc.)
- Testar todos os componentes nos dois temas antes de considerar concluído
- Preferência do sistema respeitada por padrão (`prefers-color-scheme`), com toggle manual disponível
- Sombras no dark mode: mais sutis e com menor opacidade — evitar sombras pesadas em fundos escuros

## Responsividade e layout de dashboard
- Sidebar colapsável em telas menores que `lg` (1024px) — usar sheet/drawer no mobile
- Breakpoints padrão: mobile (375px), tablet (768px), desktop (1280px+)
- Tabelas com scroll horizontal em mobile — nunca quebrar colunas essenciais
- Cards de métricas: grid de 4 colunas no desktop, 2 no tablet, 1 no mobile
- Kanban: scroll horizontal em mobile — cada coluna com largura mínima de 280px
- Chat/inbox: layout de painel duplo no desktop, tela única com navegação no mobile

## Densidade de informação
- Definir dois modos de densidade para tabelas: **default** (py-3) e **compacto** (py-1.5)
- Tabelas densas (muitos dados): fonte 13px, padding reduzido, linhas zebradas sutis
- Evitar mais de 7-8 colunas visíveis por padrão — ocultar colunas secundárias com toggle
- Tooltips para textos truncados — nunca cortar informação sem indicar que há mais
- Números e métricas: alinhados à direita, fontes monoespaçadas para alinhamento vertical

## Notificações e toasts
- Usar `sonner` (integrado ao shadcn/ui) como padrão para toasts
- Posição padrão: canto inferior direito no desktop, topo centralizado no mobile
- Duração padrão: 4s para info/success, 6s para warning, persistente para error crítico
- Tipos obrigatórios: `success`, `error`, `warning`, `info`, `loading` (Promise)
- Ações assíncronas (envio de mensagem, salvar lead): usar `toast.promise()` com estados loading/success/error
- Nunca empilhar mais de 3 toasts simultaneamente

## Skeleton loading
- Toda listagem, tabela, kanban e dashboard deve ter skeleton correspondente
- Skeletons devem replicar fielmente o layout do conteúdo real (mesmas proporções)
- Usar `animate-pulse` do Tailwind com `bg-muted` — consistente com o tema
- Skeletons específicos obrigatórios:
  - **Tabela:** linhas com larguras variadas (60%, 80%, 45%...) para parecer natural
  - **Card kanban:** altura fixa, 2-3 linhas de texto simuladas
  - **Card de métrica:** ícone + número grande + label
  - **Chat/inbox:** avatar circular + 2 linhas de texto por mensagem
  - **Dashboard:** grid de cards + área de gráfico

## Gráficos e analytics
- Usar `recharts` (compatível com shadcn/ui) como biblioteca padrão de gráficos
- Cores dos gráficos derivadas da paleta semântica do projeto — nunca cores arbitrárias
- Todo gráfico deve ter: título claro, legenda, tooltip ao hover e estado de loading/vazio
- Tooltips de gráfico: fundo com `bg-popover`, borda sutil, valor formatado
- Gráficos responsivos — usar `ResponsiveContainer` sempre

## Revisão de qualidade antes de entregar
Antes de considerar qualquer implementação de UI concluída, verifique:
- [ ] A hierarquia visual está clara sem precisar de explicação?
- [ ] Todos os estados do componente estão implementados?
- [ ] O layout funciona em mobile (375px) e desktop (1280px+)?
- [ ] As cores têm contraste suficiente?
- [ ] Elementos interativos têm feedback visual imediato?
- [ ] O código está organizado de forma que o design seja fácil de manter?
- [ ] Dark mode testado e funcional?
- [ ] Skeleton loading implementado?
- [ ] Toasts configurados para ações assíncronas?
- [ ] Tabelas com scroll horizontal no mobile?

## Tom de comunicação
Ao implementar UI, explique brevemente as decisões de design mais importantes tomadas. Se houver trade-offs (ex: optei por X em vez de Y porque...), mencione. Isso cria entendimento compartilhado e facilita iterações futuras.
