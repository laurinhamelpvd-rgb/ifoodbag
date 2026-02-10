# Integration Patterns

## Cenarios alvo
Aplicar este playbook para:
- sites com checkout proprio
- landing pages e ofertas one-page
- SaaS multi-tenant com billing interno
- API-first (frontend separado do backend)

## Arquitetura minima recomendada
Componentes:
- frontend (captura dados do cliente e mostra instrucoes de pagamento)
- backend interno (orquestra GhostsPay)
- banco (pedido, transacao, historico, idempotencia)
- worker/fila (processamento de webhook e tarefas de reconciliacao)

Nunca chamar GhostsPay direto do browser.

## Endpoints internos sugeridos
- `POST /api/payments/create`
- `POST /api/payments/webhook/ghostspay`
- `GET /api/payments/:transactionId`
- `POST /api/payments/:transactionId/refund`
- `POST /api/payments/:transactionId/delivery-status`

## Modelo de dados minimo
Tabela `orders`:
- `id`
- `tenant_id` (se SaaS)
- `customer_id`
- `amount`
- `currency`
- `status`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
- `created_at`, `updated_at`

Tabela `payment_transactions`:
- `id` (interno)
- `provider` (`ghostspay`)
- `provider_transaction_id`
- `order_id`
- `payment_method`
- `status_raw`
- `status_normalized`
- `amount`
- `pix_qrcode_url`
- `pix_qrcode_text`
- `paid_at`
- `refunded_amount`
- `metadata_json`
- `created_at`, `updated_at`

Tabela `webhook_events`:
- `id` (evento provider, unico)
- `provider`
- `provider_object_id`
- `payload_json`
- `processed_at`
- `processing_status`

## Fluxo de checkout PIX
1. Capturar dados do cliente e itens.
2. Criar pedido local com status inicial.
3. Chamar `POST /transactions` no backend.
4. Persistir `transactionId` e status retornado.
5. Exibir QR code + copia e cola no frontend.
6. Confirmar compra apenas no webhook `paid`.

## Fluxo de oferta/upsell
1. Reaproveitar cliente/pedido pai.
2. Criar nova transacao para oferta.
3. Associar `metadata.parentOrderId` e `metadata.offerId`.
4. Tratar confirmacao por webhook da oferta separadamente.

## Fluxo SaaS multi-tenant
1. Resolver credencial por tenant (nunca hardcode).
2. Aplicar isolamento por `tenant_id`.
3. Registrar reconciliacao por tenant.
4. Processar webhook com resolucao de tenant via metadata/postback token.

## Tracking de conversao (quando aplicavel)
- Disparar `InitiateCheckout` ao entrar no checkout.
- Disparar `AddPaymentInfo` ao gerar cobranca.
- Disparar `Purchase` somente apos webhook `paid`.

Para detalhes de pixel e UTMify, combinar este skill com:
- `$meta-pixel-integration`
- `$utmify-integration`
