# Fix: Sheet de gerenciamento não carrega dados do grupo

## Diagnóstico (via logs do backend)

Nos logs do backend, ao abrir o sheet de gerenciamento de um grupo, **nenhuma
requisição `GET /tenants/.../instances/.../groups/{group_id}` chega ao servidor**.
Apenas os `PUT` de rename aparecem. Isso confirma que `handleGetMetadata` não
está sendo chamado quando o sheet abre — por isso os campos aparecem vazios.

## O que corrigir

### 1. O sheet deve chamar `handleGetMetadata` ao abrir

O `wa-manage-group-sheet.tsx` precisa disparar o carregamento de metadata assim
que abre. Use `useEffect` com `open` como dependência:

```tsx
useEffect(() => {
  if (open && group?.group_provider_id) {
    vm.handleGetMetadata(group.group_provider_id);
  }
}, [open, group?.group_provider_id]);
```

Sem esse effect, o sheet abre com estado vazio e os campos de nome/descrição
não têm valor inicial para pré-preencher.

### 2. Verificar os parâmetros passados para `handleGetMetadata`

O endpoint correto no backend é:
```
GET /tenants/{tenant_id}/instances/{instance_id}/groups/{group_provider_id}
```

Três parâmetros são obrigatórios: `tenantId`, `instanceId`, **e** `group_provider_id`.

Verificar a assinatura de `handleGetMetadata` no ViewModel e a chamada no
repository. A URL deve ser montada como:
```ts
`/tenants/${tenantId}/instances/${instanceId}/groups/${groupId}`
```
onde `groupId` = `group.group_provider_id` (ex: `120363409387612730-group`),
**nunca** `group.id` (UUID da conversa).

Se `instanceId` não está sendo passado para o sheet ou para o ViewModel, precisa
ser propagado. O `instanceId` vem de `selectedInstance.instance_id` no
`wa-grupos-client.tsx`.

### 3. Shape da resposta — o que extrair de `result`

O backend retorna passthrough da Z-API:
```json
{
  "group_id": "120363409387612730-group",
  "result": {
    "name": "Vip Lekazis #02",
    "description": "Descrição do grupo",
    "participants": [
      { "phone": "5544999990000", "isAdmin": false },
      { "phone": "5511888880000", "isAdmin": true }
    ],
    "adminOnlyMessage": false,
    "adminOnlySettings": false
  },
  "synced_at": "2026-06-16T06:20:00Z"
}
```

O shape exato dos campos dentro de `result` é passthrough Z-API — pode variar.
Os campos mais confiáveis são `name`, `description` e `participants[].phone`.
Acessar sempre como `metadata.result?.name`, `metadata.result?.description`,
`metadata.result?.participants ?? []`.

### 4. Pré-preencher os campos do sheet com os dados carregados

Após `handleGetMetadata` resolver, os campos devem ser inicializados:

```tsx
// Quando metadata carregar, pré-preenche os campos editáveis
useEffect(() => {
  if (metadata) {
    setName(metadata.result?.name ?? "");
    setDescription(metadata.result?.description ?? "");
  }
}, [metadata]);
```

Os participantes devem ser listados diretamente de `metadata.result?.participants ?? []`
(sem estado local separado — são só leitura vinda do backend).

## Resumo do fluxo esperado

```
Sheet abre
  → useEffect dispara handleGetMetadata(group.group_provider_id)
  → GET /tenants/{tenantId}/instances/{instanceId}/groups/{group_provider_id}
  → backend retorna { group_id, result: { name, description, participants, ... } }
  → campos nome e descrição pré-preenchidos com result.name / result.description
  → lista de participantes renderiza result.participants
```

## Verificação nos logs do backend

Após o fix, ao abrir o sheet deve aparecer nos logs:
```
GET /tenants/14ee144b-.../instances/cd5301d1-.../groups/120363409387612730-group 200 OK
```
Se não aparecer, o useEffect não está disparando ou a chamada está falhando
antes de chegar ao servidor (checar console do browser para erro de rede/auth).
