---
name: patch
description: Ativa modo de patch mínimo — resolve o problema com a menor alteração possível. Use quando o usuário pedir uma correção pontual, um fix rápido, ou disser "não mexa em mais nada", "só corrija isso", "patch mínimo". Ideal para bugs isolados onde reescrever ou refatorar seria excessivo.
---

Modo: PATCH MÍNIMO (EXECUÇÃO CONTROLADA)

OBJETIVO:
Resolver o problema com a menor alteração possível.

REGRAS:

- Não reescrever componentes inteiros
- Não criar arquivos novos sem necessidade
- Reutilizar código existente
- Evitar refatoração ampla
- Evitar mudanças globais (ex: CSS global) sem necessidade

EXECUÇÃO:

1. Identificar o ponto exato do problema
2. Alterar apenas o necessário
3. Preservar estrutura atual

PROIBIDO:

- overengineering
- abstrações desnecessárias
- mudanças amplas sem justificativa

RESPOSTA:

- curta
- listar apenas arquivos alterados
- resumo em poucas linhas