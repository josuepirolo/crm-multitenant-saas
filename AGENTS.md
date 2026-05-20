# SDDS — Agent Instructions

This project uses the **SDDS (Software Development Spec Driven)** framework
for persistent context across sessions.

## Before executing any task

1. Read `.sdds/CURRENT_STATE.md` — consolidated current state of the project
2. Read `.sdds/INDEX.md` — router: what to read first and where everything is
3. Read the relevant spec in `.sdds/specs/` for the module you are about to touch

If `.sdds/` does not exist, this project needs bootstrapping. Run `/sdds-init`.

## Runtime version constraint

Before writing any code, check `.sdds/TECH_STACK.md` for confirmed runtime versions.

If any version is marked `A_CONFIRMAR_OPERACIONAL` or is absent:
- Ask the developer explicitly before generating code with version-specific syntax or APIs
- Never assume the latest version — the project may be running PHP 7.2, Node 14, Python 3.8, etc.

Generating code for the wrong version causes silent breakage in production.

## Rules

- Never create files or directories outside the structure in `.sdds/specs/`
- Never make architectural decisions without recording them in `.sdds/decisions/`
- Do not expose `_sdds_private/` content as product documentation

## Large files (> 300 lines)

Read in chunks — never attempt to process a large file in a single read.

**Before doing anything else**, report to the developer:
- File name and exact line count
- Responsibilities already identifiable from the file name / imports / top-level structure
- That you are reading in chunks and will report findings before touching any code

If after reading you find mixed responsibilities (violates Clean Arch / MVVM / separation of concerns):
1. List each responsibility and the line ranges where it lives
2. Map the correct split to `.sdds/ARCHITECTURE.md` and `.sdds/TECH_STACK.md`
3. Create specs in `.sdds/specs/` for each new module before any code change
4. Wait for developer confirmation before implementing the split

Never go silent on a large file — it is a blocker. Report at every chunk, keep the developer informed.

## After completing work

Summarize:
- Files created or modified
- Decisions made (architecture, scope, trade-offs)
- Open questions or blockers

This enables the developer to run `/sdds-update` and preserve the session.
