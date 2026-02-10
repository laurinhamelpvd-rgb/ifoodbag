# Endpoints and Payloads

## Base URL
Use:

`https://api.ghostspaysv2.com/functions/v1`

## Autenticacao Basic
Montar o header:

`Authorization: Basic base64(SECRET_KEY:COMPANY_ID)`

Headers obrigatorios:
- `Authorization: Basic ...`
- `Content-Type: application/json`

Observacao importante:
- A documentacao recebida tem divergencia no `securitySchemes` (trecho cita password vazio).
- Priorizar `SECRET_KEY:COMPANY_ID` (introducao oficial).
- Se houver `401`, validar rapidamente variacao legada `SECRET_KEY:` e confirmar no painel/suporte.

## Criar Pagamento
`POST /transactions`

Campos minimos:
- `customer.name`
- `customer.email`
- `customer.phone`
- `customer.document.number`
- `paymentMethod` (`PIX`, `CARD`, `BOLETO`)
- `items` (>= 1 item)
- `amount` (centavos)

Campos comuns recomendados:
- `postbackUrl`
- `metadata` (ex.: `orderId`, `tenantId`, `utm_source`)
- `description`
- `ip`

Payload PIX (exemplo):

```json
{
  "customer": {
    "name": "Joao Silva",
    "email": "joao@example.com",
    "phone": "11987654321",
    "document": {
      "number": "12345678901",
      "type": "CPF"
    }
  },
  "paymentMethod": "PIX",
  "amount": 5000,
  "items": [
    {
      "title": "Produto Exemplo",
      "unitPrice": 5000,
      "quantity": 1
    }
  ],
  "pix": {
    "expiresInDays": 1
  },
  "postbackUrl": "https://seu-dominio.com/api/payments/webhook",
  "metadata": {
    "orderId": "ord_123"
  }
}
```

Retorno esperado para PIX:
- `id`
- `status`
- `pix.qrcode`
- `pix.qrcodeText` (quando presente)
- `pix.expirationDate`

## Listar Transacoes
`GET /transactions`

Filtros suportados:
- `page`
- `limit`
- `status`
- `paymentMethod`
- `startDate` (`YYYY-MM-DD`)
- `endDate` (`YYYY-MM-DD`)

Usar para:
- conciliacao diaria
- monitoramento de falhas
- relatorio de operacao

## Consultar Transacao
`GET /transactions/{id}`

Usar para:
- tela de detalhe
- reconcile apos webhook atrasado
- confirmar status final em falhas operacionais

## Estornar Transacao
`DELETE /transactions/{id}`

Regras:
- transacao precisa estar `paid`
- estorno total: omitir `amount`
- estorno parcial: enviar `amount` em centavos

Exemplo:

```json
{
  "amount": 2500,
  "reason": "cliente desistiu"
}
```

## Atualizar Status de Entrega
`PUT /transactions/{id}/delivery`

Campos:
- `deliveryStatus`: `shipped`, `delivered`, `returned`, `lost`
- `trackingCode` (opcional)
- `deliveryDate` (obrigatorio quando `deliveryStatus=delivered`)

## Erros e respostas
Tratar no dominio interno:
- `400` bad request
- `401` unauthorized
- `404` not found
- `422` validation error
- `500` internal error

Observacao:
- pode haver retorno simplificado `Unauthorized` em texto puro em alguns cenarios de auth.
