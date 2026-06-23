# Discovery — RLS ausente em 4 tabelas wa_* + `get_my_tenant_id()` sem disambiguação de workspace ativo

## Data
2026-06-17

## Contexto
Durante revisão crítica de 3 documentos de spec trazidos pelo usuário para um possível MVP
"Central Inteligente de Atendimento WhatsApp" (`refatoração/2026-06-17/`), verifiquei ao vivo
(via Supabase MCP, projeto `gkzqhlaltnlcpzcapayb`) a premissa de que o frontend poderia ler
`wa_conversations`/`wa_messages`/`wa_insights` etc. diretamente via Supabase client, já que
R-006 (`CURRENT_STATE.md`) dizia "RLS ausente nas tabelas wa_* (gerenciada pelo WA backend)".

## Evidências
- `list_tables` + `get_advisors(security)`: a maioria das tabelas `wa_*` **tem RLS habilitada**
  — R-006 está desatualizado/impreciso. Mas **4 tabelas não têm RLS** (nível ERROR):
  `wa_media_public_links` (expõe coluna `token`), `wa_send_origins`, `wa_campaigns`,
  `wa_campaign_recipients`. As duas últimas são usadas pela feature de Campanhas **já em
  produção** (ADR-008 fase 4) — qualquer requisição com a anon key lê/escreve todos os tenants.
- `pg_policies` em `wa_contacts/conversations/insights/instances/media/messages/tenants`:
  `SELECT` para `authenticated` corretamente escopado por `tenant_id = get_my_tenant_id()`;
  toda escrita é `ALL` restrita a `service_role`. Ou seja, mutação (assumir conversa, mudar
  status, enviar mensagem) não pode ser feita via Supabase client direto — tem que continuar
  passando pelo BFF (`src/lib/wa-backend/client.ts`, ADR-006, server-only).
- `get_my_tenant_id()` (definição via `pg_get_functiondef`): já está com o fix recomendado em
  `backend_zapi/RECADO-rls-get-my-tenant-id.md` (2026-06-15) — junta `workspace_members` +
  `workspace_integrations`, não depende mais de `tenant_users`/`wa_tenant_users`. **Mas** usa
  `LIMIT 1` sem `ORDER BY` e sem considerar o workspace ativo da sessão — para um usuário membro
  de 2+ workspaces com integração WhatsApp, resolve um tenant arbitrário, não necessariamente o
  selecionado na UI.

## Conclusão
1. A premissa de leitura direta via Supabase client é viável (RLS de SELECT correta na maioria
   das tabelas `wa_*`), mas a premissa de **mutação direta via Supabase client** (sugerida no
   `FRONTEND_ARCHITECTURE_MVP_WHATSAPP.md`) é falsa — só `service_role` escreve.
2. 4 tabelas têm exposição real de dados cross-tenant hoje, incluindo a feature de Campanhas já
   em produção.
3. `get_my_tenant_id()` tem um bug de resolução de tenant para usuários multi-workspace,
   independente do MVP novo — qualquer leitura direta de `wa_*` hoje (se alguém já fizer) está
   sujeita a esse bug.

## Nível de confiança
CONFIRMADO (consultas diretas ao banco de produção, read-only).

## Impacto potencial
- Segurança: ALTO (4 tabelas sem RLS, dados de campanha/destinatários expostos).
- Correção funcional: ALTO para qualquer feature que dependa de `get_my_tenant_id()` com usuário
  multi-workspace (bloqueia com segurança o MVP de Central de Atenção enquanto não corrigido).

## Arquivos relacionados
- `backend_zapi/RECADO-rls-get-my-tenant-id.md` (fix anterior, já aplicado, mas não cobre este caso)
- `refatoração/2026-06-17/complemento_spec_mvp_whatsapp_banco_real.md`
- `refatoração/2026-06-17/FRONTEND_ARCHITECTURE_MVP_WHATSAPP.md`
- `src/lib/wa-backend/client.ts`

## Próximos passos
- Decidir com o usuário: aplicar `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` nas 4 tabelas
  (SQL pronto, não aplicado — ver resposta da sessão) — provavelmente seguro pois não há
  policy para `anon`/`authenticated`, então o efeito é só fechar o acesso indevido, mas decisão
  do usuário, não automática.
- Enviar recado ao time de backend (mesmo padrão dos outros `RECADO-*.md`) propondo
  `get_my_tenant_id(p_workspace_id uuid)` parametrizado pelo workspace ativo, em vez de `LIMIT 1`.
- Atualizar R-006 em `CURRENT_STATE.md` (feito nesta sessão).
