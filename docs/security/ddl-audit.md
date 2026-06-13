# Auditoria de DDL em Produção — `ddl_audit_log` + Event Triggers

> Implementado: 2026-06-12 · Migration: `supabase/migrations/20260612090000_ddl_audit_log_event_triggers.sql` · Risco: R-007 (camada 1)

## Sumário

Todo comando DDL executado no banco de produção (`CREATE`, `ALTER`, `DROP`, `COMMENT`, `GRANT` etc.) é registrado automaticamente na tabela `ddl_audit_log`, com **quem** (role), **quando** (timestamp), **o quê** (comando, tipo e identidade do objeto) e **o SQL original**. Vale para qualquer origem: SQL Editor do Supabase, migrations, ferramentas externas, MCP.

## Por que existe

Em **2026-06-08**, a tabela `business_niches` foi dropada da produção via SQL ad-hoc, fora do framework de migrations, **sem deixar nenhum rastro**. O código dependia dela no login (`getActiveWorkspaceContext`), e o resultado foi um outage site-wide: todo usuário autenticado caía em `/no-workspace` por erro `PGRST200`. A causa raiz levou horas para ser identificada justamente pela ausência de qualquer registro de quem/quando executou o `DROP`.

Detalhes do incidente: `.sdds/discoveries/2026-06-08-business-niches-outage.md`.

Com esta camada, o mesmo `DROP TABLE` deixaria rastro imediato e a investigação começaria pela resposta, não pela pergunta.

## Como funciona

| Componente | Papel |
|---|---|
| `ddl_audit_log` (tabela) | Armazena os registros — append-only |
| `ddl_audit_command_end` (event trigger `ON ddl_command_end`) | Captura `CREATE`/`ALTER`/`COMMENT`/`GRANT`... via `pg_event_trigger_ddl_commands()` |
| `ddl_audit_sql_drop` (event trigger `ON sql_drop`) | Captura todo `DROP` via `pg_event_trigger_dropped_objects()` — o caso do incidente |
| `log_ddl_command()` / `log_ddl_drop()` (funções) | `SECURITY DEFINER`, exception-safe — auditoria **nunca** bloqueia um DDL legítimo |

Colunas principais: `executed_at`, `role_name`, `session_role`, `event`, `command_tag`, `object_type`, `schema_name`, `object_identity`, `query` (truncado em 10k chars). Objetos temporários (`pg_temp%`) são ignorados.

## Modelo de segurança

- **Append-only**: nenhuma policy de `INSERT`/`UPDATE`/`DELETE` para clients + `REVOKE` explícito de escrita para `anon`/`authenticated`. Escrita acontece só pelas funções dos triggers.
- **Leitura só superadmin**: policy `SELECT` exige `profiles.is_superadmin = true` (mesmo padrão de `audit_logs` — sem bypass de `service_role` para leitura via API).
- RLS ativo na tabela.

## Como consultar (superadmin)

```sql
-- DDLs mais recentes
SELECT executed_at, role_name, command_tag, object_identity
FROM ddl_audit_log
ORDER BY executed_at DESC
LIMIT 50;

-- Apenas DROPs (investigação de incidente)
SELECT executed_at, role_name, object_type, object_identity, query
FROM ddl_audit_log
WHERE event = 'sql_drop'
ORDER BY executed_at DESC;
```

## Verificação pós-deploy (feita em 2026-06-12)

1. `pg_event_trigger` mostra os dois triggers com `evtenabled = 'O'`.
2. Autoverificação embutida: o `COMMENT ON TABLE` no final da própria migration roda **depois** dos triggers serem criados — e foi registrado como `id = 1` da tabela, confirmando o pipeline inteiro funcionando.

## Limitações e próxima camada

- **Detecção é passiva**: o rastro existe, mas ninguém é alertado em tempo real. A camada 2 planejada (R-007) é um drift check periódico — `supabase db diff --linked` em CI agendado comparando produção vs `supabase/migrations/`, falhando o job quando houver divergência.
- `query` pode conter o SQL completo do comando; DDLs nunca devem embutir secrets (já é regra do projeto — secrets via env/Vault, ver R-003).
- Event triggers não capturam comandos de roles reservados internos do Supabase em nível de superusuário real, mas cobrem `postgres`, SQL Editor e todos os fluxos usados neste projeto.

## Regras relacionadas

- **Schema só muda por migration versionada** — `.claude/skills/migration-drift-guard/SKILL.md`
- Riscos: R-007 (este documento, camada 1 — MITIGADO), R-002/R-003 (webhooks HMAC + Vault, pendentes da integração WA)
