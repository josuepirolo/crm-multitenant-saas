---
name: token-economy
description: >
  Ative quando o usuário quiser economizar tokens, estiver chegando no limite de uso do Claude, quiser otimizar prompts ou entender como funcionam as cotas. Também ative quando o usuário estiver fazendo algo visivelmente custoso (upload de PDF enorme para pergunta simples, conversa de 40+ trocas sobre assunto concluído, etc.). Palavras-chave: "economizar tokens", "limite do Claude", "acabando o limite", "otimizar uso", "token economy", "save tokens", "durar mais", "não gastar tokens".
---

# Token Economy — Guia de Economia de Tokens no Claude

> **Contexto real:** O Claude.ai usa uma janela de contexto de 200K tokens. Os limites de uso funcionam em janelas móveis de 5 horas, com limites semanais adicionais para usuários pesados (introduzidos em agosto de 2025). Cada mensagem faz o Claude reprocessar **toda** a conversa desde o início — não só a última pergunta.

---

## Por que os tokens acabam rápido

O mecanismo principal de gasto: a mensagem #30 de uma conversa custa o equivalente a 29 trocas anteriores + sua nova pergunta. A conversa cresce como uma bola de neve. Isso é por design (contexto completo = respostas melhores), mas exige gerenciamento ativo.

**Fontes ocultas de gasto:**
- Uploads de PDF: 1.500–3.000 tokens por página
- Screenshots sem crop: até 1.300 tokens para uma imagem 1000×1000
- Arquivos DOCX/PPTX: carregam metadados invisíveis que você não pediu
- Ferramentas e conectores MCP: intensivos em tokens por natureza
- Reuploads do mesmo arquivo em chats diferentes

---

## As 10 regras de ouro

### 1. Mate conversas longas, não as deixe crescer indefinidamente
Quando uma conversa ultrapassar ~20 trocas sobre um assunto concluído, **abra um novo chat**. Não continue só pela conveniência de ter o histórico visível — esse histórico está te custando tokens em cada resposta.

### 2. Peça resumos antes de continuar
Se precisar continuar um tema longo, peça: *"Resuma os pontos principais desta conversa em 5 bullet points"* e use esse resumo como contexto em um chat novo. Você transforma 50K tokens de histórico em ~500 tokens de resumo.

### 3. Seja específico na primeira mensagem
Prompts vagos geram respostas exploratórias longas (= tokens de saída caros) e geralmente exigem follow-ups (= mais tokens de entrada). Um prompt preciso resolve na primeira vez.

❌ `"Me ajuda com esse código"`  
✅ `"Esse loop Python está lançando IndexError na linha 12. Qual o bug e como corrigir?"`

### 4. Combine perguntas relacionadas em uma só mensagem
Cada mensagem separada carrega o peso de todo o histórico. Se você tem 3 perguntas sobre o mesmo assunto, mande as 3 juntas.

❌ Mensagem 1: "Qual a capital da França?"  
❌ Mensagem 2: "E da Alemanha?"  
✅ Mensagem única: "Qual a capital da França, Alemanha e Japão?"

### 5. Use o botão Editar, não "na verdade, mude X"
Ao enviar "na verdade, corrija Y" você adiciona uma mensagem nova ao contexto. Ao editar a mensagem anterior, você substitui e reinicia a partir daí. **Editar = tokens salvos.**

### 6. Converta arquivos pesados antes de subir
- PDF de 15 páginas → copie só o trecho relevante como texto
- Screenshot de tela cheia → recorte só a área que importa
- DOCX → extraia o texto puro (`.txt` ou `.md`)
- Nunca faça upload do mesmo arquivo em múltiplos chats

Para converter um doc em texto: `doc.new` no navegador → cole o conteúdo → baixe como `.md`

### 7. Desligue ferramentas que não está usando
Conectores MCP (Google Drive, Gmail, Slack, etc.) e web search têm custo por estarem ativos, mesmo quando você não os usa ativamente. Desative nas configurações o que não é necessário para a tarefa em curso.

