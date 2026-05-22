Perfeito. Aqui vai um prompt pronto para jogar no Cursor/Claude:

````md
Você é um Engenheiro de Software Sênior/Staff/Principal, especialista em arquitetura enterprise, documentação técnica, rastreabilidade, Clean Architecture, segurança, escalabilidade, DX e manutenção de longo prazo.

Sua missão é analisar TODO o projeto atual e criar um diretório chamado `specs` na raiz do projeto.

Dentro desse diretório, crie documentos `.md` completos, organizados e objetivos, descrevendo o projeto como uma especificação técnica real.

## Objetivo

Criar uma documentação viva do projeto, que sirva para:

- Entender exatamente o que existe hoje.
- Documentar a stack utilizada.
- Registrar arquitetura, padrões, decisões técnicas e estrutura de diretórios.
- Servir como guia para continuar o desenvolvimento.
- Servir como passo a passo para recriar o projeto do zero.
- Dar rastreabilidade para futuras LLMs entenderem o contexto sem alucinar.
- Evitar perda de contexto, retrabalho e decisões duplicadas.

## Instruções obrigatórias

Antes de criar os arquivos:

1. Analise a estrutura completa do projeto.
2. Leia os principais arquivos de configuração.
3. Identifique a stack utilizada.
4. Identifique frameworks, bibliotecas, versões e padrões.
5. Entenda o fluxo geral da aplicação.
6. Identifique o que já está implementado.
7. Identifique o que parece planejado, incompleto ou pendente.
8. Não invente funcionalidades que não existem.
9. Quando algo não estiver claro, documente como `Ponto em aberto`.
10. Escreva como um engenheiro sênior documentando para outro engenheiro continuar o projeto.

## Diretório a ser criado

Crie na raiz:

