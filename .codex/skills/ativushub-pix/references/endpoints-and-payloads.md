# Endpoints and Payloads (AtivusHUB PIX)

## Autenticacao
- Header obrigatorio: `Authorization: Basic {API_KEY_BASE64}`
- Header obrigatorio: `content-type: application/json`
- Enviar API key apenas no backend.

## Endpoints principais
- CashIn: `POST https://api.ativushub.com.br/v1/gateway/api/`
- Split: `POST https://api.ativushub.com.br/v1/gateway/api/split/`
- Status: `GET https://api.ativushub.com.br/s1/getTransaction/api/getTransactionStatus.php?id_transaction={id_transaction}`
- Seller: `GET https://api.ativushub.com.br/s1/getCompany/`
- CashOut: `POST https://api.ativushub.com.br/c1/cashout/api/`
- Refund: `POST https://api.ativushub.com.br/v1/gateway/api/refund/`
- Webhook examples: `GET https://api.ativushub.com.br/s1/getPostBackExamples/`

## CashIn payload minimo
```json
{
  "amount": 10,
  "id_seller": "seller_123",
  "customer": {
    "name": "Cliente Exemplo",
    "email": "cliente@email.com",
    "cpf": "02965847521",
    "phone": "(11) 99999-9999",
    "address": {
      "street": "Rua Exemplo",
      "streetNumber": "100",
      "complement": "Apto 12",
      "zipCode": "01001000",
      "neighborhood": "Centro",
      "city": "Sao Paulo",
      "state": "SP",
      "country": "br"
    }
  },
  "items": [
    {
      "title": "Produto Exemplo",
      "quantity": 1,
      "unitPrice": 10,
      "tangible": false
    }
  ],
  "postbackUrl": "https://seusite.com/api/pix/webhook"
}
```

## CashIn com tracking de UTM
Adicionar objeto `checkout` no payload:
```json
{
  "checkout": {
    "utm_source": "facebook",
    "utm_medium": "cpc",
    "utm_campaign": "campanha_x",
    "utm_term": "termo_x",
    "utm_content": "criativo_x"
  }
}
```

## Split payload minimo
```json
{
  "amount": 10,
  "id_seller": "seller_123",
  "customer": {
    "name": "Cliente Exemplo",
    "email": "cliente@email.com",
    "cpf": "02965847521"
  },
  "split": [
    { "user_id": "recebedor1", "percentage": 50 },
    { "user_id": "recebedor2", "percentage": 25 }
  ],
  "postbackUrl": "https://seusite.com/api/pix/webhook"
}
```

Regras de split:
- permitir no maximo 3 recebedores
- garantir soma das porcentagens menor que 100

## CashOut payload minimo
```json
{
  "amount": 5.57,
  "pixKey": "56265478451",
  "pixType": "CPF",
  "beneficiaryName": "Claudio Barbosa Rios",
  "beneficiaryDocument": "56265478451",
  "description": "Saque",
  "postbackUrl": "https://seusite.com/api/pix/webhook"
}
```

## Refund payload minimo
```json
{
  "id": 3125413,
  "external_reference": "e65JzaGhjhyVQDK7TFHENKdasrn5BWO7O"
}
```

## Erros para mapear no backend
- `401`: API key ausente/invalida
- `403`: IP nao autorizado (ou campos obrigatorios em alguns endpoints)
- `404`: transacao nao encontrada
- `422`: dados invalidos/campos faltando

## Campos importantes na resposta de criacao PIX
- `status` / `status_transaction`
- `idTransaction`
- `paymentCode`
- `paymentCodeBase64`
- `urlWebHook`

## cURL de smoke test
Criar cobranca:
```bash
curl -X POST "https://api.ativushub.com.br/v1/gateway/api/" \
  -H "Authorization: Basic SUA_API_KEY_BASE64" \
  -H "content-type: application/json" \
  -d '{ ...payload... }'
```

Consultar status:
```bash
curl -X GET "https://api.ativushub.com.br/s1/getTransaction/api/getTransactionStatus.php?id_transaction=ID_TRANSACAO" \
  -H "Authorization: Basic SUA_API_KEY_BASE64" \
  -H "content-type: application/json"
```
