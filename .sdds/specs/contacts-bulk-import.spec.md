# Importação em massa de contatos (XLSX/CSV) — Spec

Módulo: contacts (sub-feature: bulk-import)
Versão: 1.0
Data: 2026-06-08
Status: SPEC

---

## 1. Objetivo

Permitir que um usuário com permissão `contacts:create` importe múltiplos contatos de uma vez a partir de uma planilha (`.xlsx`, `.xls` ou `.csv`), reaproveitando integralmente as regras de validação e deduplicação já existentes para criação individual de contato.

---

## 2. Escopo (v1)

- Upload de arquivo `.xlsx`/`.xls`/`.csv` (máx. 5MB, máx. 2.000 linhas)
- Mapeamento automático de colunas comuns (nome, telefone, email, documento, empresa, status, observações) com tolerância a variações de cabeçalho
- Fluxo de **2 estágios**: upload (seleção do arquivo + clique em "Importar" = confirmação) → resultado (relatório completo). Ver nota sobre simplificação abaixo.
- Processamento em lotes (chunks de ~50) dentro da própria Server Action — sem infraestrutura de fila nova
- Relatório final: total processado, criados, ignorados (duplicados), erros por linha
- Reaproveita `contactSchema`, `toDigits`, `validateCPF`, `validateCNPJ` de `src/lib/validations/contact.ts`
- Reaproveita `SupabaseContactRepository.create` e a checagem de unicidade já existente (`uniqueViolationMessage`)
- Auditoria da operação via `createAuditLog` (`CONTACTS_BULK_IMPORTED`)
- Template de planilha de exemplo disponível para download no modal

---

## 3. Fora de escopo (v1)

- Processamento em background job / fila (`jobs` + Edge Function + Realtime) — adiar para v2 se o volume justificar (ver decisão [[ADR-002]])
- Edição inline de linhas inválidas antes de importar — usuário corrige a planilha e reenviar
- Importação de campos customizados por nicho (`contact-niche-fields`) — v2
- Mapeamento manual de colunas pelo usuário (drag-and-drop) — v1 usa mapeamento automático por nome de cabeçalho

---

## 4. Comportamento atual observado

- CRUD individual de contato existe completo: `src/app/(dashboard)/contacts/actions.ts`, `SupabaseContactRepository`, `ContactUseCases`, `useContactsViewModel`, `contact-modal.tsx`
- `contactSchema` (Zod) e validadores de CPF/CNPJ/telefone já centralizados em `src/lib/validations/contact.ts`
- Índices únicos no banco (`idx_contacts_unique_phone/email/document`) já fazem deduplicação — `uniqueViolationMessage` já mapeia a violação para mensagem amigável
- Não existe nenhuma infraestrutura de upload de planilha, parsing de XLSX/CSV ou job em background no projeto
- Padrão de upload de arquivo com validação de magic bytes existe em `src/app/(dashboard)/settings/upload-actions.ts` (`validateImageFile`, `validateMagicBytes`) — referência de segurança a seguir

---

## 5. Comportamento desejado

1. Usuário clica em "Importar planilha" ao lado de "Novo contato" em `/contacts`
2. Modal abre em 2 estágios: **upload** → **resultado**
3. Estágio upload: usuário seleciona arquivo (ou arrasta), pode baixar template de exemplo, e clica em "Importar" — esse clique já é a confirmação (escolher o arquivo certo é responsabilidade do usuário, como em qualquer importador)
4. Sistema valida arquivo (tamanho, MIME, magic bytes), faz parsing e processa em lotes — tudo num único round-trip (`toast.promise` cobre o tempo de espera)
5. Estágio resultado: exibe contadores (total/criados/ignorados/erros) e lista de erros por linha (se houver), com toast de conclusão
6. Lista de contatos é revalidada (`revalidatePath("/contacts")`)

> **Nota de simplificação**: a v1 do plano previa um estágio de "preview" (contagem de válidas/inválidas antes de confirmar). Optamos por **não** implementá-lo porque exigiria reparsear o arquivo duas vezes ou persistir as linhas no servidor entre dois round-trips — complexidade desnecessária para o volume esperado. O clique em "Importar" já funciona como confirmação; o relatório final cumpre o papel de dar visibilidade ao resultado.

