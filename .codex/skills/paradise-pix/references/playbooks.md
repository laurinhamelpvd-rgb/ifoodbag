# Playbooks de Integracao

## 1) Checkout proprio (backend + frontend)

Fluxo recomendado:
1. Criar pedido interno com status `pending`.
2. Gerar `reference` unico por pedido.
3. Chamar `POST /api/v1/transaction.php`.
4. Persistir `transaction_id`, `id` (reference espelhado), `status` e `expires_at`.
5. Exibir `qr_code`/`qr_code_base64` no frontend.
6. Confirmar pedido como pago apenas com webhook `approved`.
7. Reconciliar por consulta quando webhook atrasar ou divergir.

Boas praticas:
- timeout de cliente HTTP (ex.: 8-15s).
- retry com backoff apenas para falhas transitorias.
- logs com correlacao: `order_id`, `reference`, `transaction_id`.

## 2) Site/LP/oferta one-page

Fluxo recomendado:
1. Capturar dados do comprador no frontend.
2. Enviar para endpoint backend `/api/payments/paradise/create`.
3. Validar `amount`, `customer` e formato de documento/telefone.
4. Criar transacao e retornar somente dados necessarios para UI.
5. Mostrar tela "aguardando pagamento".
6. Mudar para "aprovado" somente apos webhook/consulta confirmar `approved`.

Riscos comuns:
- aprovar compra no retorno imediato da criacao.
- nao armazenar `transaction_id`.
- perder webhook sem fila/reprocessamento.

## 3) SaaS multi-tenant

Fluxo recomendado:
1. Guardar `X-API-Key` por tenant com criptografia.
2. Resolver credencial por contexto do pedido.
3. Persistir idempotencia por `tenant + reference`.
4. Isolar webhook por tenant (token na URL ou metadata interna).
5. Aplicar trilha de auditoria por tenant.

Hardening minimo:
- rotacao de credenciais.
- mascaramento de dados sensiveis.
- dead-letter queue para falhas persistentes.

## 4) Order bump e split

Order bump:
- Enviar `orderbump` com hash unico ou array de hashes.
- Validar que hashes existem no contexto do produto.

Split:
- Enviar `splits[]` quando houver divisao real.
- Cada item deve ter `recipientId` e `amount`.
- Validar soma dos splits antes de enviar:
  - nao ultrapassar valor da transacao
  - respeitar regras de comissao do negocio

Observacao:
- A taxa da plataforma e descontada da conta principal conforme doc recebida.

## 5) Tracking UTM

Quando houver requisito de atribuicao:
- Capturar `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `src`, `sck`.
- Enviar em `tracking` na criacao da transacao.
- Persistir no pedido para reconciliacao de marketing.

Integracoes relacionadas:
- usar `utmify-integration` para sincronizar pedidos/status quando exigido.
- usar `meta-pixel-integration` para eventos de conversao.

## 6) Modelo de dados minimo recomendado

Tabela `orders`:
- `id`
- `tenant_id` (se SaaS)
- `reference` (unico)
- `status`
- `amount_cents`
- `customer_name`, `customer_email`, `customer_document`, `customer_phone`
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `src`, `sck`
- `created_at`, `updated_at`

Tabela `payment_transactions`:
- `id`
- `provider` (`paradise`)
- `order_id`
- `provider_transaction_id` (`transaction_id`)
- `provider_external_id` (`id`/`external_id`)
- `status_raw`
- `status_normalized`
- `qr_code`
- `qr_code_base64`
- `expires_at`
- `created_at`, `updated_at`

Tabela `webhook_events`:
- `id` (interno)
- `provider`
- `provider_transaction_id`
- `provider_external_id`
- `status`
- `payload_json`
- `processed_at`
- `processing_status`
