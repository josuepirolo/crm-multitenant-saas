# Importação em massa de contatos — Harness

Módulo: contacts (sub-feature: bulk-import)
Data: 2026-06-08
Status: IMPLEMENTADO — testes automatizados 365/365 OK, tsc limpo

---

## 1. Cenários obrigatórios

| ID | Cenário | Tipo | Cobertura |
|---|---|---|---|
| BI-01 | Upload de CSV válido cria contatos em lotes de 50 | Happy path | Teste automatizado |
| BI-02 | Upload de XLSX válido cria contatos | Happy path | Teste automatizado |
| BI-03 | Linha com telefone duplicado é ignorada (dedup) | Alternativo | Teste automatizado |
| BI-04 | Linha com dados inválidos é reportada no resultado | Alternativo | Teste automatizado |
| BI-05 | Arquivo acima de 5MB é rejeitado no cliente | Segurança | Manual |
| BI-06 | Arquivo com magic bytes inválidos é rejeitado | Segurança | Server Action |
| BI-07 | Rate limit 5/h por workspace bloqueia excesso | Segurança | Teste automatizado |
| BI-08 | Audit log `CONTACTS_BULK_IMPORTED` criado ao final | Auditoria | Teste automatizado |
| BI-09 | workspace_id sempre do contexto autenticado (nunca do client) | Segurança | Teste automatizado |
| BI-10 | Usuário sem `contacts:create` é bloqueado | Segurança | Teste automatizado |
| BI-11 | Arquivo com mais de 2000 linhas reporta erro | Alternativo | Teste automatizado |
| BI-12 | Relatório final exibe: criados, ignorados, erros por linha | Happy path | Manual |
| BI-13 | Template CSV disponível para download no modal | Happy path | Manual |
| BI-14 | Cabeçalhos em PT e EN são mapeados corretamente | Happy path | Teste automatizado |
| BI-15 | Isolamento multi-tenant: contatos criados apenas no workspace autenticado | Segurança | Teste automatizado |

---

## 2. Arquivos de teste

- `src/tests/tenant-isolation/contact.usecases.test.ts` — cobre BI-01 a BI-04, BI-07 a BI-11, BI-14, BI-15
- Testes manuais pendentes: BI-05, BI-12, BI-13 (UI — upload real, dark mode, responsivo)

---

## 3. Resultado da última execução

- Data: 2026-06-08
- Resultado: 365/365 testes passando
- TypeScript: `tsc --noEmit` sem erros
- Teste manual em navegador: PENDENTE
