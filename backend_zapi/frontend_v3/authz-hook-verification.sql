-- ════════════════════════════════════════════════════════════════════
-- VERIFICAÇÃO DO CUSTOM ACCESS TOKEN HOOK — claim `authz` (v1)
-- ════════════════════════════════════════════════════════════════════
-- Projeto: Supabase do CRM (é lá que mora o Auth).
-- Quando: blocos 1-4 ANTES de habilitar o hook (pré-checagem);
--         bloco JS (rodapé) DEPOIS de habilitar (prova end-to-end).
-- Contrato do claim: docs/frontend/authz-architecture-and-crm-handoff.md §3
-- Go-live = Dashboard → Authentication → Hooks → Custom Access Token →
--           selecionar public.custom_access_token_hook.
-- Substitua <UUID_DE_UM_USUARIO_REAL> por um auth.users.id de cada papel.
-- ════════════════════════════════════════════════════════════════════


-- ── 1) A função existe e tem a configuração de segurança correta? ────
-- Esperado: 1 linha | security_definer = true | volatility = 's' (STABLE)
--           | args = 'event jsonb'
select
  n.nspname                                  as schema,
  p.proname                                  as funcao,
  pg_get_function_identity_arguments(p.oid)  as args,
  p.prosecdef                                as security_definer,
  p.provolatile                              as volatility   -- 's' = STABLE
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'custom_access_token_hook'
  and n.nspname = 'public';


-- ── 2) Os GRANTs estão corretos? ────────────────────────────────────
-- Esperado: supabase_auth_admin COM execute;
--           NÃO deve aparecer anon / authenticated / public
select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name   = 'custom_access_token_hook'
order by grantee;


-- ── 3) O catálogo de permissões foi semeado? ────────────────────────
-- Esperado: as 3 chaves integration.whatsapp.*
select key, description
from permissions
where key like 'integration.%'
order by key;


-- ── 4) DRY-RUN: a função produz o claim correto? (antes de habilitar)─
-- Simula a chamada que o Supabase Auth faz, sem precisar emitir token.
-- Troque o UUID e repita por papel (owner/admin/manager/sales/superadmin).
-- Esperado no resultado: objeto authz { v:1, superadmin, workspaces:{...perms} }
select
  public.custom_access_token_hook(
    jsonb_build_object(
      'user_id', '<UUID_DE_UM_USUARIO_REAL>',
      'claims',  jsonb_build_object(
                   'sub',  '<UUID_DE_UM_USUARIO_REAL>',
                   'role', 'authenticated'
                 )
    )
  ) #> '{claims,https://lekazis.app/authz}' as authz_claim;

-- Matriz esperada do bloco 4, por papel:
--   owner / admin     → workspaces.<id>.perms com as 3 chaves integration.whatsapp.*
--   manager           → só integration.whatsapp.connection:view
--   sales / support   → perms: []
--   superadmin        → "superadmin": true
--   uuid inexistente  → { "v":1, "superadmin":false, "workspaces":{} }
--
-- ⚠️ O dry-run roda com as permissões de quem está no SQL Editor. Como a função
--    é SECURITY DEFINER, executa com o dono mesmo assim; mas se aparecer erro de
--    leitura em tabela interna, é o contexto do Editor, não o hook. A prova
--    definitiva é o bloco JS abaixo, após habilitar o hook.


-- ════════════════════════════════════════════════════════════════════
-- PÓS-HABILITAÇÃO — prova end-to-end (rodar no browser do CRM, não em SQL)
-- ════════════════════════════════════════════════════════════════════
-- Após logout+login (ou refresh do token):
--
--   const { data: { session } } = await supabase.auth.getSession();
--   const payload = JSON.parse(atob(session.access_token.split('.')[1]));
--   console.log(payload['https://lekazis.app/authz']);
--   // deve imprimir { v:1, superadmin, workspaces:{...} }
--
-- Sessões já logadas só pegam o claim no PRÓXIMO refresh; até lá o backend WA
-- usa o fallback do gate local Fase 0 (sem downtime).