---

## 6. Regras de negócio

### Arquivo
- Tipos aceitos: `.xlsx`, `.xls`, `.csv`
- Tamanho máximo: 5MB
- Limite de linhas: 2.000 (acima disso, erro genérico pedindo para dividir a planilha)
- Magic bytes validados (assinatura ZIP `PK\x03\x04` para XLSX; verificação de texto para CSV)

### Mapeamento de colunas
- Cabeçalhos reconhecidos por alias (case-insensitive): nome/name → `name`; telefone/phone/celular → `phone`; email/e-mail → `email`; documento/cpf/cnpj/document → `document`; empresa/company → `company`; status → `status`; observações/notes/obs → `notes`
- Coluna `name` é obrigatória; demais são opcionais (mesmas regras do `contactSchema`)

### Validação por linha
- Cada linha passa por `contactSchema.safeParse` após normalização (`toDigits`, lowercase de email, etc. — mesma `normalizeInput` do `createContact`)
- Linha inválida: registrada no relatório com motivo, **não interrompe o lote**
- Linha duplicada (violação de índice único): registrada como "ignorado — já existe", não é erro fatal

### Processamento
- Lotes de ~50 linhas, `Promise.allSettled` por lote
- `workspace_id` e `created_by` sempre do contexto autenticado (`getWorkspaceContext`) — nunca da planilha
- Permissão exigida: `contacts:create` (mesma do cadastro individual)

### Auditoria
- Ao final, registra `CONTACTS_BULK_IMPORTED` com `metadata: { total, created, skipped, failed }` — nunca dados pessoais das linhas

---

## 7. Regras técnicas

### Arquitetura
- Clean Architecture + MVVM — mesmo padrão do módulo `contacts`
- `ImportContactsUseCase` — orquestra validação + chamadas ao repositório existente, sem novo método de repositório
- `useContactImportViewModel` — estado dos 3 estágios (upload/preview/resultado), chama a Server Action
- Server Action nova em `src/app/(dashboard)/contacts/import-actions.ts` (arquivo separado de `actions.ts` por coesão — upload + parsing + relatório tem responsabilidade distinta de CRUD simples)

### Dependência nova
- `exceljs@4.4.0` — parsing de planilha no servidor (substituiu `xlsx`/SheetJS por ter vulnerabilidades HIGH sem correção via npm — ver decisão [[ADR-002]]). `uuid` transitivo fixado em `^11.1.1` via `overrides` no `package.json`.

### Supabase
- Nenhuma migration nova prevista — reaproveita tabela `contacts` e índices únicos existentes
- Sem alteração de RLS — mesma policy de INSERT já vigente

### Performance
- Processamento síncrono em lotes (não background job) — ver decisão [[ADR-002]] sobre o porquê
- `toast.promise()` durante o processamento
- Skeleton no estágio de preview enquanto parseia

---

## 8. Entradas

### `importContactsAction(formData)`
```typescript
// formData: { file: File }
// retorno:
{
  error?: string;
  result?: {
    total: number;
    created: number;
    skipped: number;
    errors: { row: number; message: string }[];
  }
}
```

---

## 9. Componentes novos

- `ImportContactsDialog` — modal com 2 estágios (upload/resultado)
- `ImportResultSummary` — cards de contadores + tabela de erros por linha

---

## 10. Critérios de aceite

- [ ] Usuário sem permissão `contacts:create` não consegue importar (testado)
- [ ] `workspace_id` nunca vem da planilha — sempre do contexto (testado)
- [ ] Arquivo acima do limite de tamanho/linhas é rejeitado com mensagem clara
- [ ] MIME inválido / magic bytes inválidos são rejeitados
- [ ] Linha inválida não derruba o lote — aparece no relatório
- [ ] Linha duplicada é reportada como "ignorado", não como erro fatal
- [ ] Auditoria registra a operação sem dados pessoais em `metadata`
- [ ] Relatório final é exibido com contadores corretos
- [ ] UI: skeleton, toasts, dark mode, responsivo (375px–1280px+)
