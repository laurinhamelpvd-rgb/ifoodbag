# Testing and Troubleshooting

## Pre-requisitos

- Definir `PARADISE_API_KEY`.
- Definir `BASE_URL=https://multi.paradisepags.com`.
- Usar ambiente seguro para testar.

Exemplo PowerShell:

```powershell
$env:PARADISE_API_KEY="sk_sua_chave"
$env:BASE_URL="https://multi.paradisepags.com"
```

## cURL de criacao de transacao

```bash
curl --location "$BASE_URL/api/v1/transaction.php" \
  --header "X-API-Key: $PARADISE_API_KEY" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "amount": 1000,
    "description": "Produto Teste",
    "reference": "PED-10001",
    "customer": {
      "name": "Joao da Silva",
      "email": "joao@example.com",
      "phone": "11999999999",
      "document": "05531510101"
    },
    "tracking": {
      "utm_source": "facebook",
      "utm_campaign": "campanha_teste",
      "utm_medium": "cpc",
      "utm_content": "criativo_1",
      "utm_term": "feed",
      "src": "src_test",
      "sck": "sck_test"
    }
  }'
```

## cURL de consulta por ID interno

```bash
curl --location "$BASE_URL/api/v1/query.php?action=get_transaction&id=158" \
  --header "X-API-Key: $PARADISE_API_KEY"
```

## cURL de consulta por referencia

```bash
curl --location "$BASE_URL/api/v1/query.php?action=list_transactions&external_id=PED-10001" \
  --header "X-API-Key: $PARADISE_API_KEY"
```

## cURL para seller

```bash
curl --location "$BASE_URL/api/v1/seller.php" \
  --header "X-API-Key: $PARADISE_API_KEY"
```

## cURL de refund

```bash
curl --location --request POST "$BASE_URL/api/v1/refund.php" \
  --header "X-API-Key: $PARADISE_API_KEY" \
  --header "Content-Type: application/json" \
  --data-raw '{
    "transaction_id": 158
  }'
```

## Checklist de validacao ponta a ponta

1. Criar transacao e verificar retorno de `transaction_id`.
2. Exibir QR/copia e cola no frontend.
3. Confirmar recebimento de webhook `pending`.
4. Realizar pagamento real/sandbox e confirmar webhook `approved`.
5. Validar atualizacao do pedido interno para pago.
6. Consultar transacao e comparar status interno vs provider.
7. Testar reenvio do mesmo webhook para garantir idempotencia.
8. Executar refund em transacao aprovada e validar webhook/status final.

## Erros comuns e acoes

`400 Bad Request`
- Causa: JSON invalido, campo obrigatorio ausente, tipo incorreto.
- Acao: validar schema antes de enviar e logar payload sanitizado.

`401 Unauthorized`
- Causa: `X-API-Key` ausente/invalida ou conta inativa.
- Acao: validar credencial, ambiente e estado da conta no painel.

`404 Not Found`
- Causa: endpoint incorreto ou transacao sem permissao/nao encontrada.
- Acao: revisar URL e `transaction_id` usado.

`422 Unprocessable Entity` (refund)
- Causa: tentativa de estorno em status diferente de `approved`.
- Acao: consultar status antes do refund.

`500 Internal Server Error`
- Causa: erro no provedor.
- Acao: aplicar retry com backoff e registrar tentativa para reconciliacao.

## Checklist de go-live

1. Confirmar webhook de producao com HTTPS e token secreto na URL.
2. Confirmar mascaramento de segredo e dados sensiveis em logs.
3. Confirmar idempotencia ativa no webhook.
4. Confirmar job de reconciliacao para pendencias.
5. Confirmar alertas de falha e chargeback.
