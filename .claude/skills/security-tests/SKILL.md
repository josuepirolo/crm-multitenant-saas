# PROMPT PARA CLAUDE CODE — GERAR TESTES DE SEGURANÇA DO SAAS

Você é um engenheiro sênior especialista em segurança, Next.js, Supabase, RLS, SaaS multi-tenant, testes automatizados e arquitetura limpa.

Antes de alterar qualquer arquivo, leia obrigatoriamente:

- `.claude\rules\security-checklist.md`
- documentação de arquitetura existente do projeto
- regras do projeto, se existirem: `CLAUDE.md`, `.cursorrules`, `PROJECT_INDEX.md` ou equivalentes

## Objetivo

Criar uma suíte de testes automatizados para validar que o SaaS está seguro, multi-tenant e seguindo o checklist de segurança.

O projeto usa:

- Next.js
- Supabase
- RLS
- API Routes / Server Actions
- Integrações externas, especialmente Z-API
- Autenticação por sessão
- Cloudflare Challenge nas telas sensíveis

## Regras obrigatórias

1. Não criar testes genéricos inúteis.
2. Antes de testar, mapear a estrutura real do projeto.
3. Identificar:
   - rotas públicas
   - rotas protegidas
   - API Routes
   - Server Actions
   - clients Supabase
   - uso de anon key
   - qualquer uso de service_role
   - tabelas sensíveis
   - policies RLS
   - integrações externas
   - variáveis de ambiente sensíveis
4. Criar testes compatíveis com a stack já instalada.
5. Se não houver framework de testes, sugerir e instalar o mínimo necessário.
6. Não quebrar arquitetura existente.
7. Não mover arquivos sem necessidade.
8. Não expor secrets em teste, log ou snapshot.
9. Não mockar segurança crítica de forma que invalide o teste.
10. Todo teste deve falhar se houver risco real de vazamento multi-tenant.

## Testes obrigatórios

### 1. Segurança de ambiente

Criar testes ou scripts que validem:

- Nenhuma variável sensível começa com `NEXT_PUBLIC_`
- `service_role` não aparece em código client-side
- `service_role` não é usado em rotas de usuário
- Tokens da Z-API não são retornados em responses
- Nenhum segredo aparece em logs, fixtures ou snapshots

### 2. Supabase e RLS

Validar:

- Tabelas sensíveis possuem RLS ativa
- Policies existem para SELECT, INSERT, UPDATE e DELETE quando aplicável
- Usuário de uma empresa não acessa dados de outra empresa
- Usuário não consegue forçar `empresa_id`, `tenant_id` ou `workspace_id`
- Super Admin é tratado por role/policy, não por bypass técnico com service_role

### 3. Autenticação

Validar:

- Rotas protegidas rejeitam usuário não autenticado
- Sessão inválida é rejeitada
- Logout invalida acesso posterior
- Reset de senha não vaza informação sensível

### 4. Autorização e permissões

Criar cenários para:

- Super Admin acessa empresas permitidas pela policy
- Admin da empresa acessa apenas sua empresa
- Gerente acessa apenas escopo permitido
- Supervisor acessa apenas equipe permitida
- Vendedor/atendente acessa apenas contatos/conversas permitidos

Se ainda não existirem todas as roles no projeto, criar testes apenas para as roles existentes e documentar lacunas.

### 5. API Routes / Server Actions

Validar:

- Toda action sensível exige usuário autenticado
- Toda action sensível valida tenant/workspace no server
- Nenhuma action confia em `empresa_id`, `tenant_id` ou `workspace_id` vindo do client sem checagem
- Mutations bloqueiam acesso cruzado entre empresas
- Erros não retornam stack trace nem dados internos

### 6. Integrações externas / Z-API

Validar:

- Frontend não chama Z-API diretamente
- Chamadas para Z-API acontecem apenas server-side
- Tokens da Z-API ficam armazenados apenas no backend/banco seguro
- Endpoints de envio validam permissão do usuário antes de enviar mensagem
- Webhooks possuem token secreto, assinatura ou mecanismo equivalente de validação
- Webhook rejeita payload inválido
- Webhook não aceita integração inexistente ou inativa

### 7. Rate limit e abuso

Validar, quando implementado:

- Login possui rate limit
- Registro possui rate limit
- Reset de senha possui rate limit
- Envio de mensagens possui rate limit
- Webhook possui proteção mínima contra flood/replay

Se não existir implementação, criar teste pendente ou relatório apontando risco.

### 8. Frontend

Validar:

- Telas sensíveis possuem Cloudflare Challenge ou componente equivalente:
  - login
  - registro
  - alteração/reset de senha
- Nenhum token sensível aparece no bundle client
- Componentes client não importam clients administrativos do Supabase
- Componentes client não importam módulos server-only

### 9. Auditoria

Validar, quando aplicável:

- Login gera log/auditoria
- Envio de mensagem gera log/auditoria
- Alterações críticas geram log/auditoria
- Logs contêm usuário, empresa, ação e data/hora
- Logs não armazenam secrets

## Entregáveis

Ao final, entregar:

1. Arquivos de teste criados ou alterados
2. Comandos para rodar os testes
3. Relatório curto com:
   - testes implementados
   - riscos encontrados
   - lacunas não testadas
   - recomendações
4. Nenhuma alteração funcional desnecessária

## Critério de aceite

A suíte deve permitir que, a cada alteração futura, seja possível rodar um comando e validar:

- isolamento multi-tenant
- ausência de vazamento de secrets
- uso correto de anon key + sessão
- ausência de service_role em fluxo de usuário
- proteção das integrações externas
- proteção básica contra abuso