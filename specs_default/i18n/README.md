# i18n — PT / EN / ES

## Idioma fonte

- **Specs técnicas:** PT-BR (`specs_default/` raiz)
- **UI do produto:** três locales suportados

## Estrutura recomendada no app

```
src/i18n/
├── pt.json
├── en.json
├── es.json
└── config.ts          # defaultLocale: 'pt'
```

Ou `next-intl` com `messages/pt.json`, etc.

## O que traduzir

| Traduzir | Não traduzir |
|---|---|
| Labels, botões, toasts | Nomes de tokens CSS |
| Empty/error messages | Keys de API |
| Meta title/description | Enums de audit log |

## LLM

- Gerar copy default em **PT-BR**
- Fornecer equivalente EN/ES para strings user-facing
- Manter chaves idênticas nos 3 JSONs

## Índices traduzidos

- [English index](en/INDEX.md)
- [Índice español](es/INDEX.md)
