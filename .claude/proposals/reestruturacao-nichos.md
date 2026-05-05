# Proposta de Reestruturação para Nichos

> Cole aqui os 4 prompts de proposta, um por seção.

---

## Proposta 1 
🧠 1. PROMPT — REESTRUTURAÇÃO DO BANCO (SQL)

Você é um arquiteto de software sênior especialista em SaaS multi-tenant e PostgreSQL.

Preciso refatorar a modelagem do meu banco para suportar um SaaS multi-nicho com múltiplos segmentos por nicho, sem necessidade de refatoração futura.

Requisitos:

1. Já existe estrutura multi-tenant com:

* workspaces
* users
* workspace_members

2. Criar nova estrutura de nichos:

Tabela "Niche":

* id (UUID)
* name (string)
* slug (string único)
* description (text)
* active (boolean)
* created_at

Tabela "NicheSegment":

* id (UUID)
* niche_id (FK → Niche.id)
* name (string)
* slug (string único por nicho)
* description (text)
* active (boolean)
* created_at

3. Atualizar tabela "Workspace":

* adicionar niche_id (FK)
* adicionar niche_segment_id (FK)

4. Criar constraints:

* slug único por nicho (segmento)
* integridade entre niche e segment

5. Criar seeds iniciais:

Niche:

* auto_parts
* fashion

NicheSegment:
Para auto_parts:

* heavy (linha pesada)
* light (linha leve)
* agro (agrícola)
* moto (motocicletas)

Para fashion:

* feminino
* masculino
* infantil

6. Padrão de nomenclatura:

* PascalCase para tabelas
* snake_case para colunas
* UUID como PK

7. Criar índices para performance:

* workspace.niche_id
* workspace.niche_segment_id

8. NÃO remover dados existentes, apenas migrar com segurança.

9. Gerar:

* script SQL completo
* migrations seguras
* comentários explicando decisões

Objetivo:
Criar base sólida para crescimento multi-nicho sem retrabalho.




---

## Proposta 2
🎨 2. PROMPT — SISTEMA DE UI MULTI-NICHO (ENTERPRISE)

Você é um especialista em arquitetura de front-end enterprise com Next.js, Tailwind e design system escalável.

Preciso estruturar um SaaS multi-nicho com suporte a identidade visual dinâmica por nicho e segmento.

Requisitos:

1. O sistema é único (mesmo código base), mas cada nicho terá:

* cores próprias
* tipografia opcional
* ícones e identidade visual
* variações de layout (sem quebrar o core)

2. Criar arquitetura de tema:

* theme por niche
* overrides por niche_segment

3. Estrutura esperada:

/themes
/auto-parts
/fashion

Cada tema deve conter:

* colors.ts
* typography.ts
* components.ts (variações)
* layout.ts config

4. Criar um ThemeProvider dinâmico:

* baseado em workspace.niche e niche_segment
* carregado no layout root
* sem reload completo da aplicação

5. Regras:

* Não duplicar componentes
* Usar design tokens
* Tudo baseado em Tailwind config dinâmico
* Dark mode preparado

6. Criar exemplo real:

Tema auto_parts:

* cores mais escuras (preto, azul, vermelho)
* visual mais industrial

Tema fashion:

* cores mais leves
* visual clean e elegante

7. Criar fallback:

* caso nicho não tenha tema, usar default

8. Performance:

* evitar bundle duplicado
* lazy load de temas

9. Gerar:

* estrutura de pastas
* exemplos de código
* ThemeProvider completo
* exemplo de uso no layout.tsx

Objetivo:
Criar sistema visual escalável, reutilizável e profissional.



---

## Proposta 3
⚙️ 3. PROMPT — MÓDULO AUTO PARTS (BASE DO SEU PRODUTO)

Você é um arquiteto de software criando módulos plugáveis para SaaS multi-nicho.

Preciso criar o módulo "auto_parts" desacoplado, escalável e reutilizável.

Requisitos:

1. O módulo deve suportar múltiplos segmentos:

* heavy (caminhões)
* light (carros)
* agro (agrícola)
* moto

2. Criar estrutura:

Tabelas:

* AutoPartsVehicleBrand
* AutoPartsVehicleModel
* AutoPartsPartCategory
* AutoPartsPart
* AutoPartsQuoteRequest
* AutoPartsQuoteRequestItem

3. Regras:

* Tudo vinculado ao workspace_id
* suportar multi-tenant
* permitir expansão futura (estoque, pedidos, etc)

4. QuoteRequest deve:

* armazenar snapshot dos dados
* não depender da peça original

5. Criar endpoints (FastAPI ou Next API):

* GET catálogo
* POST solicitar orçamento
* GET listar orçamentos
* PATCH atualizar status

6. Criar fluxo:

Catálogo → seleção → formulário → criação → envio automático WhatsApp

7. Preparar para integração com WhatsApp (Z-API)

8. Gerar:

* schema completo
* endpoints
* estrutura de pastas
* exemplos de payload

Objetivo:
Criar módulo base vendável para auto parts.





---

## Proposta 4

🤖 4. PROMPT — ESTRATÉGIA COM CLAUDE (DECISÕES DE ARQUITETURA)

Estou construindo um SaaS multi-tenant e multi-nicho com arquitetura modular.

Contexto:

* Next.js no front-end
* Supabase (PostgreSQL + API Router) no back-end
* PostgreSQL
* multi-tenant via workspace
* nicho e segmento dinâmicos
* módulos plugáveis por nicho

Objetivo:
Evitar retrabalho futuro e garantir escalabilidade.

Preciso que você:

1. Analise minha arquitetura:

* niche + niche_segment
* módulos separados por domínio
* prefixo de tabelas por domínio

2. Valide:

* riscos dessa abordagem
* pontos de melhoria
* gargalos futuros

3. Sugira:

* padrões enterprise usados no mercado
* melhorias para escalar para centenas de clientes
* estratégias para evitar acoplamento

4. Foco:

* performance
* segurança multi-tenant
* manutenibilidade

5. Seja direto, crítico e técnico.

Objetivo:
Validar se estou construindo um SaaS realmente escalável.
