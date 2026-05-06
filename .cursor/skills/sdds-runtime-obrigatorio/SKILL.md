---
name: sdds-runtime-obrigatorio
description: Ativa o runtime SDDS antes de qualquer tarefa. OBRIGATÓRIO sempre que o usuário pedir para implementar, criar, alterar, auditar, revisar ou especificar qualquer módulo, arquivo, componente, endpoint, migration ou comportamento do projeto. Garante que specs, contracts e harness sejam lidos antes de qualquer código. Nunca bypassa o SDDS. Segue a política de sanitização definida em _sdds_private/policies/SANITIZATION_POLICY.md.
---

# Skill: SDDS Runtime Obrigatório

## Ativação

Esta skill é ativada em TODA tarefa de implementação, criação, alteração, auditoria ou revisão de código ou documentação neste projeto.

## Fluxo obrigatório

Antes de qualquer ação técnica:

1. Ler `_sdds_private/00_SDDS_SESSION_ORCHESTRATOR.md`
2. Ler `_sdds_private/01_SDDS_CORE_FOUNDATION.md`
3. Ler `.sdds/INDEX.md` e `.sdds/CURRENT_STATE.md`
4. Identificar o módulo e o objetivo da sessão
5. Selecionar o módulo SDDS apropriado e executar

## Regras

- Nunca implementar antes de spec/contract/harness existirem
- Nunca transformar inferência em fato
- Nunca persistir runtime privado em `.sdds/`
- Seguir segregação dual-layer: `.sdds/` (memória pública) / `_sdds_private/` (runtime privado)
- Seguir política de sanitização: `_sdds_private/policies/SANITIZATION_POLICY.md`
- Atualizar `.sdds/` após qualquer alteração relevante
- Trabalhar com contexto econômico (mínimo de leitura necessária)

## Módulos disponíveis

| Módulo | Quando usar |
|---|---|
| `_sdds_private/02_SDDS_CREATE_MODULE_SPEC.md` | Criar spec de módulo |
| `_sdds_private/03_SDDS_RESOLVE_PENDING_CONFIRMATIONS.md` | Resolver pendências A_CONFIRMAR |
| `_sdds_private/04_SDDS_AUDITOR.md` | Auditar ou validar módulo |
| `_sdds_private/06_SDDS_IMPLEMENTATION.md` | Implementar com spec já criada |

## Segregação de memória

- `.sdds/` — memória pública sanitizada: specs, contracts, harness, current_state, discoveries
- `_sdds_private/` — runtime privado: orchestrator, governance, heurísticas, policies
