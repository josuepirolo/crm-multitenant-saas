# /sdds-update

Consolida a memória SDDS **após** trabalho substantivo: sem transcrição de chat; só conhecimento reutilizável.

## Pré-leitura obrigatória

1. `_sdds_private/01B_SDDS_MEMORY_AND_INDEXING.md`
2. `.sdds/CURRENT_STATE.md` (se existir)
3. `.sdds/INDEX.md` (se existir)

Se `.sdds/` não existir: informar para rodar `/sdds-init` primeiro.

## Fluxo de execução

### 1. Evidências

Executar: `git status`, `git diff --stat HEAD`, `git log -5 --oneline`.

### 2. Rotação de memória (housekeeping)

Executar `node _sdds_private/scripts/rotate-memory.js` — arquiva `.sdds/sessions/`
e `.sdds/timeline/` com mais de 30 dias em `archive/YYYY-MM/`. Saiu do hook `stop`
(ver `.sdds/decisions/ADR-001-stop-hook-leve.md`) por causar lentidão a cada
encerramento de turno; agora roda só aqui, uma vez por consolidação.

### 3. Substância (`OPERACIONAL_SUBSTANTIVO`)

Avaliar conforme `01B_SDDS_MEMORY_AND_INDEXING.md`.

- Se não for substantivo (perguntas rápidas, trivial): não criar novo arquivo de sessão sem necessidade — confirmar ao utilizador.

### 4. Artefatos a atualizar

**Sempre quando substantivo:**

- **Sessões:** garantir entrada em `.sdds/sessions/` com o que foi feito, decisões, riscos, próximos passos  
  (_se o hook `stop` já criou stub no mesmo período_, **enriquecer** esse arquivo ou criar entrada complementar segundo `01B` — não duplicar conteúdo inútil).
- **`timeline/`:** append em `.sdds/timeline/YYYY-MM-DD.md`.
- **`CURRENT_STATE.md`:** atualizar quando houver impacto operacional relevante.

**Conforme impacto:**

- `CHANGELOG.md`, `discoveries/`, `decisions/ADR-NNN-*.md`, specs/contracts afetados.

### 5. `INDEX.md`

Se módulos, rotas ou ficheiros-chave mudaram na memória navegável, atualizar `.sdds/INDEX.md`.

### 6. Atualizar README.md

Se nesta sessão foi adicionada, alterada ou removida qualquer funcionalidade do framework
(novo script, hook, comando, guardrail, módulo, entrypoint), atualizar `README.md` para refletir o estado atual.

O README é a fonte de verdade pública do framework — deve estar sempre alinhado com a implementação real.

### 7. Confirmar ao utilizador

Listar objetivamente o que gravou/caminhos tocados (`sessions/`, `timeline/`, `CURRENT_STATE`, ADRs, etc.).

### 8. Sugerir nova sessão quando fizer sentido

Se o trabalho consolidado representa um marco natural de conclusão (módulo fechado,
specs concluídas, commit+push feito, decisão registrada — não uma pausa no meio de
algo em andamento), sugerir ao utilizador iniciar uma sessão nova:

> Estado consolidado em `CURRENT_STATE.md`/`INDEX.md` — bom momento para `/clear` e
> começar uma sessão nova; o `SessionStart` (`inject-session-context.js`) recupera
> esse estado automaticamente.

Razão: a sessão atual já carrega contexto acumulado e tende a disparar compactação
automática (custosa em tokens — ver discussão e fontes na sessão de 2026-06-08).
Começar do zero após consolidar é mais barato do que deixar a conversa crescer até
o limite. Esta é apenas uma **sugestão** — a decisão de limpar a sessão é sempre do
utilizador, o agente não tem como medir o uso de contexto nem encerrar a própria sessão.
