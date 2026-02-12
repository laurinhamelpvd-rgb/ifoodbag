# Paradise API Contract (PIX)

## Base URL e autenticacao

- Base URL: `https://multi.paradisepags.com`
- Header obrigatorio em todas as chamadas:
  - `X-API-Key: sk_xxx`
- Header recomendado:
  - `Content-Type: application/json`

Usar autenticacao apenas no backend.

## Criar transacao

- Metodo: `POST /api/v1/transaction.php`
- Objetivo: gerar cobranca PIX.
- Metodo de pagamento suportado pela doc recebida: `pix`.

Campos principais do body:
- `amount` (integer, obrigatorio): valor em centavos.
- `description` (string, obrigatorio): nome/produto.
- `reference` (string, obrigatorio): ID unico do sistema interno.
- `customer` (object, obrigatorio): dados do comprador.
- `postback_url` (string, opcional): webhook especifico da transacao.
- `productHash` (string, obrigatorio por padrao): hash do produto no painel.
- `source` (string, opcional): usar `api_externa` para ignorar validacao de `productHash`.
- `orderbump` (string|array, opcional): hash ou lista de hashes de order bump.
- `tracking` (object, opcional): UTMs/src/sck.
- `splits` (array, opcional): divisao de valor para outros recebedores.

`customer`:
- `name` (string, obrigatorio)
- `email` (string, obrigatorio)
- `document` (string, obrigatorio, apenas numeros)
- `phone` (string, obrigatorio, apenas numeros)

`splits[]`:
- `recipientId` (integer, obrigatorio)
- `amount` (integer, obrigatorio, centavos)

Resposta de sucesso (resumo):
- `status` (esperado `success`)
- `transaction_id` (ID numerico interno Paradise)
- `id` (espelho de `reference`)
- `qr_code` (payload copia e cola)
- `qr_code_base64` (imagem base64)
- `amount`
- `acquirer`
- `attempts`
- `expires_at`

Nota importante de IDs:
- A criacao retorna `transaction_id` (interno Paradise) e `id` (seu `reference`).
- Persistir ambos para rastreabilidade.

## Consultar transacao por ID interno

- Metodo: `GET /api/v1/query.php?action=get_transaction&id={id}`
- Objetivo: recuperar snapshot detalhado da transacao.

Campos comuns na resposta:
- `id`
- `external_id` (seu `reference`)
- `status`
- `amount`
- `created_at`, `updated_at`
- `customer_data`
- `attempts_data`
- `amount_in_reais`

## Consultar transacao por referencia (external_id)

- Metodo: `GET /api/v1/query.php?action=list_transactions&external_id={reference}`
- Objetivo: localizar transacao(s) pelo `reference`.
- Retorno: array, mesmo para 1 resultado.

## Consultar dados do vendedor

- Metodo: `GET /api/v1/seller.php`
- Objetivo: obter dados publicos da conta associada ao `X-API-Key`.

Campos comuns:
- `name`
- `company_name`
- `document`
- `email`
- `entity_type`

## Solicitar reembolso

- Metodo: `POST /api/v1/refund.php`
- Body:
  - `transaction_id` (integer, obrigatorio)

Resposta de sucesso:
- `success: true`
- `message`

Erros comuns documentados:
- `404` com `"Permissao negada."` para transacao inexistente ou nao pertencente a loja.
- `422` com `"Apenas transacoes aprovadas podem ser reembolsadas."`.

## Webhook (postback)

A API envia POST para o endpoint cadastrado quando o status muda.

Campos observados no payload:
- `transaction_id`
- `external_id`
- `status`
- `amount`
- `payment_method`
- `customer`
- `pix_code`
- `raw_status`
- `webhook_type`
- `timestamp`
- `tracking` (quando enviado na criacao)

Status possiveis:
- `pending`
- `approved`
- `processing`
- `under_review`
- `failed`
- `refunded`
- `chargeback`

## Codigos de erro

- `200 OK`: sucesso
- `400 Bad Request`: payload invalido ou faltando campo
- `401 Unauthorized`: API key ausente/invalida/conta inativa
- `404 Not Found`: recurso inexistente
- `500 Internal Server Error`: erro no provedor

Obs: a documentacao tambem mostra `422` para regra de refund.
