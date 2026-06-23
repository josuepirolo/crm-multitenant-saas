# Supabase — política de migrations

## Regra absoluta

> **Zero DDL ad-hoc em produção.** Toda alteração via `supabase/migrations/`.

## Fluxo

1. Criar migration local: `supabase migration new descricao`
2. Testar em branch/dev project
3. Review RLS incluída na mesma migration
4. Apply via pipeline ou `supabase db push` controlado
5. Registrar no changelog do projeto

## Naming

`YYYYMMDDHHMMSS_descricao_snake.sql`

## Conteúdo migration

- CREATE TABLE + indexes
- RLS ENABLE + policies
- Funções helper (`SECURITY DEFINER` se necessário)
- Seed só se idempotente (`ON CONFLICT`)

## Proibido

- SQL Editor direto em prod "só dessa vez"
- Desabilitar RLS "temporariamente"
- Policy `USING (true)` em tabela multi-tenant

## Drift detection (recomendado)

- CI: `supabase db diff` vs remoto
- Event trigger audit log em prod (opcional enterprise)

## Rollback

- Preferir migration forward-fix
- Backup antes de DDL destrutivo
