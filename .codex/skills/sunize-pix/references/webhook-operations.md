# Webhook Operations

## Objetivo

Garantir confirmacao de pagamento confiavel sem aprovar compra em falso positivo.

## Contrato minimo esperado

Campos enviados:
- `id` (transaction_id Sunize)
- `external_id`
- `total_amount`
- `status`
- `payment_method`

## Pipeline recomendado

1. Receber webhook em endpoint dedicado.
2. Validar payload e autenticidade conforme mecanismo disponivel pela conta.
3. Persistir evento bruto para auditoria.
4. Confirmar `200` rapidamente.
5. Enfileirar processamento assincrono.
6. Aplicar idempotencia por `transaction_id + status`.
7. Atualizar pedido/transacao local.
8. Publicar eventos internos (ex.: liberacao de acesso, emissao fiscal, notificacoes).

## Idempotencia

Chave recomendada:
- `sunize:{transaction_id}:{status}`

Comportamento:
- se chave ja processada, ignorar reprocessamento e responder sucesso.
- manter TTL suficiente para cobrir retries do provedor.

## Regras de transicao

- `PENDING -> AUTHORIZED`: aprovar compra.
- `PENDING -> FAILED`: encerrar como falha.
- `AUTHORIZED -> CHARGEBACK`: reverter beneficios conforme politica.
- `AUTHORIZED -> IN_DISPUTE`: sinalizar risco e congelar fluxos sensiveis.

Evitar transicoes invalidas sem revisao manual.

## Reconciliacao ativa

Usar `GET /transactions/:transaction_id` quando:
- webhook nao chegar no prazo esperado.
- payload chegar incompleto.
- status local divergir do gateway.

Registrar sempre o motivo da reconciliacao.

## Observabilidade minima

- metricas:
  - total de webhooks recebidos
  - taxa de erro no processamento
  - latencia de confirmacao `PENDING -> AUTHORIZED`
  - divergencias resolvidas por reconciliacao
- alertas:
  - pico de `FAILED`
  - aumento de `IN_DISPUTE` ou `CHARGEBACK`
  - fila de webhook acumulada
