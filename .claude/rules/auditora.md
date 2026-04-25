Atenção: NÃO é para reiniciar o projeto do zero.

O sistema já teve uma rodada importante de blindagem na parte multi-tenant e RLS.
O foco agora é fazer uma AUDITORIA PROFISSIONAL COMPLETA do frontend e backend, incluindo a forma como o frontend conversa com o backend, e validar se a arquitetura atual está realmente segura, modular e consistente.

## CONTEXTO

O projeto é um CRM multi-tenant em Next.js com Supabase.
Já existe:
- autenticação
- dashboard
- contatos
- settings
- guards
- RLS
- uso de `createClient()` nas ações comuns
- correção do bypass indevido de `createAdminClient()` nas ações de usuário comum
- testes passando
- uso isolado e legítimo de admin client apenas onde tecnicamente necessário

## OBJETIVO DESTA TAREFA

Quero uma auditoria profissional e prática para responder, com evidência técnica:

1. O frontend está conversando com o backend da forma correta?
2. Estamos usando API Routes, Server Actions, chamadas diretas ao Supabase ou mistura inconsistente?
3. Essa comunicação está segura?
4. Existe risco de expor lógica, permissões ou dados no client?
5. A arquitetura está coerente com Clean Architecture + MVVM + separação de responsabilidades?
6. O frontend está modular, reutilizável e com design system centralizado?
7. Existe hardcode, duplicação ou acoplamento indevido entre camadas?
8. O projeto está preparado para crescer sem virar bagunça?

## O QUE VOCÊ DEVE AUDITAR

### 1. Comunicação frontend ↔ backend
Audite o fluxo completo:
- componentes/client components
- server components
- server actions
- API routes (`app/api/...` ou equivalente)
- chamadas diretas ao Supabase no frontend
- uso de hooks/viewmodels
- fluxo de autenticação e sessão

Quero descobrir com clareza:
- se o frontend conversa com o backend via API Routes
- se usa Server Actions
- se faz chamadas diretas ao Supabase
- se isso está consistente ou misturado de forma perigosa
- se há lógica crítica indevida no client

### 2. Segurança da comunicação
Verifique:
- se dados sensíveis estão sendo tratados apenas no servidor
- se `workspaceId`/tenant nunca vem confiado do cliente
- se permissões estão sendo validadas no servidor
- se existe risco de front chamar Supabase de forma indevida
- se o uso de Supabase no client está limitado ao que pode mesmo estar no client
- se há risco de bypass por chamadas fora do fluxo esperado

### 3. API Routes / Server Actions
Mapeie:
- onde existem API Routes
- onde existem Server Actions
- onde o projeto deveria usar um ou outro
- se existe lógica duplicada entre essas camadas
- se há endpoints/actions fazendo papel demais
- se a escolha entre API Route, Server Action e acesso via repository está coerente

### 4. Clean Architecture
Verifique se a arquitetura está respeitando na prática:
- UI separada de regra de negócio
- ViewModel separada da View
- use cases isolados
- repositories isolados
- infra separada
- pages não falando direto com banco sem passar pela camada correta
- actions sem virar depósito de regra de negócio

### 5. MVVM
Validar se:
- View apenas renderiza
- ViewModel orquestra estado e interação
- Model/use cases/repositories cuidam do domínio e dados
- não existe componente com lógica demais
- não existe viewmodel gordo ou fazendo papel de service/repository

### 6. Frontend / Design System / Reuso
Verifique:
- componentes duplicados
- estilos repetidos
- tokens visuais espalhados
- classes hardcoded em muitos lugares
- ausência de fonte única de verdade para design
- tables/forms/dialogs/cards/buttons/badges inconsistentes
- facilidade real de alterar o design system de forma centralizada

### 7. Hardcode e acoplamento
Procure:
- labels e textos repetidos
- permissões hardcoded em vários pontos
- enums/configs soltas
- regras duplicadas entre frontend e backend
- dependência indevida de detalhes de infra na UI
- imports cruzados quebrando camadas

## O QUE VOCÊ DEVE FAZER

1. Auditar o código real
2. Identificar problemas reais, com evidência por arquivo
3. Dizer claramente o que está seguro e o que não está
4. Dizer claramente se a comunicação frontend/backend está correta
5. Dizer claramente se estamos usando API Routes, Server Actions ou outro fluxo
6. Corrigir o que for necessário
7. Refatorar só o necessário, sem modismo e sem exagero
8. Preservar a blindagem multi-tenant já consolidada
9. Não quebrar comportamento existente
10. Não responder com teoria genérica

## SAÍDA OBRIGATÓRIA

Responda exatamente nesta estrutura:

### 1. Diagnóstico executivo
Responda objetivamente:
- O frontend conversa com o backend de forma correta ou não?
- Estamos usando API Routes, Server Actions, chamadas diretas ao Supabase, ou uma mistura?
- Essa comunicação está segura?
- Há risco relevante no fluxo atual?
- A arquitetura está coerente com Clean Architecture + MVVM?
- O design system está centralizado de verdade?
- O projeto está modular e reutilizável ou ainda há muito hardcode?

### 2. Mapa arquitetural real
Liste, por módulo:
- como o frontend chama o backend
- quais fluxos passam por Server Actions
- quais passam por API Routes
- quais falam direto com Supabase
- onde isso está correto
- onde isso está inconsistente

### 3. Problemas encontrados
Liste por arquivo:
- problema
- impacto
- risco
- prioridade (alta, média, baixa)

### 4. Plano de correção
Liste objetivamente o que precisa mudar.

### 5. Implementação
Mostre patches/diffs ou código final por arquivo.

### 6. Validação final
Confirme com clareza:
- se o frontend/backend ficou seguro
- se a comunicação ficou consistente
- se as camadas ficaram melhor separadas
- se reduziu hardcode
- se melhorou reutilização
- se o design system ficou centralizado
- se a base multi-tenant permaneceu blindada

### 7. Conclusão na lata
Diga sem floreio:
- estamos seguros ou não?
- em que nível?
- o que ainda falta para ficar profissional de verdade?

## CRITÉRIO DE SUCESSO

Só considere a tarefa concluída se houver evidência concreta de:
- comunicação frontend/backend mapeada
- segurança dessa comunicação validada
- identificação clara de uso de API Routes / Server Actions / Supabase client
- aderência prática a Clean Architecture + MVVM
- centralização real do design system
- redução de hardcode
- reutilização real de componentes
- nenhuma regressão na segurança multi-tenant