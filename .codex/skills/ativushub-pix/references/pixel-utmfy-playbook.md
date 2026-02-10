# Pixel and UTMfy Playbook

## Objetivo
Manter atribuicao de campanha consistente entre checkout, pagamento e confirmacao de compra.

## Captura de UTM no frontend
Capturar na primeira visita e persistir em cookie/localStorage:
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_term`
- `utm_content`

Tambem capturar quando disponivel:
- `fbclid`, `gclid`, `ttclid`

## Repassar tracking para a cobranca PIX
Ao chamar `POST /api/pix/create`:
- enviar UTMs no payload `checkout.utm_*`
- salvar os mesmos campos no pedido local
- relacionar tracking com `idTransaction`

## Mapa de eventos (browser/server)
- `InitiateCheckout`: abrir checkout
- `AddPaymentInfo`: gerar cobranca PIX e mostrar QR
- `Purchase`: somente apos webhook `paid`

## Duplicidade de eventos
- gerar `event_id` unico por pedido
- usar o mesmo `event_id` em browser e server (CAPI) para deduplicacao

## Campos minimos para Purchase
- `transaction_id`: `idTransaction` da AtivusHUB
- `value`: valor do pedido pago
- `currency`: `BRL`
- `content_name` ou lista de itens
- campos UTM persistidos

## Integracao com UTMfy
Quando o projeto exigir sincronizacao de pedidos:
- enviar pedido com status inicial `waiting_payment` na criacao do PIX
- atualizar para `paid` no webhook de confirmacao
- atualizar para `refunded` no webhook de estorno
- reutilizar sempre o mesmo identificador do pedido

Para contrato de payload UTMfy, usar a skill `$utmify-integration`.

## Fluxo recomendado
1. Capturar UTMs no frontend.
2. Criar PIX no backend com `checkout.utm_*`.
3. Persistir UTMs + `idTransaction` no banco.
4. Receber webhook e fechar status.
5. Disparar `Purchase` (pixel e/ou CAPI) quando pago.
6. Sincronizar UTMfy quando habilitado no projeto.

## Checklist de QA
- validar persistencia de UTMs no pedido
- validar disparo de `Purchase` somente apos `paid`
- validar ausencia de evento duplicado
- validar consistencia de valor entre gateway, pedido e evento