### 8. Escolha o modelo certo para a tarefa
Nem toda tarefa precisa do modelo mais poderoso. Tarefas simples (resumos curtos, formatação, tradução) gastam a mesma cota que tarefas complexas quando você usa Sonnet ou Opus desnecessariamente. Se o Claude Code está disponível, use `/model` para mudar de modelo dentro da sessão.

### 9. Distribua o uso na janela de 5 horas
O limite reseta a cada 5 horas a partir da primeira mensagem da sessão. Se você queimar tudo de manhã, passa o resto do período sem acesso. Planeje sessões intensas com intervalos.

### 10. Use Projects com instruções enxutas
O Project Knowledge (base de conhecimento do projeto) é carregado em toda mensagem dentro do projeto. Mantenha o knowledge base **curto e objetivo** — apenas o que é estritamente necessário. Instrução de projeto inchada = tokens gastos em todo prompt sem você perceber.

---

## Quando usar Projects vs. Chats avulsos

| Situação | Recomendação |
|---|---|
| Trabalho recorrente com contexto fixo (ex: seu projeto de código) | Project — escreva instruções enxutas |
| Consulta pontual ou exploração | Chat avulso — descarte depois |
| Tarefa concluída que você nunca vai retomar | Feche e não volte ao chat |
| Precisa continuar um tema de uma conversa antiga | Peça resumo → abra chat novo |

---

## Métricas de alerta

Se você se pegar fazendo alguma desses, está vazando tokens:

- Enviando "ok" / "entendi" / "perfeito" como mensagens soltas
- Subindo o mesmo PDF em chats diferentes
- Respondendo dentro de uma conversa de 40+ mensagens sobre um assunto já concluído
- Deixando tools MCP ativas que você não usou nessa sessão
- Pedindo "continue" quando poderia ter pedido tudo de uma vez

---

## Referência rápida de custos por tipo de entrada

| Tipo | Custo aproximado |
|---|---|
| Mensagem de texto curta | ~100–500 tokens |
| Página de PDF | 1.500–3.000 tokens |
| Screenshot 1000×1000 | ~1.300 tokens |
| Screenshot recortada (área pequena) | 100–300 tokens |
| Arquivo DOCX/PPTX | Alto (metadados ocultos) |
| Texto puro equivalente | Mínimo |

---

## Para o Claude Code especificamente

- Use `/compact` para comprimir o contexto da sessão sem perder o trabalho
- Use `/model` para alternar para Sonnet em tarefas que não precisam de Opus
- Faça edições em batch: um `diff` grande consome menos que vários "ajuste X" sequenciais
- Mantenha o `CLAUDE.md` curto — ele é carregado **em todo task**. Mova instruções ocasionais para Skills (carregamento sob demanda)
- Skills são carregadas sob demanda — melhor que colocar tudo no CLAUDE.md
- **Custo invisível:** CLAUDE.md + todas as `@import` rules + hooks configurados são carregados em cada mensagem. Um CLAUDE.md de 5KB pode custar ~3.000–4.000 tokens de input por mensagem.

---

## Diagnóstico de sessão — execute apenas na primeira ativação da skill

Na primeira vez que a skill for ativada em uma sessão, analise a conversa e emita um diagnóstico. Em ativações subsequentes (usuário já ciente), omita o diagnóstico a menos que o usuário pergunte explicitamente. Seja direto; não peça permissão.

### Como contar o peso da sessão atual

1. Estime o número de trocas (pares pergunta+resposta) visíveis no histórico.
2. Estime se há arquivos, imagens ou ferramentas MCP no contexto.
3. Avalie se o assunto da conversa ainda está ativo ou já foi concluído.

### Árvore de decisão

```
O histórico tem mais de 15 trocas?
├── SIM → O assunto ainda está ativo e em aberto?
│         ├── SIM → RECOMENDAÇÃO B: economize dentro desta sessão (resumo + continue)
│         └── NÃO → RECOMENDAÇÃO C: nova sessão agora
└── NÃO → O contexto tem arquivos pesados desnecessários ou tools MCP ativas sem uso?
          ├── SIM → RECOMENDAÇÃO B: economize dentro desta sessão (limpe o contexto)
          └── NÃO → RECOMENDAÇÃO A: sessão saudável, sem ação necessária
```

