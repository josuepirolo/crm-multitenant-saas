# 01 — Stack Tecnológica

## Linguagem e runtime
| Item | Versão |
|---|---|
| TypeScript | ^5 |
| Node.js | Não identificado no projeto atual (inferido: 20+) |

## Framework e renderização
| Item | Versão | Observação |
|---|---|---|
| Next.js | 16.2.4 | App Router; sem Pages Router |
| React | 19.2.4 | |
| React DOM | 19.2.4 | |

## Estilo
| Item | Versão | Observação |
|---|---|---|
| Tailwind CSS | ^4 | Config via CSS `@theme inline` — sem `tailwind.config.js` |
| `tw-animate-css` | ^1.4.0 | Animações Tailwind |
| `class-variance-authority` | ^0.7.1 | Variantes de componentes |
| `clsx` + `tailwind-merge` | ^2.1.1 / ^3.5.0 | Merge seguro de classes |

## Componentes UI
| Item | Versão | Observação |
|---|---|---|
| shadcn/ui | ^4.3.0 | Base de componentes |
| `@base-ui/react` | ^1.4.0 | Primitivos headless |
| Lucide React | ^1.8.0 | Ícones |
| Framer Motion | ^12.38.0 | Animações |
| Sonner | ^2.0.7 | Toasts |
| `qrcode.react` | ^4.2.0 | QR Code para MFA setup |
| `react-phone-number-input` | ^3.4.16 | Input de telefone |
| Recharts | ^3.8.1 | Gráficos |

## Formulários e validação
| Item | Versão |
|---|---|
| React Hook Form | ^7.72.1 |
| `@hookform/resolvers` | ^5.2.2 |
| Zod | ^4.3.6 |

## Banco de dados e backend
| Item | Versão | Observação |
|---|---|---|
| Supabase | ^2.92.0 (CLI) | PostgreSQL + RLS + Realtime + Storage |
| `@supabase/supabase-js` | ^2.103.3 | SDK cliente |
| `@supabase/ssr` | ^0.10.2 | Sessão via cookies com Next.js |

## Drag & Drop
| Item | Versão |
|---|---|
| `@dnd-kit/core` | ^6.3.1 |
| `@dnd-kit/sortable` | ^10.0.0 |
| `@dnd-kit/utilities` | ^3.2.2 |

## Segurança
| Item | Versão | Uso |
|---|---|---|
| `@marsidev/react-turnstile` | ^1.5.0 | Cloudflare Turnstile (anti-bot) |

## Testes
| Item | Versão | Observação |
|---|---|---|
| Vitest | ^4.1.5 | Test runner |
| `@vitest/coverage-v8` | ^4.1.5 | Cobertura |

## Ferramentas de build e dev
| Item | Versão |
|---|---|
| ESLint | ^9 com `eslint-config-next` 16.2.4 |
| `patch-package` | ^8.0.1 |
| `@tailwindcss/postcss` | ^4 |

## Gerenciador de pacotes
npm (lock file: `package-lock.json`)

## Serviços externos
| Serviço | Uso | Status |
|---|---|---|
| Supabase (cloud) | Banco, Auth, Storage, RLS | Em uso |
| Cloudflare Turnstile | Anti-bot em forms públicos | Em uso |
| ViaCEP (via proxy interno) | Busca de CEP | Em uso via `/api/address/cep` |
| WhatsApp API backend | Conversas e mensagens | Banco compartilhado; UI pendente |
| GitHub | Repositório privado | `josuepirolo/crm-multitenant-saas` |

## Variáveis de ambiente relevantes (sem valores)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_TURNSTILE_SITE_KEY
TURNSTILE_SECRET_KEY
```

> **Risco identificado:** `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta como `NEXT_PUBLIC_`. Confirmado que está apenas no servidor.
