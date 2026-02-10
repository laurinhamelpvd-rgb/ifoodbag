# Playbooks de Integracao

## Sumario
- Playbook A: API PIX + UTMify
- Playbook B: Checkout proprio (cartao/boleto/paypal)
- Playbook C: SaaS multi-tenant
- Playbook D: Site/LP com checkout externo
- Playbook E: Operacao e observabilidade

## Playbook A: API PIX + UTMify

Aplicar quando o pagamento acontece via gateway PIX (ex.: AtivusHUB).

1. Criar pedido interno
- Gerar `orderId` unico no seu sistema.
- Persistir customer, itens e UTMs.

2. Gerar cobranca PIX no gateway
- Exibir QR Code e copia-e-cola.
- Marcar pedido local como `waiting_payment`.

3. Enviar `waiting_payment` para UTMify
- Fazer `POST /api-credentials/orders` com `status = waiting_payment`.
- Guardar resposta e log de correlacao.

4. Processar webhook de pagamento confirmado
- Validar assinatura/origem do gateway.
- Aplicar idempotencia por `orderId + status`.
- Atualizar pedido local para pago.

5. Enviar `paid` para UTMify
- Reenviar o mesmo `orderId` e `createdAt`.
- Preencher `approvedDate` em UTC.

6. Processar estorno
- Atualizar local para estornado.
- Enviar `status = refunded` e `refundedAt` em UTC.

## Playbook B: Checkout proprio (cartao/boleto/paypal)

Aplicar quando o checkout e o motor de pagamentos estao no proprio backend.

1. No momento da submissao
- Extrair UTMs do checkout.
- Persistir `trackingParameters` e dados de customer.

2. No resultado do pagamento
- Aprovado: `paid`.
- Recusado: `refused`.
- Chargeback: `chargedback`.
- Reembolso: `refunded`.

3. Atualizar UTMify por transicao
- Enviar uma requisicao por mudanca de estado relevante.
- Repetir `orderId`/`createdAt` entre updates.

## Playbook C: SaaS multi-tenant

Aplicar quando uma unica aplicacao envia pedidos de varios vendedores/contas.

1. Segregacao de credenciais
- Salvar `x-api-token` por tenant.
- Criptografar segredos em repouso.

2. Fila assincrona
- Publicar eventos de pedido em fila interna.
- Consumidor envia para UTMify com retry exponencial.

3. Idempotencia e deduplicacao
- Chave recomendada: `tenantId:orderId:status`.
- Bloquear envio repetido por janela de tempo.

4. Observabilidade
- Logar `tenantId`, `orderId`, `status`, `httpStatus`, latencia.
- Criar alerta para taxa de erro > limite.

## Playbook D: Site/LP com checkout externo

Aplicar quando o site apenas origina o trafego e o pagamento ocorre em plataforma externa.

1. Instalar script de UTMs da UTMify na LP
- Carregar script da CDN UTMify para preservar/repassar parametros.

2. Propagar UTMs no link de checkout
- Garantir que `utm_*`, `src`, `sck` cheguem na URL final do checkout.

3. Conectar plataforma de pagamento
- Preferir integracao nativa da plataforma com UTMify quando disponivel.
- Sem integracao nativa: usar webhook da plataforma para chamar `api-credentials/orders`.

4. Validar rastreamento
- Fazer compra de teste com URL rastreada.
- Confirmar aparicao no painel UTMify.

Observacao operacional:
- Quando houver atraso na conexao com plataforma, pedidos antigos podem nao ser importados retroativamente.

## Playbook E: Operacao e observabilidade

Checklist minimo:
- Retry para `408`, `429` e `5xx`.
- Dead-letter para falhas permanentes.
- Dashboards por status (`waiting_payment`, `paid`, `refunded`).
- Endpoint de healthcheck de integracoes externas.

Comando cURL base:

```bash
curl -X POST "https://api.utmify.com.br/api-credentials/orders" \
  -H "Content-Type: application/json" \
  -H "x-api-token: SEU_TOKEN" \
  -d '{ "orderId":"123", "platform":"MyCheckout", "paymentMethod":"pix", "status":"waiting_payment", "createdAt":"2026-02-10 12:00:00", "approvedDate":null, "refundedAt":null, "customer":{"name":"Teste","email":"teste@example.com","phone":null,"document":null}, "products":[{"id":"sku-1","name":"Produto","planId":null,"planName":null,"quantity":1,"priceInCents":1000}], "trackingParameters":{"src":null,"sck":null,"utm_source":"FB","utm_campaign":"campanha","utm_medium":"cpc","utm_content":"criativo","utm_term":"termo"}, "commission":{"totalPriceInCents":1000,"gatewayFeeInCents":100,"userCommissionInCents":900} }'
```
