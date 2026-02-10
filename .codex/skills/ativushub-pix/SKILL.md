---
name: ativushub-pix
description: Integrar a API PIX da AtivusHUB em sites, ofertas e checkouts proprios com CashIn, Split, CashOut, Refund, consulta de status e webhooks. Usar quando o usuario pedir implementacao, correcao ou operacao de pagamentos PIX AtivusHUB, incluindo integracao de Pixel (Meta/Google/TikTok) e UTMfy/UTMs.
---

# Skill AtivusHUB PIX

## Papel da skill
Atuar como especialista em AtivusHUB PIX para:
- implementar checkout PIX ponta a ponta
- conectar qualquer frontend a um backend seguro
- integrar webhook com atualizacao de pedido/transacao
- mapear eventos de Pixel e persistir UTM/UTMfy
- depurar erros comuns de API (401, 403, 404, 422)

Nunca inventar campos fora da documentacao enviada pelo usuario.

## Regras obrigatorias
- Chamar a AtivusHUB somente no backend.
- Enviar `Authorization: Basic {API_KEY_BASE64}` e `content-type: application/json`.
- Tratar IP autorizado: erros `403` geralmente indicam allowlist/IP errado.
- Usar webhook como fonte de verdade para confirmacao de pagamento.
- Usar polling de status apenas como fallback.
- Implementar idempotencia por `idtransaction` (webhook pode chegar repetido).
- Registrar logs por `idtransaction` e `externalreference`.

## Endpoints principais
- Criar cobranca PIX (CashIn): `POST https://api.ativushub.com.br/v1/gateway/api/`
- Criar cobranca PIX com split: `POST https://api.ativushub.com.br/v1/gateway/api/split/`
- Consultar status: `GET https://api.ativushub.com.br/s1/getTransaction/api/getTransactionStatus.php?id_transaction={id_transaction}`
- Dados do seller: `GET https://api.ativushub.com.br/s1/getCompany/`
- CashOut: `POST https://api.ativushub.com.br/c1/cashout/api/`
- Refund: `POST https://api.ativushub.com.br/v1/gateway/api/refund/`
- Exemplos de webhook: `GET https://api.ativushub.com.br/s1/getPostBackExamples/`

## Fluxo padrao de implementacao
1. Coletar stack do projeto e decidir integracao:
   - com backend existente: integrar direto nos controllers/rotas.
   - sem backend: criar camada serverless (ex.: API route, worker, function).
2. Configurar segredos:
   - `ATIVUSHUB_API_KEY_BASE64`
   - `ATIVUSHUB_SELLER_ID`
   - `ATIVUSHUB_POSTBACK_URL`
3. Criar endpoint interno `POST /api/pix/create`:
   - validar dados obrigatorios do cliente e itens.
   - incluir `checkout.utm_*` quando disponivel.
   - enviar para AtivusHUB e retornar `idTransaction`, `paymentCode`, `paymentCodeBase64`.
4. Criar endpoint interno `GET /api/pix/status/:idTransaction`:
   - consultar AtivusHUB e retornar status normalizado.
5. Criar endpoint interno `POST /api/pix/webhook`:
   - parsear payload CashIn/CashOut/Refund.
   - atualizar pedido local por `idtransaction`.
   - rejeitar payload invalido com `400`.
6. Frontend checkout:
   - capturar UTMs da URL.
   - enviar pedido para `POST /api/pix/create`.
   - renderizar QR code + copia e cola.
   - exibir estado "aguardando pagamento".
7. Confirmacao:
   - atualizar por webhook.
   - opcional: polling curto ate webhook confirmar.
8. Tracking:
   - `InitiateCheckout` ao abrir checkout.
   - `AddPaymentInfo` quando gerar PIX.
   - `Purchase` somente apos webhook `paid`.

## Payload base CashIn
Usar este formato como minimo seguro:

```json
{
  "amount": 10,
  "id_seller": "seller_12345_abc",
  "customer": {
    "name": "Paulo Queiroz",
    "email": "cliente@email.com",
    "cpf": "02965847521",
    "phone": "(99) 98765-4321",
    "address": {
      "street": "Rua Exemplo",
      "streetNumber": "123",
      "complement": "Apto 1",
      "zipCode": "73070713",
      "neighborhood": "Centro",
      "city": "Brasilia",
      "state": "DF",
      "country": "br"
    }
  },
  "checkout": {
    "utm_source": "facebook",
    "utm_medium": "cpc",
    "utm_campaign": "campanha_x",
    "utm_term": "termo_x",
    "utm_content": "criativo_x"
  },
  "pix": {
    "expiresInDays": 2
  },
  "items": [
    {
      "title": "Produto Exemplo",
      "quantity": 1,
      "unitPrice": 10,
      "tangible": false
    }
  ],
  "postbackUrl": "https://seusite.com/api/pix/webhook",
  "metadata": "order_123",
  "traceable": true
}
```

## Split: regras fixas
- enviar `split` obrigatoriamente no endpoint de split.
- maximo 3 recebedores por transacao.
- soma de `percentage` deve ser menor que 100.
- manter o restante da porcentagem para conta principal.

## Webhook: comportamento obrigatorio
- Aceitar `POST application/json`.
- Diferenciar tipo pelo payload:
  - CashIn: campos `client_name` e `paymentcode`.
  - CashOut: campos `beneficiaryname` e `pixkey`.
- Mapear status (normalizar para lowercase):
  - `paid`, `pending`, `cancelled`, `failed`, `retido`, `med`, `refunded`, `waiting_for_approval`, `approved`, `rejected`.
- Disparar logica de negocio:
  - `paid`: liberar pedido/acesso e disparar `Purchase`.
  - `pending`, `retido`, `med`: manter em analise.
  - `cancelled`, `failed`, `rejected`: marcar como nao pago.
  - `refunded`: marcar como estornado.

## Pixel e UTMfy
Implementar este padrao em qualquer projeto:
1. Capturar UTMs da URL no frontend e persistir em cookie/localStorage.
2. Enviar UTMs no payload `checkout` ao criar cobranca.
3. Salvar UTMs no banco junto com pedido e `idTransaction`.
4. No webhook `paid`, montar evento `Purchase` com valor, moeda, transaction_id e UTMs.
5. Enviar evento para os pixels ativos (Meta CAPI, Google Ads, TikTok) e para UTMfy quando houver endpoint disponivel no projeto.

## Checklist de entrega em tarefas reais
Quando usar esta skill em uma demanda, sempre entregar:
- endpoint backend de criacao de cobranca
- endpoint webhook com idempotencia
- atualizacao de status no pedido local
- captura e persistencia de UTM
- disparo de eventos de pixel nas etapas corretas
- comando de teste (`curl`) para criar cobranca e simular webhook

## Comandos cURL rapidos
Criar cobranca:

```bash
curl -X POST "https://api.ativushub.com.br/v1/gateway/api/" \
  -H "Authorization: Basic SUA_API_KEY_BASE64" \
  -H "content-type: application/json" \
  -d '{ ...payload... }'
```

Consultar status:

```bash
curl -X GET "https://api.ativushub.com.br/s1/getTransaction/api/getTransactionStatus.php?id_transaction=ID_DA_TRANSACAO" \
  -H "Authorization: Basic SUA_API_KEY_BASE64" \
  -H "content-type: application/json"
```
