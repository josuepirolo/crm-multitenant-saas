# Discovery — cache Turbopack corrompido causa 404 site-wide no dev

Data: 2026-06-15
Relacionado: ADR-008 fase 1 (`/whatsapp/*`), sessão `2026-06-15-1344-session.md`

## Sintoma

`npm run dev` (Next.js 16.2.4 Turbopack): `GET /dashboard` e `GET /` retornam **404**,
embora `src/app/(dashboard)/dashboard/page.tsx` exista.

Log típico:
```
GET /dashboard 404 in 261ms (next.js: 14ms, proxy.ts: 181ms, application-code: 66ms)
```

## Causa raiz

Arquivo gerado `.next/dev/types/routes.d.ts` **corrompido** após hot-reload ao adicionar
rotas `/whatsapp/*` — entrada truncada:

```ts
pp/conexao": {}   // deveria ser "/whatsapp/conexao": {}
```

`next build` falha em typecheck com `';' expected` nessa linha. O manifest inválido impede
o roteamento correto no dev.

## Correção

1. Parar `next dev`.
2. Apagar cache: `Remove-Item -Recurse -Force .next` (PowerShell) ou `rm -rf .next`.
3. Reiniciar `npm run dev` (ou `next build` para validar).

## Correção de código (preventiva)

Removido `"use server"` de `src/lib/whatsapp/workspace-has-integration.ts` — helper usado
apenas no `(dashboard)/layout.tsx` (RSC), não é Server Action para o client.

## Lição

Após adicionar/remover rotas no App Router com Turbopack, se surgir 404 inexplicável em
rotas que existem no código, **limpar `.next` antes de investigar lógica de app**.