### O que dizer em cada caso

**RECOMENDAÇÃO A — Sessão saudável**
> "✅ Sessão leve (~X trocas). Nenhuma ação necessária agora."

**RECOMENDAÇÃO B — Economize dentro desta sessão**
> "⚠️ Sessão pesada (~X trocas / arquivos detectados / tools ativas). Ainda vale continuar aqui, mas:
> - [ação concreta 1, ex: desative o conector Y que não foi usado]
> - [ação concreta 2, ex: a próxima pergunta pode ser combinada com Z para evitar uma mensagem extra]"

**RECOMENDAÇÃO C — Nova sessão agora**
> "🔴 Sessão muito pesada (~X trocas) sobre assunto já concluído. Cada mensagem nova está carregando esse histórico inteiro sem necessidade.
> Faça isso antes de continuar:
> 1. Peço um resumo dos pontos que ainda precisam de contexto: '[cole aqui]'
> 2. Abra um novo chat e cole o resumo no início.
> Economia estimada: ~Y tokens por mensagem daqui pra frente."

### Regra de ouro do diagnóstico

Nunca omita o diagnóstico por educação. Se a sessão está pesada, diga. O usuário pediu economia — isso inclui situações em que a resposta mais econômica é "abra um chat novo".

---

## Relatório de tokens — apenas quando relevante

Inclua o bloco de Token Report **somente** quando:
- O usuário pedir explicitamente ("quanto custou?", "mostre o relatório")
- O diagnóstico for B ou C (sessão pesada — o relatório reforça o motivo da recomendação)
- A resposta envolver uma otimização concreta que vale quantificar

**Não inclua** em respostas simples, consultas rápidas ou quando já está em modo econômico — o overhead do bloco cancela a economia.

```
---
📊 TOKEN REPORT (estimativas — Claude não tem acesso aos contadores reais)

Interação atual
  Input estimado:   ~X tokens  (histórico + system prompt + sua mensagem)
  Output estimado:  ~Y tokens  (esta resposta)
  Total:            ~Z tokens
  Maior consumo:    INPUT ou OUTPUT

Comparativo sem otimização
  Versão não-otimizada teria custado: ~W tokens
  Economia estimada: ~V tokens (~P%)
  Motivo: [ex: resposta direta em vez de exploratória / sem reupload de arquivo / etc.]

⚠️ Estes números são estimativas calculadas por contagem aproximada de palavras×1.3.
   O Claude não tem acesso aos contadores reais de tokens ou ao seu % de limite consumido.
   Para dados precisos: Settings → Usage no claude.ai (se disponível no seu plano).
---
```

**Como calcular honestamente:**
- Input ≈ (total de palavras no histórico + system prompt + CLAUDE.md + @import rules + skills carregadas) × 1,3
- Output ≈ (palavras desta resposta) × 1,3
- Versão não-otimizada: estime como seria a resposta se o Claude tivesse explorado sem direção, adicionando ~40–80% ao output para respostas exploratórias, ou o custo de um arquivo que poderia ter sido texto

**Nunca invente % de limite consumido** — isso varia por plano, por janela de 5 horas e por uso paralelo em outros chats. Apenas indique onde o usuário pode consultar o dado real.

**Sobre CLAUDE.md e Skills:** Em projetos com CLAUDE.md + rules importadas + hooks, o overhead de sistema pode representar 3.000–6.000 tokens de input por mensagem — mesmo em conversas curtas. Mencione isso quando for o maior contribuinte ao custo.

---

## Fontes verificáveis

- Limites e janelas móveis: https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work
- Usage limit best practices (página oficial da Anthropic): mencionada na doc de limites acima
- Limites semanais introduzidos em agosto de 2025 (afetam <5% dos usuários com uso pesado)
