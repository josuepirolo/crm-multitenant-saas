---
name: arquitetura
description: Guia Clean Architecture + MVVM para Next.js App Router. OBRIGATÓRIO antes de criar ou alterar módulo, feature, página, componente, Server Action, repositório, usecase ou viewmodel. Gere plano por camadas antes de codar.
---

# Skill: Arquitetura

Leia `specs_default/INDEX.md` e `specs_default/architecture/clean-arch-mvvm.md`.

## Stack padrão (confirmar em TECH_STACK.template.md)

- Next.js App Router + TypeScript strict
- Tailwind + tokens em `src/app/globals.css`
- shadcn/ui (comportamento, não aparência default)
- Supabase + @supabase/ssr
- React Hook Form + Zod

## Camadas

View → ViewModel → UseCase → Repository → Supabase

## Antes de codar — listar

1. Tipos domínio
2. Migration + RLS (se DB)
3. Repository interface + impl
4. UseCases (1 por operação)
5. Server Actions + permissões
6. ViewModel
7. Componentes + loading/empty/error

## Proibido

- Supabase em `components/`
- Server Action sem auth
- Repository chamado da View
