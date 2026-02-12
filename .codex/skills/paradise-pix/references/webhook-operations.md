# Webhook Operations

## Objetivo

Processar mudancas de status com confiabilidade sem aprovar compra em falso positivo.

## Contrato minimo esperado

Campos comuns no payload:
- `transaction_id`
- `external_id`
- `status`
- `amount`
- `payment_method`
- `timestamp`
- `customer` (quando enviado pelo provedor)
- `tracking` (quando enviado na criacao)

## Pipeline recomendado

1. Receber webhook em endpoint dedicado.
2. Validar payload minimo (`transaction_id`, `status`).
3. Persistir payload bruto para auditoria.
4. Responder HTTP `200` rapidamente.
5. Enfileirar processamento assincrono.
6. Aplicar idempotencia antes de atualizar pedido.
7. Atualizar transacao/pedido conforme regra de transicao.
8. Publicar efeitos secundarios apos commit (acesso, notificacoes, analytics).

## Idempotencia

Chave recomendada:
- `paradise:{transaction_id}:{status}`

Fallback quando necessario:
- incluir `timestamp` no hash de deduplicacao para diagnostico.

Comportamento:
- se evento ja processado, nao repetir efeitos colaterais.
- registrar tentativa duplicada como sucesso idempotente.

## Regras de transicao de status

Status da doc:
- `pending`
- `processing`
- `under_review`
- `approved`
- `failed`
- `refunded`
- `chargeback`

Regra recomendada:
- liberar pedido somente em `approved`.
- impedir regressao de estados finais (`refunded`, `chargeback`) para `approved`.
- manter historico completo de transicoes.

Prioridade sugerida (maior vence em caso de conflito):
1. `chargeback`
2. `refunded`
3. `approved`
4. `processing` / `under_review`
5. `pending`
6. `failed`

Ajustar prioridade conforme regra de negocio local.

## Seguranca de webhook

Como a doc recebida nao detalha assinatura HMAC:
- exigir HTTPS.
- usar URL com token secreto por ambiente.
- aplicar allowlist/reverse proxy quando possivel.
- limitar tamanho de body e aplicar rate limit.

Nao assumir header de assinatura nao documentado.

## Reconciliacao ativa

Consultar API quando:
- webhook nao chegar dentro do SLA definido.
- payload vier incompleto/inconsistente.
- status local divergir do gateway.

Endpoint de reconciliacao:
- `GET /api/v1/query.php?action=get_transaction&id={transaction_id}`

## Observabilidade minima

Metricas:
- volume de webhook recebido
- latencia de processamento
- tempo de confirmacao `pending -> approved`
- taxa de erro por status
- divergencias resolvidas por reconciliacao

Alertas:
- crescimento anormal de `failed`
- pico de `chargeback`
- fila de webhook acumulada
