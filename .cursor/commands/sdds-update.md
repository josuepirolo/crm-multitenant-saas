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

### 2. Substância (`OPERACIONAL_SUBSTANTIVO`)

Avaliar conforme `01B_SDDS_MEMORY_AND_INDEXING.md`.

- Se não for substantivo (perguntas rápidas, trivial): não criar novo arquivo de sessão sem necessidade — confirmar ao utilizador.

### 3. Artefatos a atualizar

**Sempre quando substantivo:**

- **Sessões:** garantir entrada em `.sdds/sessions/` com o que foi feito, decisões, riscos, próximos passos  
  (_se o hook `stop` já criou stub no mesmo período_, **enriquecer** esse arquivo ou criar entrada complementar segundo `01B` — não duplicar conteúdo inútil).
- **`timeline/`:** append em `.sdds/timeline/YYYY-MM-DD.md`.
- **`CURRENT_STATE.md`:** atualizar quando houver impacto operacional relevante.

**Conforme impacto:**

- `CHANGELOG.md`, `discoveries/`, `decisions/ADR-NNN-*.md`, specs/contracts afetados.

### 4. `INDEX.md`

Se módulos, rotas ou ficheiros-chave mudaram na memória navegável, atualizar `.sdds/INDEX.md`.

### 5. Atualizar README.md

Se nesta sessão foi adicionada, alterada ou removida qualquer funcionalidade do framework
(novo script, hook, comando, guardrail, módulo, entrypoint), atualizar `README.md` para refletir o estado atual.

O README é a fonte de verdade pública do framework — deve estar sempre alinhado com a implementação real.

### 6. Confirmar ao utilizador

Listar objetivamente o que gravou/caminhos tocados (`sessions/`, `timeline/`, `CURRENT_STATE`, ADRs, etc.).
