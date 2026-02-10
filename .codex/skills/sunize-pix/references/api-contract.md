# Sunize API Contract (PIX)

## Base URL e autenticacao

- Base URL: `https://api.sunize.com.br/v1`
- Headers obrigatorios:
  - `x-api-key: SEU_API_KEY`
  - `x-api-secret: SEU_API_SECRET`

Usar autenticacao apenas no backend.

## Criar transacao

- Metodo: `POST /transactions`
- Objetivo: criar cobranca PIX.
- Campo fixo atual: `payment_method: "PIX"`.

Payload de referencia:

```json
{
  "external_id": "pedido-123",
  "total_amount": 99.9,
  "payment_method": "PIX",
  "items": [
    {
      "id": "sku-1",
      "title": "Produto",
      "description": "Descricao",
      "price": 99.9,
      "quantity": 1,
      "is_physical": false
    }
  ],
  "ip": "203.0.113.10",
  "customer": {
    "name": "Nome Cliente",
    "email": "cliente@email.com",
    "phone": "+5511999999999",
    "document_type": "CPF",
    "document": "24125439095"
  },
  "splits": [
    {
      "user_id": "recebedor-1",
      "type": "percentage",
      "value": 25
    }
  ]
}
```

Notas:
- `customer.phone` no formato E.164.
- `customer.document` valido para `CPF` ou `CNPJ`.
- `splits[].type` aceita `percentage` ou `fixed`.
- `splits[].value`:
  - `percentage`: percentual (ex.: `25`).
  - `fixed`: valor em reais (ex.: `5.50`).

Resposta esperada (resumo):
- `id`
- `external_id`
- `status`: `AUTHORIZED | PENDING | CHARGEBACK | FAILED | IN_DISPUTE`
- `total_value`
- `payment_method`
- `pix.payload`
- `hasError`

## Consultar transacao

- Metodo: `GET /transactions/:transaction_id`
- Objetivo: reconciliar estado da cobranca.

Resposta inclui campos como:
- `id`
- `external_id`
- `status`
- `amount`
- `payment_method`
- `customer`
- `created_at`

## Webhook de status

Payload de notificacao:

```json
{
  "id": "string",
  "external_id": "string",
  "total_amount": 10,
  "status": "AUTHORIZED",
  "payment_method": "PIX"
}
```

Recomendacoes operacionais:
- responder rapido com HTTP `200`.
- processar trabalho pesado assincronamente.
- implementar retry no emissor/consumidor para falhas transitorias.
- validar assinatura se a conta Sunize disponibilizar mecanismo de assinatura.

## Status oficiais

- `PENDING`: aguardando pagamento.
- `AUTHORIZED`: pagamento aprovado.
- `FAILED`: pagamento falhou.
- `CHARGEBACK`: estorno solicitado.
- `IN_DISPUTE`: em disputa.

## Codigos de erro documentados

- `400`: dados invalidos.
- `401`: autenticacao ausente/invalida.
- `500`: erro interno.
