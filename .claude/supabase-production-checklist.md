# Supabase — Checklist de Produção

Tudo que precisa ser configurado no Supabase antes de lançar o produto.

---

## 1. Autenticação — Auth Settings

**Dashboard → Authentication → Providers → Email**

| Configuração | Desenvolvimento | Produção |
|---|---|---|
| Confirm email | ❌ desativado | ✅ ativado |
| Secure email change | — | ✅ ativado |
| Double confirm changes | — | ✅ ativado |

---

## 2. SMTP próprio (e-mails da sua marca)

Por padrão os e-mails saem de `noreply@mail.app.supabase.io`. Em produção isso é inaceitável.

**Dashboard → Project Settings → Authentication → SMTP Settings**

Provedores recomendados (custo-benefício):
- **Resend** — mais simples, ótima DX, gratuito até 3k e-mails/mês
- **SendGrid** — mais robusto, gratuito até 100/dia
- **AWS SES** — mais barato em escala ($0,10 por 1.000 e-mails)

Campos a preencher:
```
Host:        smtp.resend.com          (ou o do seu provedor)
Port:        465
User:        resend                   (ou o do seu provedor)
Password:    re_xxxxxxxxxxxxxxxxxxxx  (API key do provedor)
Sender name: CRM Vendas
Sender email: noreply@suaempresa.com
```

---

## 3. Templates de e-mail

**Dashboard → Authentication → Email Templates**

Personalizar todos os templates com a marca do produto:
- **Confirm signup** — e-mail de confirmação de conta
- **Invite user** — convite para novo membro do workspace
- **Magic Link** — se usar login sem senha
- **Change Email Address** — confirmação de troca de e-mail
- **Reset Password** — recuperação de senha

Usar HTML com a identidade visual (logo, cores, tipografia).

---

## 4. URL de redirecionamento (Site URL)

**Dashboard → Authentication → URL Configuration**

```
Site URL:              https://suaempresa.com
Redirect URLs:         https://suaempresa.com/**
                       http://localhost:3000/**   (só em dev)
```

Sem isso, links de confirmação e reset de senha redirecionam para URL errada.

---

## 5. Segurança — Row Level Security

**Dashboard → Database → Tables**

Verificar que **todas as tabelas** têm RLS ativado. Nenhuma tabela deve ficar com RLS desativado em produção.

Tabelas do projeto:
- [x] workspaces
- [x] profiles
- [x] workspace_members
- [x] contacts
- [x] tags
- [x] contact_tags
- [x] pipelines
- [x] stages
- [x] deals
- [x] conversations
- [x] messages

---

## 6. Secrets e variáveis de ambiente

**Dashboard → Project Settings → API**

Nunca expor no cliente:
- `service_role` key — apenas em variáveis de servidor (`SUPABASE_SERVICE_ROLE_KEY`)
- `JWT secret` — nunca exposto

Exposto no cliente (seguro por design + RLS):
- `anon` key — `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `Project URL` — `NEXT_PUBLIC_SUPABASE_URL`

---

## 7. Backups

**Dashboard → Project Settings → Database → Backups**

- Plano Free: sem backup automático
- Plano Pro+: backup diário automático (recomendado em produção)
- Configurar Point-in-Time Recovery (PITR) para dados críticos

---

## 8. Domínio customizado (opcional)

**Dashboard → Project Settings → Custom Domains**

Troca `gkzqhlaltnlcpzcapayb.supabase.co` por `api.suaempresa.com`.
Requer plano Pro.

---

## 9. Senhas — política de segurança

**Dashboard → Authentication → Providers → Email → Password Settings**

```
Minimum password length:  8 (recomendado: 10+)
Require uppercase:        ✅
Require numbers:          ✅
Require special chars:    ✅ (opcional, mas recomendado)
```

---

## 10. Rate limiting

Supabase já aplica rate limiting padrão nas rotas de Auth. Em produção:
- Monitorar `Dashboard → Reports → Auth` para detectar abuso
- Considerar adicionar rate limiting próprio nas Server Actions sensíveis (login, registro, reset)

---

## Resumo — ordem de prioridade antes do lançamento

1. [ ] SMTP próprio configurado
2. [ ] Templates de e-mail personalizados
3. [ ] Site URL e Redirect URLs configurados
4. [ ] "Confirm email" reativado
5. [ ] RLS ativo em todas as tabelas (já feito via migrations)
6. [ ] Backup automático ativado (upgrade para Pro)
7. [ ] Domínio customizado (opcional)
