---
name: ui-execution-rules
description: Regras permanentes de execução de UI para impedir que componentes gerados pareçam templates genéricos de shadcn/ui — tokens via CSS variables, todos os estados obrigatórios (hover/focus/loading/error/empty), tipografia com escala fixa, cor com significado semântico. Ativa em toda sessão que envolva escrever ou revisar código de frontend, UI, componente ou tela — nunca desativar.
---

# SKILL: ui-execution-rules
# Regras permanentes de execução de UI — ativa em toda sessão de código
# Importada no CLAUDE.md — nunca desativar

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

## Propósito
Garantir que nenhum componente gerado pareça um template genérico de shadcn/ui.
Estas regras se sobrepõem a qualquer instrução genérica de "use boas práticas".

---

## CHECKLIST PRÉ-CÓDIGO (executar antes de qualquer JSX)

Antes de escrever qualquer linha de componente, responda internamente:

1. Este componente poderia estar em qualquer outro projeto SaaS? → se sim, pare
2. Estou usando tokens do `globals.css` ou hex hardcoded? → hardcoded = erro
3. Estou usando classes Tailwind genéricas (gray-*, zinc-*, blue-*) sem override? → erro
4. O resultado parece shadcn/ui sem customização visual? → refaça

---

## REGRA 1 — Design system é lei

Todo valor visual vem exclusivamente das CSS variables definidas em `src/styles/globals.css`.

```tsx
// ❌ Nunca:
className="bg-gray-900 text-white border border-gray-700 rounded-lg"

// ✅ Sempre:
className="bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border)] rounded-[var(--radius-lg)]"

// ✅ Ou via classe utilitária do projeto:
className="card"
```

Nunca use hex hardcoded fora do arquivo de tokens.
Se precisar de um valor que não existe, adicione o token no globals.css primeiro.

---

## REGRA 2 — Hierarquia visual obrigatória

Cada tela tem exatamente **um elemento primário**.

Checklist antes de entregar qualquer tela:
- [ ] Existe um elemento dominante (tamanho, cor ou posição)?
- [ ] Elementos secundários recuam claramente para segundo plano?
- [ ] Espaçamento entre grupos é maior que o espaçamento interno?
- [ ] Máximo 3 tamanhos de fonte distintos nesta tela?

---

## REGRA 3 — Todos os estados são obrigatórios

Nenhum componente interativo é entregue sem implementar:

```
Default → Hover → Active → Focus → Disabled → Loading → Error → Empty
```

- **Hover:** muda background ou border — nunca só o cursor
- **Focus:** via `:focus-visible` global do globals.css — nunca omitir
- **Loading:** skeleton shimmer OU spinner inline — nunca página em branco
- **Empty:** ícone + mensagem clara + ação sugerida — nunca lista vazia sem contexto
- **Error:** mensagem específica e acionável — nunca "Erro desconhecido"

Implementação padrão de empty state:
```tsx
// components/shared/EmptyState.tsx
<div className="empty-state">
  <Icon name={icon} size={40} className="text-muted" />
  <p className="text-md font-medium">{title}</p>
  <p className="text-sm text-secondary">{description}</p>
  {action && <button className="btn-primary">{action.label}</button>}
</div>
```

---

## REGRA 4 — Tipografia com intenção

Escala fixada — não improvise tamanhos:

| Token | px | Uso |
|-------|----|-----|
| `--text-xs` | 11px | timestamps, metadados, labels de campo |
| `--text-sm` | 13px | corpo secundário, descrições, badges |
| `--text-base` | 14px | corpo principal, conteúdo de listas |
| `--text-md` | 16px | títulos de seção, labels de destaque |
| `--text-lg` | 18px | títulos de painel |
| `--text-xl` | 22px | títulos de página |
| `--text-2xl` | 28px | métricas, números grandes |
| `--text-3xl` | 36px | hero, números de dashboard |

**Pesos:** 400 (corpo), 500 (destaque), 600 (título), 700 (métrica/h1 apenas).
**Dados numéricos** (IDs, telefones, valores, timestamps): sempre `font-mono`.

---

## REGRA 5 — Cor carrega significado, não decoração

