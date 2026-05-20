# /sdds-status

Resumo executivo do SDDS (**máximo 40 linhas** de conteúdo útil — sem narrar o processo).

## Pré-leitura (só os que existirem)

1. `.sdds/INDEX.md`
2. `.sdds/CURRENT_STATE.md`
3. `.sdds/sessions/` — **apenas** o ficheiro mais recente
4. `.sdds/indexes/risks.index.md`

## Fluxo

1. Se não existir `.sdds/`: dizer que SDDS não está inicializado e sugerir `/sdds-init`.
2. Caso contrário: produzir estas secções curtas:

---

**Estado operacional** — branch git; fase/tom de `CURRENT_STATE.md`; última sessão (data + gancho).

**Módulos** — implementados / em dev / planejados (a partir do `INDEX`).

**Pendências** — `PENDENTE`, `A_CONFIRMAR`, ou equivalentes encontrados sob `.sdds/` (priorizados).

**Riscos** — de `indexes/risks.index.md` ou `CURRENT_STATE.md`.

**Próxima ação** — um passo concreto.

**Inconsistências** — ficheiros SDDS obrigatórios em falta; divergências óbvias spec↔repo (sem auditoria pesada).

---

## Argumento opcional

Texto após o comando: filtrar por módulo ou área, mantendo **≤ 40 linhas**.

## Regra

Markdown compacto; **não** listar “li o ficheiro X” — só fatos e próximo passo.
