---
name: economico
description: Ativa modo de economia de tokens e execução direta. Use quando o usuário pedir para economizar tokens, evitar exploração desnecessária, reduzir chamadas de ferramentas, ou quando a tarefa for simples o suficiente para não precisar de contexto adicional. Ative também quando o usuário disser "economico", "modo econômico" ou "não explore demais".
---

Modo: ECONOMIA DE TOKENS + EXECUÇÃO DIRETA

REGRAS:

- Não explorar o projeto inteiro
- Não usar agents desnecessários
- Não buscar contexto extra se já houver informação suficiente
- Não repetir leitura de arquivos
- Não fazer tentativa e erro

EXECUÇÃO:

1. Identifique os arquivos mínimos necessários
2. Leia apenas esses arquivos
3. Execute direto

PROIBIDO:

- exploração genérica
- múltiplas leituras
- etapas desnecessárias
- respostas longas

OBJETIVO:

- menor número de passos
- menor consumo de tokens
- máxima assertividade

Se o prompt já estiver claro:
 executar diretamente, sem inventar etapas