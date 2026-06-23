# Headers de segurança e CSP

## next.config.ts — baseline

```ts
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // apertar em prod se possível
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https:",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  productionBrowserSourceMaps: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

## Ajustar CSP por projeto

Adicionar em `connect-src` / `script-src`:

- CDN analytics (se usar)
- Captcha (Turnstile, reCAPTCHA)
- API BFF externa

**Nunca** `default-src *`.

## Source maps

```ts
productionBrowserSourceMaps: false  // obrigatório em prod
```

## CORS (API Routes)

```ts
// ❌
Access-Control-Allow-Origin: *

// ✅ origem explícita + credentials só se necessário
```

## Checklist deploy

- [ ] HSTS ativo (HTTPS)
- [ ] CSP não quebra Supabase realtime (wss://)
- [ ] frame-ancestors none (anti-clickjacking)