| Token | Significado | Nunca usar para |
|-------|-------------|-----------------|
| `--success` | Positivo, concluído, online | Decoração neutra |
| `--warning` | Atenção, aguardando, prazo | Erros ou sucesso |
| `--error` | Problema, urgente, falha | Alertas leves |
| `--info` | Informativo, neutro | Estados de erro/sucesso |
| `--accent` | Ação principal | Status ou informação |

**Nunca inverta esse mapeamento.**
Um botão "Cancelar" não é vermelho — vermelho é só para ações destrutivas irreversíveis.

---

## REGRA 6 — Microinterações são obrigatórias

Todo elemento interativo tem feedback visual em **menos de 100ms**.

```css
/* Use sempre as variáveis de transição do globals.css */
transition: background var(--transition-fast);   /* hover/focus */
transition: opacity var(--transition-base);       /* aparecimento */
transition: transform var(--transition-spring);   /* drag & bounce */
```

Microinterações por tipo de elemento:

| Elemento | Hover | Active | Aparecimento |
|----------|-------|--------|--------------|
| Botão primário | bg muda + shadow | scale(0.97) | — |
| Card | border intensifica + translateY(-1px) | — | fade-in |
| Input | border muda para accent | — | — |
| Modal | — | — | scale(0.95→1) + opacity(0→1) |
| Toast | — | — | slide direita + fade |
| Badge crítico | — | — | pulse animation |

---

## REGRA 7 — Formulários com UX correta

```tsx
// ❌ Nunca:
<input placeholder="Digite seu e-mail" />

// ✅ Sempre:
<div className="input-group">
  <label className="input-label" htmlFor="email">E-mail</label>
  <input id="email" type="email" className="input" />
  {error && <span className="input-error">{error}</span>}
</div>
```

- Label sempre visível acima do campo
- Validação inline (não só no submit)
- Mensagem de erro abaixo do campo específico, não genérica
- Botão primário do formulário com estado de loading
- Auto-focus no primeiro campo quando o formulário é o objetivo da tela

---

## REGRA 8 — shadcn/ui: comportamento sim, aparência não

O shadcn/ui é permitido para:
- Acessibilidade (Radix primitives)
- Comportamento (Dialog, Dropdown, Tooltip, etc.)
- Estrutura base de componentes

O shadcn/ui NÃO deve aparecer visualmente:
- Sobrescreva 100% dos estilos visuais com o design system do projeto
- Nunca use `variant="default"`, `variant="outline"` sem customizar
- Nunca use as cores padrão do shadcn (primary, secondary, muted, accent do shadcn)

---

## REGRA 9 — O que está explicitamente proibido

❌ `className="bg-primary text-primary-foreground"` (shadcn sem override)
❌ `className="border-gray-200"` ou qualquer `border-{cor}-{número}`
❌ `className="shadow-md"` sem ser a variável do projeto
❌ `className="rounded-lg"` sem ser a variável do projeto
❌ Hex hardcoded no JSX ou em arquivos que não sejam globals.css
❌ Lista ou tabela sem empty state
❌ Formulário sem validação inline visível
❌ Tela sem skeleton de loading
❌ Ícone decorativo sem `aria-hidden="true"`
❌ Ícone funcional sem `aria-label`
❌ Botão de ação assíncrona sem estado de loading

---

## REGRA 10 — Autoavaliação antes de entregar

Responda antes de considerar qualquer componente ou tela concluída:

1. Alguém saberia que é **[nome do projeto]** ou pareceria template genérico?
2. Os estados loading, empty e error estão implementados?
3. Funciona em 375px (mobile) e 1440px (desktop)?
4. Todos os interativos têm hover e focus visíveis?
5. As cores têm contraste WCAG AA (4.5:1 texto normal, 3:1 texto grande)?
6. Existe ao menos **uma** decisão visual que não veio de um template?

Se qualquer resposta for negativa, corrija antes de entregar.

---

## Referências de qualidade para este projeto

Nível de intenção visual a atingir:
- **Linear** — densidade + dark mode + microinterações precisas
- **Vercel Dashboard** — hierarquia clara, zero decoração desnecessária
- **Stripe Dashboard** — densidade com elegância, feedback imediato
- **Raycast** — tipografia como identidade, cada pixel com propósito

O objetivo não é copiar. É atingir o mesmo nível de intenção.
