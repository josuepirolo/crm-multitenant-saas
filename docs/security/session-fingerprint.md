# Session ID e Fingerprint — Auditoria

## Finalidade

Correlacionar eventos de auditoria de uma mesma sessão ou dispositivo, sem expor dados sensíveis.

Ambos são **somente para rastreamento**. Nenhum deles autentica o usuário.

---

## session_id

- UUID v4 gerado no `signIn` bem-sucedido
- Armazenado em cookie `audit-sid` (dev) / `__Host-audit-sid` (prod)
  - `HttpOnly`, `Secure` em prod, `SameSite=Lax`, `Path=/`
- Limpo no `signOut`
- Não contém user_id, email, IP ou qualquer dado identificável
- Permite correlacionar toda a sequência de ações de uma sessão mesmo com IP dinâmico

## fingerprint

- SHA-256 de: `IP anonimizado (/24) + user_agent + AUDIT_FINGERPRINT_SALT`
- Truncado para 24 chars — não reversível
- Salt obrigatório via env: `AUDIT_FINGERPRINT_SALT`
  - Gerar com: `openssl rand -hex 32`
- Fallback de dev: `dev-fallback-salt` (não usar em produção)
- Permite correlação secundária quando cookie não existe (ex: IP fixo + mesmo browser)

---

## Diferenças

| | session_id | fingerprint |
|---|---|---|
| Origem | `randomUUID()` | `hash(IP + UA + salt)` |
| Muda após logout | ✓ | Não (depende de IP/UA) |
| Funciona com IP dinâmico | ✓ | ✗ |
| Distingue usuários no mesmo IP | ✓ | ✗ |
| Disponível sem cookie | ✗ | ✓ |

---

## Env obrigatória em produção

```env
AUDIT_FINGERPRINT_SALT=<valor-gerado-com-openssl-rand-hex-32>
```

## Proibições

- Não usar `session_id` ou `fingerprint` como substituto de autenticação
- Não logar o valor do salt
- Não usar o IP completo dentro do fingerprint
- Não compartilhar `session_id` entre usuários
