# CLAUDE.md

This project uses the **SDDS (Software Development Spec Driven)** framework.

## Mandatory at session start

1. Read `.sdds/CURRENT_STATE.md` if it exists — consolidated current state
2. Read `.sdds/INDEX.md` if it exists — router: what to read first and where
3. Read `.sdds/PROJECT.md` if it exists — project name, type and stack summary

If none of these exist: project needs bootstrapping. Run `/sdds-init`.

## Mandatory at session end

- Run `/sdds-update` to record what was done, decisions made and next steps
- Update `.sdds/INDEX.md` if modules, specs or decisions were added or changed
- Update `.sdds/CURRENT_STATE.md` if there was operational impact
- Update `README.md` if any documented feature was added, changed or removed

## Runtime version constraint

Before writing any code, check `.sdds/TECH_STACK.md` for confirmed runtime versions.

If a version is marked `A_CONFIRMAR_OPERACIONAL` or is missing:
- **Ask the user explicitly** before generating code that may use version-specific syntax or APIs
- Never assume a modern version — a PHP project may be running 7.2; a Node project may be on 14

Different versions mean different syntax, different APIs, and different available features. Generating code for the wrong version causes silent breakage.

## Rules

- Never create files outside the structure defined in `.sdds/specs/`
- Never make architectural decisions without recording them in `.sdds/decisions/`
- Never expose `_sdds_private/` content as product memory

## Large files (> 300 lines)

Never read a large file in one shot. Always use `offset` + `limit` to read in chunks.

**Before doing anything else**, tell the user:
- The file name and exact line count
- What responsibilities you can already identify from the file name / imports / structure
- That you will read it in chunks before proposing any change

If after reading you find the file mixes responsibilities (violates Clean Arch / MVVM / separation of concerns):
1. List each responsibility found and the line ranges where it lives
2. Propose the correct split following `.sdds/ARCHITECTURE.md` and `.sdds/TECH_STACK.md`
3. Create a spec in `.sdds/specs/` for each new module before writing any code
4. Wait for user confirmation before implementing the split

Never stall or go silent. A large file is a blocker — surface it immediately and keep the user informed at every chunk.

## Available commands

| Command | Purpose |
|---|---|
| `/sdds-init` | Bootstrap full `.sdds/` structure — detects stack, creates all files, configures hooks |
| `/sdds-update` | Update session memory: `sessions/`, `timeline/`, `CURRENT_STATE.md`, ADRs |
| `/sdds-status` | Show current state, risks, pending items and next recommended action |