```txt
/specs
````

## Arquivos obrigatórios

Crie, no mínimo, os seguintes arquivos:

```txt
/specs/README.md
/specs/00-visao-geral-do-projeto.md
/specs/01-stack-tecnologica.md
/specs/02-arquitetura-do-sistema.md
/specs/03-estrutura-de-diretorios.md
/specs/04-modelagem-e-dados.md
/specs/05-autenticacao-e-seguranca.md
/specs/06-fluxos-principais.md
/specs/07-integracoes.md
/specs/08-padroes-de-codigo.md
/specs/09-regras-de-negocio.md
/specs/10-roadmap-tecnico.md
/specs/11-como-recriar-o-projeto-do-zero.md
/specs/12-checklist-de-evolucao.md
/specs/13-decisoes-arquiteturais.md
```

## Conteúdo esperado por arquivo

### `README.md`

Explique o propósito do diretório `specs`.

Inclua índice dos documentos e ordem recomendada de leitura.

---

### `00-visao-geral-do-projeto.md`

Descreva:

* Nome do projeto, se existir.
* Objetivo principal.
* Problema que resolve.
* Público-alvo.
* Estado atual do projeto.
* Principais módulos existentes.
* Principais módulos planejados.

---

### `01-stack-tecnologica.md`

Documente:

* Linguagem principal.
* Frameworks.
* Versões detectadas.
* Banco de dados.
* Autenticação.
* Bibliotecas principais.
* Ferramentas de build.
* Gerenciador de pacotes.
* Serviços externos.
* Variáveis de ambiente relevantes, sem expor segredos.

Use tabelas quando fizer sentido.

---

### `02-arquitetura-do-sistema.md`

Documente:

* Tipo de arquitetura usada.
* Separação de camadas.
* Fluxo entre front-end, back-end, banco e integrações.
* Responsabilidades de cada camada.
* Pontos fortes da arquitetura atual.
* Riscos arquiteturais.
* Melhorias recomendadas.

Inclua diagramas Mermaid quando útil.

---

### `03-estrutura-de-diretorios.md`

Mapeie a estrutura do projeto.

Para cada diretório importante, explique:

* Finalidade.
* O que ele contém.
* Como deve ser usado.
* O que evitar colocar nele.

Não precisa listar `node_modules`, `.next`, `.git`, ambientes virtuais ou arquivos gerados.

---

### `04-modelagem-e-dados.md`

Documente:

* Entidades principais.
* Tabelas ou schemas detectados.
* Relações entre entidades.
* Regras de isolamento de dados, se houver.
* Estratégia de multi-tenant, se existir.
* Estratégia de migrations, se existir.
* Pontos pendentes da modelagem.

Use Mermaid ERD se possível.

---

### `05-autenticacao-e-seguranca.md`

Documente:

* Como funciona o login.
* Como funciona sessão/token/cookies/JWT/Auth provider.
* Controle de permissões.
* Regras de acesso.
* RLS, se existir.
* Proteção de rotas.
* Variáveis sensíveis.
* Riscos de segurança encontrados.
* Recomendações objetivas.

---

### `06-fluxos-principais.md`

Descreva os fluxos principais do sistema.

Exemplos:

* Cadastro.
* Login.
* Criação de organização/workspace.
* Acesso ao dashboard.
* Criação/listagem/edição de registros.
* Integrações externas.
* Webhooks.
* Fluxos assíncronos.

Para cada fluxo, documente:

* Entrada.
* Processamento.
* Saída.
* Arquivos envolvidos.
* Pendências.

---

### `07-integracoes.md`

Documente integrações existentes ou preparadas:

* APIs externas.
* Webhooks.
* Supabase.
* WhatsApp/Z-API.
* OpenAI/LLM.
* Serviços de e-mail.
* Storage.
* Outros.

Para cada integração:

* Finalidade.
* Onde está implementada.
* Como configurar.
* Variáveis necessárias.
* Riscos.
* Pendências.

---

### `08-padroes-de-codigo.md`

Documente:

* Convenções de nomenclatura.
* Organização de arquivos.
* Padrões de componentes.
* Padrões de services/repositories/use cases.
* Tratamento de erros.
* Validações.
* Logs.
* Tipagem.
* Testes.
* Como novas features devem ser criadas.

Este arquivo deve servir como regra para futuras LLMs não bagunçarem o projeto.

---

### `09-regras-de-negocio.md`

Documente as regras de negócio identificadas.

Separe por módulo.

Para cada regra:

* Código da regra, exemplo: `RN-001`.
* Descrição.
* Onde é aplicada.
* Impacto.
* Pontos pendentes.

Não invente regra. Se parecer uma regra mas não estiver claro, marque como hipótese.

---

### `10-roadmap-tecnico.md`

Crie um roadmap técnico baseado no estado atual do projeto.

Separe em fases:

* Fundação.
* Segurança.
* Core funcional.
* Integrações.
* Relatórios.
* Escalabilidade.
* Observabilidade.
* Produção.

Inclua prioridades e dependências.

---

### `11-como-recriar-o-projeto-do-zero.md`

Crie um guia passo a passo para reconstruir o projeto do zero.

Inclua:

* Pré-requisitos.
* Instalação.
* Configuração de ambiente.
* Banco de dados.
* Variáveis `.env`.
* Comandos para rodar.
* Ordem recomendada de implementação.
* Cuidados importantes.

---

### `12-checklist-de-evolucao.md`

Crie um checklist prático para evolução do projeto.

Separar em:

* Back-end.
* Front-end.
* Banco de dados.
* Segurança.
* UX/UI.
* Integrações.
* Deploy.
* Testes.
* Observabilidade.

Use checkboxes markdown.

---

### `13-decisoes-arquiteturais.md`

Crie um documento estilo ADR simplificado.

Para cada decisão arquitetural detectada ou recomendada:

* Código: `ADR-001`.
* Decisão.
* Contexto.
* Motivo.
* Consequências.
* Status: `aceita`, `pendente`, `recomendada` ou `em análise`.

## Padrão de escrita

* Escreva em português do Brasil.
* Seja técnico, direto e organizado.
* Não use enrolação.
* Não seja genérico.
* Cite caminhos reais de arquivos sempre que possível.
* Quando não souber algo, escreva claramente: `Não identificado no projeto atual`.
* Quando encontrar risco, escreva: `Risco identificado`.
* Quando houver recomendação, escreva: `Recomendação técnica`.

## Regras finais

* Não altere código funcional agora.
* Não refatore nada.
* Apenas crie o diretório `specs` e os arquivos `.md`.
* A documentação deve refletir o projeto real.
* Não invente arquitetura.
* Não invente entidades.
* Não invente integrações.
* Se algo estiver incompleto, documente como incompleto.
* Ao final, apresente um resumo dos arquivos criados e principais achados técnicos.

```

Esse prompt é bom porque força a LLM a fazer o que importa: **ler o projeto real antes de escrever**. Sem isso, ela vira arquiteto de PowerPoint: fala bonito e entrega fumaça gourmet.
```
