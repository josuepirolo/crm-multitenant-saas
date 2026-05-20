# /sdds-init

Inicializa a estrutura SDDS no projeto (bootstrap completo). Segue o protocolo abaixo por completo.

## Pré-leitura obrigatória

1. `_sdds_private/01_SDDS_CORE_FOUNDATION.md`
2. `_sdds_private/01E_SDDS_BOOTSTRAP_AND_INITIALIZATION.md`
3. `_sdds_private/01B_SDDS_MEMORY_AND_INDEXING.md`
4. `_sdds_private/01D_SDDS_STACK_AND_ENVIRONMENT.md`

## Argumento opcional

Texto após o comando (se houver): tratar como nome ou descrição curta do projeto.

## Fluxo de execução

### 1. Diagnóstico inicial

- Se houver código significativo: bootstrap em **projeto existente**.
- Se for vazio/greenfield: ler `_sdds_private/05_SDDS_GREENFIELD_PROJECT_INCEPTION.md` e executar inception.

### 2. Escanear projeto existente

Arquivos (se existirem): `README.md`, `package.json`, `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`, `pyproject.toml`, `requirements.txt`, `poetry.lock`, `composer.json`, `go.mod`, `pom.xml`, `build.gradle`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `prisma/schema.prisma`, `supabase/config.toml`.

Pastas: `src/`, `app/`, `pages/`, `api/`, `routes/`, `backend/`, `frontend/`.

### 3. Criar `.sdds/`

Todos os arquivos e diretórios obrigatórios conforme `01E_SDDS_BOOTSTRAP_AND_INITIALIZATION.md` (incluindo `PROJECT.md`, `INDEX.md`, `CURRENT_STATE.md`, `sessions/`, `timeline/`, `specs/`, `decisions/`, `indexes/`, etc.).

### 4. Criar entrypoints para todas as LLMs

Criar ou atualizar na raiz do projeto:

- **`CLAUDE.md`** — instrui Claude Code a ler `CURRENT_STATE.md`, `INDEX.md`, `PROJECT.md` ao iniciar
- **`AGENTS.md`** — instrui Codex/OpenAI Agents a ler os mesmos arquivos antes de executar tarefas
- **`.cursor/rules/sdds.mdc`** — frontmatter `alwaysApply: true`, instrui Cursor Agent a ler `.sdds/` antes de codar
- **`.github/copilot-instructions.md`** — instrui GitHub Copilot a consultar `CURRENT_STATE.md` e specs

Usar os templates de `SDDS-FRAMEWORK.md` como base.

### 5. Scripts e hooks (projetos-alvo)

Copiar de `_sdds_private/scripts/` para `.sdds/scripts/`:

- `validate-spec.js`, `update-index.js`, `update-last-session.js`

**Claude Code:** criar/atualizar `.claude/settings.json` com `PreToolUse`, `PostToolUse`, `Stop` apontando para `node .sdds/scripts/...` (formato Claude).

**Cursor:** criar ou mesclar `.cursor/hooks.json` (não sobrescrever entradas não-SDDS), com `version: 1`:

```json
{
  "version": 1,
  "hooks": {
    "preToolUse": [
      {
        "command": "node .sdds/scripts/validate-spec.js",
        "matcher": "Write|StrReplace|ApplyPatch",
        "timeout": 15
      }
    ],
    "postToolUse": [
      {
        "command": "node .sdds/scripts/update-index.js",
        "matcher": "Write|StrReplace|ApplyPatch",
        "timeout": 15
      }
    ],
    "stop": [
      {
        "command": "node .sdds/scripts/update-last-session.js",
        "timeout": 20
      }
    ]
  }
}
```

Criar `.cursor/commands/` com `sdds-init.md`, `sdds-update.md`, `sdds-status.md` (pode copiar deste repositório SDDS).

Hooks Git — configurar automaticamente executando:

```bash
node _sdds_private/scripts/setup-git-hooks.js
```

O script verifica se `core.hooksPath` já aponta para `_sdds_private/githooks` e configura se necessário. É idempotente. Ativa:

- **pre-commit** — `validate-spec.js --git-staged`
- **post-commit** — `update-index.js --record-git-head`

### 6. Configurar linters por stack

Criar `.sdds/linters.json` com os linters detectados:

| Stack | Linter | Comando | optional |
|---|---|---|---|
| Python + ruff | ruff | `ruff check .` | false |
| Python + pylint | pylint | `pylint **/*.py` | true |
| Python + mypy | mypy | `mypy .` | true |
| JS/TS + eslint | eslint | `npx eslint . --ext .js,.ts,.tsx,.jsx` | false |
| Go | go vet | `go vet ./...` | false |
| Rust | clippy | `cargo clippy -- -D warnings` | false |
| Ruby + rubocop | rubocop | `rubocop` | true |
| PHP + phpcs | phpcs | `vendor/bin/phpcs` | true |

Se nenhum linter detectado: criar arquivo com array vazio e avisar na entrega.

### 7. Configurar memória persistente do Claude Code

Criar no diretório de memória do projeto (caminho fornecido pelo sistema em cada sessão):

- `MEMORY.md` — índice com entrada para `user_response_preferences.md`
- `user_response_preferences.md` — preferências de comportamento:
  - Sem introdução ou texto de preenchimento; ir direto ao ponto
  - Formato de saída explícito quando relevante (bullets, tabelas)
  - Dizer "não sei" quando não tiver certeza — nunca especular como fato
  - Respostas curtas e focadas; economia de tokens é valorizada

Se os arquivos já existirem, não sobrescrever — apenas adicionar entradas ausentes.

### 8. Verificar skill-creator

Verificar ambos:
- **Claude Code**: `~/.claude/skills/skill-creator/SKILL.md`
- **Cursor**: `~/.cursor/skills/skill-creator/SKILL.md`

Para cada um:
- Se sim: confirmar na entrega final como instalado
- Se não: informar e recomendar instalação — necessário para criar skills customizadas no projeto em cada tool

### 9. Validação obrigatória

Antes de responder: confirmar que **todos** os artefatos obrigatórios de `.sdds/` existem; completar o que faltar.

## Entrega obrigatória

- Lista do que foi criado em `.sdds/`
- Stack detectada
- Módulos mapeados
- Riscos / dívidas
- Próxima ação recomendada
- Perguntas em aberto (se houver)
- Status da memória persistente (criada / já existia)
- Status do skill-creator (instalado / não encontrado)
