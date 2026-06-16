# Discovery — `/qrcode` do backend WA não segue o contrato (devolve `value` URL, não `qrcode` data-URI)

Data: 2026-06-15
Relacionado: [[ADR-006-bff-wa-backend-management]] · spec `settings-integrations.spec.md` §11.3
Corrigido no CRM: commit `ccdd920`

## Sintoma

Após desconectar uma instância, o usuário **não conseguia gerar o QR Code** para reparear.
A Server Action `getWaInstanceQrCode` retornava `200`, mas o `QrCodeDialog` exibia erro
("Não foi possível gerar o QR Code").

## Causa raiz — descasamento de contrato

O contrato documentado (`wa-backend-integration-contracts.md` §1.4 / `frontend-whatsapp-integration.md`)
diz:

```json
GET /management/instances/{instance_id}/qrcode → 200
{ "instance_id": "uuid", "qrcode": "data:image/png;base64,..." }   // data URI pronto p/ <img>
```

Mas o backend **real** (`https://messageapi.py.tec.br`) devolve (verificado ao vivo 2026-06-15,
instância `cd5301d1-…` do Lekazis):

```json
GET /management/instances/cd5301d1-…/qrcode → 200
{ "instance_id": "cd5301d1-…", "value": "https://wa.me/settings/linked_devices#2@lwIh3r3hkHz9/oIEEgGn…" }
```

Diferenças:
1. O campo é **`value`**, não `qrcode`.
2. O conteúdo é uma **URL/código de pareamento** (`wa.me/.../linked_devices#…`), **não** um
   `data:image/png;base64` (não é imagem).

A action lia `result.qr.qrcode` → `undefined` → o dialog tratava como erro.

(Nota: o `/status` no mesmo teste devolveu `{"connected":false, "smartphoneConnected":false}` — ou
seja, a **desconexão funcionou**; o problema era só o QR.)

## Correção aplicada no CRM (commit `ccdd920`)

- `WaInstanceQrCode`: passa a ler **`value`** (mantendo `qrcode` por compatibilidade).
- `getWaInstanceQrCode` extrai `value ?? qrcode`.
- `QrCodeDialog` **renderiza o QR localmente** a partir da string com `QRCodeSVG` (`qrcode.react`,
  já instalado). Se vier `data:`, renderiza como `<img>`.
- **Segurança:** o código de pareamento é sensível → QR gerado **no browser**, nunca enviado a
  serviço externo de QR (evita sequestro do vínculo). Fundo branco (requisito do scanner).
- Teste: `wa-backend-bff.test.ts` cobre a extração de `value` (suíte 418/418).

## Recomendação para o backend WA

Corrigir a **documentação** do contrato (`.sdds/contracts/management-instances.md` do repo do backend)
para refletir a resposta real: `{ instance_id, value }` com `value` = URL/código de pareamento. Ou,
alternativamente, **alinhar a implementação ao doc** (devolver `qrcode` como data URI) — mas isso
quebraria o CRM atual, que agora espera `value`. **Decisão recomendada:** corrigir o doc (o `value`
é mais flexível — o frontend renderiza o QR como preferir). Outros consumidores que seguirem o doc
antigo vão quebrar igual o CRM quebrou.

## Lição

Mesmo com contratos "congelados", validar a resposta **real** do endpoint antes de tipar — já
aconteceu o inverso com `account-settings` (cache vazio retornando tudo `null`, ver
`discoveries/2026-06-14-wa-backend-rejects-es256-jwt.md` e spec §11.3). Padrão de diagnóstico:
chamada read-only ao endpoint real (admin flow sem captcha) imprimindo o shape cru.
