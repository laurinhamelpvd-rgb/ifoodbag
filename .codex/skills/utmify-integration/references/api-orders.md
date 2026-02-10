# API Orders UTMify

## Sumario
- Endpoint e autenticacao
- Contrato do payload
- Regras de consistencia
- Mapeamento de status por tipo de pagamento
- Templates JSON
- Erros comuns

## Endpoint e autenticacao

- Metodo: `POST`
- URL: `https://api.utmify.com.br/api-credentials/orders`
- Header obrigatorio:
  - `x-api-token: <credencial_da_api>`

Gerar a credencial no painel UTMify:
`Integracoes > Webhooks > Credenciais de API > Adicionar Credencial`.

## Contrato do payload

```json
{
  "orderId": "string",
  "platform": "PascalCase",
  "paymentMethod": "credit_card | boleto | pix | paypal | free_price",
  "status": "waiting_payment | paid | refused | refunded | chargedback",
  "createdAt": "YYYY-MM-DD HH:MM:SS",
  "approvedDate": "YYYY-MM-DD HH:MM:SS | null",
  "refundedAt": "YYYY-MM-DD HH:MM:SS | null",
  "customer": {
    "name": "string",
    "email": "string",
    "phone": "string | null",
    "document": "string | null",
    "country": "ISO-3166-1 alpha-2",
    "ip": "string"
  },
  "products": [
    {
      "id": "string",
      "name": "string",
      "planId": "string | null",
      "planName": "string | null",
      "quantity": 1,
      "priceInCents": 1000
    }
  ],
  "trackingParameters": {
    "src": "string | null",
    "sck": "string | null",
    "utm_source": "string | null",
    "utm_campaign": "string | null",
    "utm_medium": "string | null",
    "utm_content": "string | null",
    "utm_term": "string | null"
  },
  "commission": {
    "totalPriceInCents": 1000,
    "gatewayFeeInCents": 100,
    "userCommissionInCents": 900,
    "currency": "BRL | USD | EUR | GBP | ARS | CAD"
  },
  "isTest": false
}
```

## Regras de consistencia

- Reutilizar o mesmo `orderId` para todas as atualizacoes do pedido.
- Reutilizar o mesmo `createdAt` para todas as atualizacoes do pedido.
- Enviar datas em UTC no formato `YYYY-MM-DD HH:MM:SS`.
- Enviar `approvedDate = null` quando pedido ainda nao foi pago.
- Enviar `refundedAt = null` quando pedido nao foi estornado.
- Enviar campos de tracking ausentes como `null`.
- Evitar enviar `userCommissionInCents = 0` sem motivo real.
- Se nao informar comissao real do vendedor, usar `userCommissionInCents = totalPriceInCents`.

## Conversao de horario para UTC

Exemplo (fuso Brasilia, UTC-3):
- Evento local: `2024-07-26 11:35:13`
- UTC enviado: `2024-07-26 14:35:13`

Exemplo reembolso:
- Evento local: `2024-07-18 22:44:39`
- UTC enviado: `2024-07-19 01:44:39`

## Mapeamento de status por tipo de pagamento

PIX:
- QR gerado: `waiting_payment`
- PIX confirmado: `paid`
- Estornado: `refunded`

Cartao:
- Capturado/aprovado: `paid`
- Recusado definitivo: `refused`
- Reembolsado: `refunded`
- Chargeback: `chargedback`

Boleto:
- Gerado: `waiting_payment`
- Compensado: `paid`
- Cancelado/expirado sem pagamento: `refused`

## Template: PIX gerado

```json
{
  "orderId": "8e40b27e-0118-4699-8587-e892beedb403",
  "platform": "GlobalPay",
  "paymentMethod": "pix",
  "status": "waiting_payment",
  "createdAt": "2024-07-26 14:35:13",
  "approvedDate": null,
  "refundedAt": null,
  "customer": {
    "name": "Marcos Goncalves Rodrigues",
    "email": "marcosgonrod@hotmail.com",
    "phone": "19936387209",
    "document": "29672656599",
    "country": "BR",
    "ip": "61.145.134.105"
  },
  "products": [
    {
      "id": "53d5ce96-a548-4c7b-a0bc-da8bfa0f9294",
      "name": "Oleo de Motor",
      "planId": null,
      "planName": null,
      "quantity": 1,
      "priceInCents": 8000
    }
  ],
  "trackingParameters": {
    "src": null,
    "sck": null,
    "utm_source": "FB",
    "utm_campaign": "CAMPANHA_2|413591587909524",
    "utm_medium": "CONJUNTO_2|498046723566488",
    "utm_content": "ANUNCIO_2|504346051220592",
    "utm_term": "Instagram_Feed"
  },
  "commission": {
    "totalPriceInCents": 10000,
    "gatewayFeeInCents": 400,
    "userCommissionInCents": 9600
  },
  "isTest": false
}
```

## Template: pedido pago

```json
{
  "orderId": "8e40b27e-0118-4699-8587-e892beedb403",
  "platform": "GlobalPay",
  "paymentMethod": "pix",
  "status": "paid",
  "createdAt": "2024-07-26 14:35:13",
  "approvedDate": "2024-07-26 14:43:37",
  "refundedAt": null
}
```

## Template: pedido reembolsado

```json
{
  "orderId": "b101ea20-72c7-473d-bcc4-416fe4d8f3be",
  "platform": "GlobalPay",
  "paymentMethod": "credit_card",
  "status": "refunded",
  "createdAt": "2024-07-15 13:30:14",
  "approvedDate": "2024-07-15 13:30:14",
  "refundedAt": "2024-07-19 01:44:39"
}
```

## Erros comuns

- `API_CREDENTIAL_NOT_FOUND`:
  - token ausente ou invalido no header `x-api-token`.
- `422` com campos invalidos:
  - revisar enums (`paymentMethod`, `status`, `currency`) e formato de data UTC.
- Pedido nao aparece no dashboard:
  - confirmar que `isTest` esta `false` (ou ausente) em ambiente real.
