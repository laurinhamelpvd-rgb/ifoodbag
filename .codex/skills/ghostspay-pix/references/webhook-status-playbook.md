# Webhook and Status Playbook

## Objetivo
Processar webhook com confiabilidade, sem dupla confirmacao de pedido e sem regressao de status.

## Evento recebido
Estrutura base:
- `id` (id do evento)
- `type` (ex.: `transaction`)
- `objectId` (id da transacao)
- `data` (snapshot da transacao)

Campos mais usados em `data`:
- `id`, `amount`, `paymentMethod`, `status`
- `postbackUrl`, `createdAt`, `updatedAt`, `paidAt`
- `customer`
- `pix` (qrcode, expirationDate, end2EndId)
- `items`
- `refusedReason`

## Status possiveis observados
Lista unificada dos docs recebidos:
- `waiting_payment`
- `pending`
- `paid`
- `refused`
- `canceled`
- `refunded`
- `chargedback`
- `failed`
- `expired`
- `in_analisys`
- `in_protest`

## Mapeamento recomendado para dominio interno
- `pending`: `waiting_payment`, `pending`, `in_analisys`
- `paid`: `paid`
- `failed`: `refused`, `failed`, `expired`, `canceled`
- `refunded`: `refunded`
- `chargeback`: `chargedback`, `in_protest`

## Fluxo de processamento recomendado
1. Receber webhook e persistir payload bruto.
2. Responder HTTP `200` imediatamente (objetivo: <= 5s).
3. Enfileirar processamento assincrono.
4. Validar idempotencia:
- chave primaria: `event.id`
- fallback: hash de `data.id + data.status + data.updatedAt`
5. Aplicar transicao de status com regra monotona.
6. Publicar efeitos secundarios (entrega, notificacao, analytics) apenas apos commit.

## Regra de transicao de status
Bloquear regressao. Exemplo:
- `paid` nao volta para `waiting_payment`
- `refunded` e `chargedback` devem prevalecer sobre `paid`

Prioridade sugerida (maior vence):
1. `chargedback` / `in_protest`
2. `refunded`
3. `paid`
4. `waiting_payment` / `pending` / `in_analisys`
5. `failed` / `refused` / `expired` / `canceled`

Ajustar prioridade conforme regra de negocio do projeto.

## Seguranca do webhook
Como a documentacao recebida nao descreve assinatura HMAC:
- exigir HTTPS
- restringir origem por allowlist/reverse proxy quando possivel
- usar `postbackUrl` com token secreto unico por ambiente
- limitar tamanho do body e aplicar rate limit

## Retry e resiliencia
- Considerar retries ate 3 tentativas (informado na doc recebida).
- Implementar processamento idempotente para suportar duplicidade.
- Se falhar processamento interno, registrar erro e retentar por job.
