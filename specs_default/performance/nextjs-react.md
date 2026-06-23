# Performance — Next.js / React

Resumo operacional (detalhes: Vercel React Best Practices).

## Crítico

1. **Eliminar waterfalls** — `Promise.all` para ops independentes; compor RSC em paralelo
2. **Server Actions autenticadas** — não bloquear layout inteiro por um fetch
3. **Bundle** — dynamic import para componentes pesados; evitar barrel imports grandes
4. **RSC boundary** — serializar só campos usados no client

## Server

- Auth + config independentes → iniciar em paralelo
- `React.cache()` para dedup por request (não cross-request)
- Static I/O (fonts, templates) no module level

## Client

- SWR/React Query se muitos fetches client (decidir ADR)
- `useTransition` para filtros pesados
- Passive listeners em scroll

## Imagens

- `next/image` com sizes corretos
- Lazy below the fold

## Medir

- Lighthouse CI em staging
- Core Web Vitals no deploy preview
