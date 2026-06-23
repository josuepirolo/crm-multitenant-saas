---
name: brand-discovery
description: Conduz entrevista de descoberta de marca e produto, e gera docs/brand.md com identidade visual completa (paleta, tipografia, tom, módulos, perfis de usuário). Chamada pela skill frontend-init na Fase 1 do planejamento do zero — não ativar diretamente exceto se o usuário pedir explicitamente para refazer ou atualizar a identidade visual do produto.
---

# SKILL: brand-discovery
# Conduz entrevista de descoberta e gera identidade visual completa
# Chamada por: frontend-init — Fase 1

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
Fazer as perguntas certas para entender o produto, o público e o tom visual,
e então gerar um `brand.md` completo — sem inventar nada sobre o negócio do usuário.

---

## PROTOCOLO DE ENTREVISTA

Execute os blocos de perguntas em sequência. Apresente um bloco por vez.
Aguarde resposta antes de avançar. Nunca apresente todos os blocos de uma vez.

---

### BLOCO 1 — Produto e propósito

Pergunte:

```
1. Qual é o nome do produto?
2. Em uma frase: o que ele faz e para quem?
3. Qual é o maior problema que ele resolve para o usuário?
```

---

### BLOCO 2 — Público e contexto de uso

Pergunte:

```
4. Quem vai usar no dia a dia? (cargo, perfil, nível técnico)
5. Em qual contexto ele será usado? (escritório, campo, mobile, desktop)
6. Com que frequência? (várias vezes ao dia / semanalmente / ocasionalmente)
```

---

### BLOCO 3 — Posicionamento e tom

Pergunte:

```
7. Cite 3 adjetivos que descrevem como o produto deve se sentir ao usar.
   (ex: rápido, confiável, elegante / simples, amigável, direto)

8. Cite 1 produto (qualquer segmento) que você admira visualmente e por quê.
   (ex: "Linear — porque é denso mas não cansa")

9. O que o produto definitivamente NÃO deve parecer?
   (ex: "não pode parecer planilha", "não pode ser colorido demais")
```

---

### BLOCO 4 — Preferências visuais

Pergunte:

```
10. Tema preferido: Dark mode / Light mode / Ambos com dark como padrão?

11. Você tem alguma cor obrigatória? (cor da marca, cor de um parceiro, cor do segmento)
    Se sim, qual é o hex ou descrição?

12. Prefere visual mais: Minimalista e clean / Rico e denso / Intermediário?
```

---

### BLOCO 5 — Estrutura do produto (rápido)

Pergunte:

```
13. Quais são as seções ou módulos principais do sistema?
    (ex: dashboard, inbox, kanban, relatórios, configurações)

14. Qual é a tela que o usuário mais vai usar no dia a dia?

15. O sistema tem múltiplos perfis de usuário com permissões diferentes?
    Se sim, quais são?
```

---

## GERAÇÃO DO brand.md

Após receber todas as respostas, gere o arquivo `docs/brand.md` com esta estrutura:

```markdown
# Brand — [Nome do Produto]

## Produto
- **Nome:** [nome]
- **Tagline:** [frase de uma linha]
- **Problema resolvido:** [descrição]
- **Público principal:** [perfis]
- **Contexto de uso:** [onde e como]
- **Frequência de uso:** [frequência]

## Tom e personalidade
- **Adjetivos:** [3 adjetivos]
- **Referência visual:** [produto citado + por quê]
- **O que evitar:** [restrições]

## Diretrizes visuais
- **Tema:** [dark/light/ambos]
- **Densidade:** [minimalista/rico/intermediário]
- **Cor obrigatória:** [hex ou "nenhuma"]

## Paleta gerada
<!-- Gerada com base nas respostas acima -->
- **--accent:** #[hex]        /* cor de ação principal */
- **--accent-hover:** #[hex]
- **--bg-primary:** #[hex]    /* fundo principal */
- **--bg-secondary:** #[hex]  /* sidebar, cards */
- **--bg-tertiary:** #[hex]   /* painéis secundários */
- **--bg-elevated:** #[hex]   /* cards elevados, modais */
- **--border:** #[hex]
- **--border-strong:** #[hex]
- **--text-primary:** #[hex]
- **--text-secondary:** #[hex]
- **--text-muted:** #[hex]
- **--success:** #[hex]       /* positivo, concluído */
- **--warning:** #[hex]       /* atenção, aguardando */
- **--error:** #[hex]         /* problema, urgente */
- **--info:** #[hex]          /* informativo, neutro */

## Tipografia
- **Display/títulos:** [fonte — ex: Inter 700]
- **Corpo:** [fonte — ex: Inter 400/500]
- **Mono (dados):** [fonte — ex: JetBrains Mono]
- **Escala:** xs(11px) sm(13px) base(14px) md(16px) lg(18px) xl(22px) 2xl(28px) 3xl(36px)

## Módulos do sistema
[lista dos módulos respondidos na pergunta 13]

## Tela principal
[tela respondida na pergunta 14]

## Perfis de usuário
[perfis e permissões respondidos na pergunta 15]

## Referências visuais (para o Claude manter consistência)
- [produto citado na pergunta 8]
- [extrair mais 1-2 referências coerentes com os adjetivos]
```

---

## REGRAS DE GERAÇÃO DA PALETA

### Se dark mode:
- bg-primary entre #080808 e #0F0F0F
- bg-secondary entre #111111 e #161616
- bg-tertiary entre #1A1A1A e #1F1F1F
- bg-elevated entre #222222 e #282828
- border entre #2A2A2A e #333333
- text-primary: #FFFFFF ou #F4F4F5
- text-secondary: #A1A1AA
- text-muted: #52525B

### Se light mode:
- bg-primary: #FAFAFA ou #FFFFFF
- bg-secondary: #FFFFFF
- bg-tertiary: #F4F4F5
- bg-elevated: #FFFFFF
- border: #E4E4E7
- text-primary: #09090B
- text-secondary: #71717A
- text-muted: #A1A1AA

### Cor de accent:
- Se o usuário forneceu cor obrigatória: use como accent, derive hover (10% mais escura)
- Se não forneceu: derive do posicionamento do produto:
  - Operacional/tempo real → verde (#25D366 ou derivado)
  - Financeiro/confiança → azul (#3B82F6 ou derivado)
  - Criativo/moderno → roxo (#8B5CF6 ou derivado)
  - Saúde/bem-estar → teal (#14B8A6 ou derivado)
  - Varejo/energia → âmbar (#F59E0B ou derivado)
- Sempre derive accent-hover como 10-15% mais escuro

### Semânticas (sempre presentes, independente do tema):
- success: #25D366 (ou derivado verde que contraste com o accent)
- warning: #F59E0B
- error: #EF4444
- info: #3B82F6

---

## VALIDAÇÃO ANTES DE SALVAR

Antes de entregar o brand.md, verifique internamente:
- [ ] Contraste text-primary sobre bg-primary ≥ 4.5:1 (WCAG AA)
- [ ] Accent visível sobre bg-secondary
- [ ] Success, warning e error não colidem visualmente com o accent
- [ ] A paleta tem identidade — não parece a paleta padrão do shadcn/ui (zinc + blue)
- [ ] Os adjetivos do usuário se refletem nas escolhas (ex: "elegante" → sem cores saturadas)
