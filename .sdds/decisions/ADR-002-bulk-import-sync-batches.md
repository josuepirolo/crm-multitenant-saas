# ADR-002 — Importação em massa de contatos: lotes síncronos + exceljs (não fila, não xlsx)

## Data
2026-06-08

## Status
ACEITO

## Contexto
A skill `performance` recomenda processamento em background para operações que tocam mais de ~50 registros, geram arquivo ou chamam API externa — o que é o caso típico de uma importação de planilha de contatos.

Porém, o projeto **não possui nenhuma infraestrutura de fila/job em background** hoje (sem tabela `jobs`, sem Edge Function de processamento, sem consumo de Supabase Realtime para notificar conclusão). Construir essa infraestrutura do zero só para esta feature seria over-engineering para o volume real esperado (importações pontuais de até ~2.000 contatos por workspace).

## Decisão 1 — processamento em lotes síncronos
v1 processa a importação **dentro da própria Server Action**, em lotes (chunks de ~50 linhas) com `Promise.allSettled`, retornando um relatório agregado (criados/ignorados/erros por linha) ao final. Limite de 2.000 linhas por arquivo evita que a operação extrapole o tempo aceitável de uma Server Action.

Não criar tabela `jobs`, Edge Function ou subscription Realtime nesta v1.

## Decisão 2 — biblioteca de parsing: `exceljs`, não `xlsx`
A escolha óbvia para parsing de planilha em Node seria `xlsx` (SheetJS), mas a versão publicada no npm (`0.18.5`, única disponível no registry — versões corrigidas só são publicadas no CDN próprio da SheetJS) tem **duas vulnerabilidades HIGH sem correção disponível via npm**:
- `GHSA-4r6h-8v6p-xvw6` — Prototype Pollution (CVSS 7.8)
- `GHSA-5pgg-2g8v-p4x9` — ReDoS (CVSS 7.5), **diretamente explorável por conteúdo malicioso de arquivo** — exatamente o vetor de ataque desta feature (parsing de upload do usuário)

Optamos por **`exceljs@4.4.0`** (mantida ativamente, sem vulnerabilidades diretas). Ela traz uma dependência transitiva `uuid@8.3.2` com vulnerabilidade moderada (`GHSA-w5hq-g745-h8pq`, falta de checagem de bounds em `v3/v5/v6` quando um `buf` é fornecido). Inspecionamos o uso real em `exceljs` (`node_modules/exceljs/lib/xlsx/xform/sheet/cf-ext/cf-rule-ext-xform.js`): só chama `uuidv4()`, caminho não afetado pela falha. Mesmo assim, fixamos a versão via `overrides` no `package.json`:
```json
"overrides": { "exceljs": { "uuid": "^11.1.1" } }
```
o que elimina a vulnerabilidade por completo sem downgrade de `exceljs`. Validado com `npm ls uuid` (resolve para `11.1.1 overridden`) e smoke-test (`new ExcelJS.Workbook()` + leitura/escrita de linhas).

## Consequências

**Positivas:**
- Sem infraestrutura nova para manter — menos superfície de bug e de segurança
- Relatório imediato ao usuário (sem necessidade de polling/realtime)
- Reaproveita 100% do `SupabaseContactRepository.create` e da deduplicação via índice único já existentes

**Negativas:**
- Para arquivos grandes (próximos do limite de 2.000 linhas), a Server Action pode levar dezenas de segundos — mitigado por `toast.promise()` + feedback de progresso
- Se o volume real crescer muito além do esperado, será necessário migrar para o padrão de background job documentado na skill `performance` (`jobs` + Edge Function + Realtime)

## Gatilho de revisão
Se usuários começarem a importar arquivos consistentemente próximos do limite de 2.000 linhas, ou se o tempo de resposta da Server Action ultrapassar ~10s com frequência, revisar esta decisão e migrar para processamento em background.

## Arquivos relacionados
- `.sdds/specs/contacts-bulk-import.spec.md`
- `src/app/(dashboard)/contacts/import-actions.ts` (a criar)
- `.claude/skills/performance/SKILL.md` — padrão de background job documentado para v2
