# /security-review

Gate de segurança antes de commit em áreas sensíveis.

1. Ler `specs_default/security/security-checklist.md`
2. Ativar mentalmente `skills/claude/security-review-gate/SKILL.md`
3. Revisar `git diff` — sem .env, secrets, service_role no client
4. Se auth/RLS/actions: confirmar test:security

Reportar: OK ou lista de violações com arquivo e severidade.
