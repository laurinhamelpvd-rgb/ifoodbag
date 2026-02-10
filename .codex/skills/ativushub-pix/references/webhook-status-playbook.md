# Webhook and Status Playbook

## Objetivo
Usar webhook como fonte de verdade do pagamento e manter estado interno consistente.

## Endpoint interno recomendado
- `POST /api/pix/webhook`
- `Content-Type: application/json`

## Identificar tipo de webhook
- Tratar como CashIn quando existir `client_name` ou `paymentcode`.
- Tratar como CashOut quando existir `beneficiaryname` ou `pixkey`.
- Tratar como Refund quando status/evento sinalizar devolucao.

## Chave de idempotencia
- Usar `idtransaction` como identificador principal.
- Se ausente, usar combinacao `externalreference + status + date`.
- Ignorar webhook repetido ja processado.

## Status suportados
Normalizar para lowercase:
- `paid`
- `pending`
- `cancelled`
- `failed`
- `retido`
- `med`
- `refunded`
- `waiting_for_approval`
- `approved`
- `rejected`

## Regras de negocio sugeridas
- `paid`: liberar pedido e registrar evento de compra.
- `pending`: manter aguardando.
- `retido`, `med`: manter em analise e nao liberar acesso.
- `cancelled`, `failed`, `rejected`: marcar como nao pago.
- `refunded`: marcar como estornado e revogar acesso se aplicavel.
- `waiting_for_approval`, `approved`: usar para cashout/processos manuais.

## Fluxo recomendado (resumo)
1. Receber payload e validar JSON.
2. Extrair `idtransaction`, `externalreference`, `status`.
3. Aplicar lock/idempotencia por `idtransaction`.
4. Atualizar transacao e pedido local.
5. Disparar integracoes secundarias (pixel/UTMfy) quando status final mudar.
6. Responder `200` rapidamente apos persistir.

## Pseudocodigo de idempotencia
```text
if !payload_json:
  return 400

key = payload.idtransaction or (payload.externalreference + ":" + payload.status)
if already_processed(key):
  return 200

begin transaction
  upsert transaction by key
  update order status by normalized status
  mark processed key
commit

enqueue side effects (purchase events, notifications)
return 200
```

## Polling de status (fallback)
Usar somente quando webhook nao chega:
- `GET /s1/getTransaction/api/getTransactionStatus.php?id_transaction={id_transaction}`
- limitar tentativas com timeout curto
- parar polling quando webhook confirmar

## Checklist de qualidade
- validar assinatura/origem quando mecanismo existir no projeto
- logar request id, idtransaction e status
- evitar efeitos colaterais antes da persistencia
- monitorar fila de retry para falhas temporarias
