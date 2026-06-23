# Skills — instalação Claude + Cursor

## Claude Code

Copiar pastas de `skills/claude/*/SKILL.md` para `.claude/skills/` do **novo projeto**:

```
.claude/skills/
├── arquitetura/SKILL.md
├── ui-execution-rules/SKILL.md
├── nextjs-security-audit/SKILL.md
├── security-review-gate/SKILL.md
└── frontend-bootstrap/SKILL.md
```

Cada skill **deve** ter frontmatter YAML (`name`, `description`).

Referenciar no `CLAUDE.md` do projeto:

```markdown
## Regras permanentes
@import .claude/skills/ui-execution-rules/SKILL.md
```

## Cursor

Copiar para o novo projeto:

```
.cursor/rules/architecture.mdc      ← skills/cursor/rules/
.cursor/rules/security.mdc
.cursor/rules/frontend-ui.mdc
.cursor/commands/project-init.md
.cursor/commands/security-review.md
```

## Ordem de ativação (LLM)

1. `frontend-bootstrap` — novo projeto
2. `arquitetura` — antes de feature
3. `ui-execution-rules` — antes de JSX
4. `security-review-gate` — antes de commit sensível
5. `nextjs-security-audit` — auditoria completa

## Sem SDDS

Estas skills referenciam `specs_default/` — **não** `.sdds/`.
