# Testing and Troubleshooting

## Variaveis de ambiente
Definir no backend/shell:

```bash
GHOSTSPAY_SECRET_KEY=...
GHOSTSPAY_COMPANY_ID=...
GHOSTSPAY_BASE_URL=https://api.ghostspaysv2.com/functions/v1
```

## Gerar Basic Auth (PowerShell)
```powershell
$pair = "$env:GHOSTSPAY_SECRET_KEY`:$env:GHOSTSPAY_COMPANY_ID"
$bytes = [System.Text.Encoding]::UTF8.GetBytes($pair)
$basic = [Convert]::ToBase64String($bytes)
```

## Criar pagamento PIX (curl)
```bash
curl -X POST "$GHOSTSPAY_BASE_URL/transactions" \
  -H "Authorization: Basic BASE64_SECRET_COMPANY" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "name": "Teste PIX",
      "email": "teste@example.com",
      "phone": "11999999999",
      "document": { "number": "12345678901", "type": "CPF" }
    },
    "paymentMethod": "PIX",
    "amount": 10000,
    "items": [{ "title": "Produto", "unitPrice": 10000, "quantity": 1 }],
    "pix": { "expiresInDays": 1 },
    "postbackUrl": "https://seu-dominio.com/api/payments/webhook"
  }'
```

## Listar transacoes
```bash
curl -X GET "$GHOSTSPAY_BASE_URL/transactions?page=1&limit=10" \
  -H "Authorization: Basic BASE64_SECRET_COMPANY"
```

## Consultar transacao
```bash
curl -X GET "$GHOSTSPAY_BASE_URL/transactions/TRANSACTION_ID" \
  -H "Authorization: Basic BASE64_SECRET_COMPANY"
```

## Estornar transacao (parcial)
```bash
curl -X DELETE "$GHOSTSPAY_BASE_URL/transactions/TRANSACTION_ID" \
  -H "Authorization: Basic BASE64_SECRET_COMPANY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 500, "reason": "teste estorno parcial"}'
```

## Atualizar status de entrega
```bash
curl -X PUT "$GHOSTSPAY_BASE_URL/transactions/TRANSACTION_ID/delivery" \
  -H "Authorization: Basic BASE64_SECRET_COMPANY" \
  -H "Content-Type: application/json" \
  -d '{"deliveryStatus":"delivered","trackingCode":"BR123456789","deliveryDate":"2026-02-10"}'
```

## Erros comuns
`401 Unauthorized`
- credenciais incorretas
- base64 malformado
- divergencia de formato (`SECRET_KEY:COMPANY_ID` vs `SECRET_KEY:`)

`422 Validation Error`
- campos obrigatorios ausentes
- `amount` menor que minimo
- `phone`/`document` fora do padrao esperado

`404 Not Found`
- `transactionId` invalido ou inexistente

`500 Internal Error`
- indisponibilidade temporaria da API
- implementar retry com backoff no backend

## Checklist de go-live
- credenciais de producao configuradas em segredo seguro
- `postbackUrl` publico com HTTPS valido
- idempotencia de create payment e webhook ativa
- logs por `provider_transaction_id` habilitados
- reconciliacao diaria (`GET /transactions`) validada
