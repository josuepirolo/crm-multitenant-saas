# ADR-003 — Múltiplas origens por contato via tabela de junção (não tags livres)

## Data
2026-06-09

## Status
ACEITO

## Contexto
Usuário relatou que uma importação de 3.102 contatos resultou em "0 criados / 3.102 ignorados" sem explicação clara (eram todos duplicados — corrigido separadamente, ver `CURRENT_STATE.md`). No mesmo pedido, levantou que um contato pode ter vindo de **múltiplas origens** (ex: campanha de Facebook + indicação) e hoje `contacts.source_id` só guarda uma única origem.

Requisito explícito do usuário: **não** quer "tags" genéricas no estilo livre que "viram lixo depois" — quer múltiplas origens, mas sempre vindas da lista controlada `contact_sources` (já existente, gerenciável via `ContactSourcesSheet`).

## Decisão
Criar tabela de junção N:N `contact_source_assignments` (`contact_id`, `source_id`, `workspace_id`, `UNIQUE(contact_id, source_id)`, RLS por `workspace_id`), em vez de:
- um campo `tags text[]` livre, ou
- uma tabela `contact_tags` genérica reaproveitada para origem.

`contacts.source_id` é **mantido** como "origem primária" (compatibilidade com formulário manual, filtros existentes, relatórios). A importação por planilha:
- aceita múltiplas origens por linha separadas por vírgula (mesma coluna `origem`/`canal`/`source`/`origin`);
- resolve cada nome para um `source_id` existente em `contact_sources` (fallback configurável quando não encontrado);
- grava todas em `contact_source_assignments` via `assignToContact()`, além de manter a primeira como `source_id` primário em `contacts`.

Migration `20260609120000_contact_source_assignments.sql` migrou automaticamente os 8.485 `source_id` existentes para a nova tabela (`INSERT ... ON CONFLICT DO NOTHING`), garantindo que `listForContact()` já retorne a origem primária histórica sem reprocessamento manual.

## Consequências

**Positivas:**
- Origem continua sendo um conceito controlado (lista finita, gerenciável), não tag livre — evita "lixo" de valores inconsistentes.
- Histórico preservado: nenhuma migração de dados manual além do `INSERT` automático na própria migration.
- `source_id` em `contacts` continua funcionando para todo código existente (filtros, formulário manual, relatórios) sem quebra.

**Negativas:**
- Duas fontes de verdade para "origem primária" (`contacts.source_id` e a entrada correspondente em `contact_source_assignments`) — podem divergir se um dos dois caminhos for atualizado sem o outro. Mitigação: `ImportContactsUseCase` sempre escreve nos dois; futuras telas de edição de origem devem fazer o mesmo (ou migrar para ler `source_id` apenas de `contact_source_assignments` com uma flag `is_primary`, se a divergência se tornar um problema real).
- Telas de listagem/filtro que hoje só conhecem `source_id` não exibem as origens secundárias — fora de escopo desta sessão (não havia UI de exibição/filtro multi-origem solicitada).

## Gatilho de revisão
Se surgir necessidade de filtrar/exibir contatos por **qualquer** uma das origens (não só a primária), ou de marcar uma origem secundária como primária, revisar se `contacts.source_id` deveria ser derivado de `contact_source_assignments` (campo `is_primary`) em vez de duplicado.

## Arquivos relacionados
- `supabase/migrations/20260609120000_contact_source_assignments.sql`
- `src/repositories/contact-source.repository.ts` (`assignToContact`, `listForContact`)
- `src/usecases/ContactUseCases.ts` (`ImportContactsUseCase.resolveSourceIds`)
- `src/types/index.ts` (`ContactImportResult`)
