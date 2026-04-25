---
name: auditoria
description: Auditoria profissional completa do CRM Vendas WhatsApp — frontend, backend, comunicação, segurança, Clean Architecture, MVVM, design system e hardcode. Ative quando o usuário pedir auditoria, revisão geral, diagnóstico do projeto ou quiser saber se o código está seguro e consistente. Produz diagnóstico executivo com evidências por arquivo, mapa arquitetural real, problemas priorizados e plano de correção. Não responde com teoria genérica — audita o código real.
---

# Skill: Auditoria Profissional — CRM Vendas WhatsApp

## Contexto obrigatório

O projeto é um CRM multi-tenant em Next.js com Supabase. Já existe:
- autenticação, dashboard, contatos, settings
- guards, RLS, uso de `createClient()` nas ações comuns
- correção do bypass indevido de `createAdminClient()` nas ações de usuário comum
- testes passando
- uso isolado e legítimo de admin client apenas onde tecnicamente necessário

**NÃO reiniciar do zero. NÃO quebrar a blindagem multi-tenant existente.**

## Objetivo

Responder com evidência técnica:

1. O frontend está conversando com o backend da forma correta?
2. Estamos usando API Routes, Server Actions, chamadas diretas ao Supabase ou mistura inconsistente?
3. Essa comunicação está segura?
4. Existe risco de expor lógica, permissões ou dados no client?
5. A arquitetura está coerente com Clean Architecture + MVVM + separação de responsabilidades?
6. O frontend está modular, reutilizável e com design system centralizado?
7. Existe hardcode, duplicação ou acoplamento indevido entre camadas?
8. O projeto está preparado para crescer sem virar bagunça?

## O que auditar

### 1. Comunicação frontend ↔ backend
Audite o fluxo completo:
- componentes client e server
- server actions
- API routes (`app/api/...`)
- chamadas diretas ao Supabase no frontend
- hooks/viewmodels
- fluxo de autenticação e sessão

Descobrir com clareza:
- se o frontend conversa via API Routes, Server Actions ou Supabase direto
- se está consistente ou misturado de forma perigosa
- se há lógica crítica indevida no client

### 2. Segurança da comunicação
Verificar:
- dados sensíveis tratados apenas no servidor
- `workspaceId`/tenant nunca confiado do cliente
- permissões validadas no servidor
- uso de Supabase no client limitado ao que pode mesmo estar no client
- risco de bypass por chamadas fora do fluxo esperado

### 3. API Routes / Server Actions
Mapear:
- onde existem API Routes e Server Actions
- onde o projeto deveria usar um ou outro
- lógica duplicada entre camadas
- endpoints/actions fazendo papel demais
- coerência da escolha entre API Route, Server Action e repository

### 4. Clean Architecture
Verificar na prática:
- UI separada de regra de negócio
- ViewModel separada da View
- use cases isolados
- repositories isolados
- infra separada
- pages não falando direto com banco sem passar pela camada correta
- actions sem virar depósito de regra de negócio

### 5. MVVM
Validar:
- View apenas renderiza
- ViewModel orquestra estado e interação
- Model/use cases/repositories cuidam do domínio e dados
- nenhum componente com lógica demais
- nenhum viewmodel gordo fazendo papel de service/repository

### 6. Design System / Reuso
Verificar:
- componentes duplicados
- estilos repetidos
- tokens visuais espalhados
- classes hardcoded em muitos lugares
- ausência de fonte única de verdade para design
- tables/forms/dialogs/cards/buttons/badges inconsistentes
- facilidade real de alterar o design system de forma centralizada

### 7. Hardcode e acoplamento
Procurar:
- labels e textos repetidos
- permissões hardcoded em vários pontos
- enums/configs soltas
- regras duplicadas entre frontend e backend
- dependência indevida de detalhes de infra na UI
- imports cruzados quebrando camadas

## O que fazer

1. Auditar o código real — não inventar problemas
2. Identificar problemas com evidência por arquivo
3. Dizer claramente o que está seguro e o que não está
4. Dizer claramente se a comunicação frontend/backend está correta
5. Corrigir o que for necessário
6. Refatorar só o necessário, sem modismo e sem exagero
7. Preservar a blindagem multi-tenant já consolidada
8. Não quebrar comportamento existente
9. Não responder com teoria genérica

## Saída obrigatória

Responder exatamente nesta estrutura:

### 1. Diagnóstico executivo
- O frontend conversa com o backend de forma correta ou não?
- Estamos usando API Routes, Server Actions, chamadas diretas ao Supabase, ou uma mistura?
- Essa comunicação está segura?
- Há risco relevante no fluxo atual?
- A arquitetura está coerente com Clean Architecture + MVVM?
- O design system está centralizado de verdade?
- O projeto está modular e reutilizável ou ainda há muito hardcode?

### 2. Mapa arquitetural real
Por módulo:
- como o frontend chama o backend
- quais fluxos passam por Server Actions
- quais passam por API Routes
- quais falam direto com Supabase
- onde está correto
- onde está inconsistente

### 3. Problemas encontrados
Por arquivo:
- problema
- impacto
- risco
- prioridade (alta / média / baixa)

### 4. Plano de correção
Lista objetiva do que precisa mudar.

### 5. Implementação
Patches/diffs ou código final por arquivo.

### 6. Validação final
Confirmar:
- frontend/backend ficou seguro?
- comunicação ficou consistente?
- camadas ficaram melhor separadas?
- reduziu hardcode?
- melhorou reutilização?
- design system ficou centralizado?
- base multi-tenant permaneceu blindada?

### 7. Conclusão na lata
Sem floreio:
- estamos seguros ou não?
- em que nível?
- o que ainda falta para ficar profissional de verdade?

## Critério de sucesso

Só concluir se houver evidência concreta de:
- comunicação frontend/backend mapeada
- segurança dessa comunicação validada
- identificação clara de uso de API Routes / Server Actions / Supabase client
- aderência prática a Clean Architecture + MVVM
- centralização real do design system
- redução de hardcode
- reutilização real de componentes
- nenhuma regressão na segurança multi-tenant
