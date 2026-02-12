---
name: paradise-pix
description: Integrar a API PIX da Paradise em sites, SaaS, ofertas e checkouts proprios com criacao e consulta de transacoes, order bump, split, refund, webhooks, tracking UTM e reconciliacao de status. Usar quando o usuario pedir implementacao, correcao, migracao, auditoria ou debug de pagamentos Paradise com foco em confirmacao confiavel de compra.
---

# Paradise PIX Integration

## Objetivo

Atuar como especialista em integracao da API Paradise para fluxos de pagamento PIX confiaveis ponta a ponta:
- criar transacao com payload valido e rastreavel
- exibir QR Code/copia e cola no checkout
- confirmar compra por webhook com idempotencia
- reconciliar status por consulta quando houver atraso ou divergencia
- operar estorno com seguranca

Nao inventar campos, headers de assinatura ou status fora da documentacao recebida.

## Fluxo padrao de implementacao

1. Mapear o cenario tecnico.
- Identificar se o projeto e site, oferta one-page, checkout proprio ou SaaS multi-tenant.
- Definir entidade de pedido/transacao e chave de correlacao interna.

2. Configurar autenticacao no backend.
- Usar `X-API-Key` em todas as chamadas para `https://multi.paradisepags.com`.
- Nunca expor Secret Key no frontend.
- Isolar segredo por tenant em SaaS.

3. Implementar criacao de transacao.
- Chamar `POST /api/v1/transaction.php`.
- Validar `amount` em centavos e `reference` unico.
- Enviar `productHash` quando necessario.
- Usar `source: "api_externa"` somente quando for intencional ignorar `productHash`.
- Persistir `transaction_id` (id numerico Paradise) e `id` (espelho de `reference`).

4. Entregar instrucao de pagamento ao frontend.
- Expor `qr_code` e/ou `qr_code_base64`.
- Manter pedido em estado pendente ate confirmacao do status final.

5. Processar webhook com resiliencia.
- Receber POST no endpoint do backend.
- Responder `200` rapido.
- Processar assincrono com idempotencia por `transaction_id + status`.
- Aplicar transicao de status sem regressao indevida.

6. Reconciliar quando necessario.
- Consultar `GET /api/v1/query.php?action=get_transaction&id={id}` para divergencias.
- Buscar por referencia com `list_transactions&external_id={reference}` quando for necessario localizar por ID interno.

7. Executar refund de forma segura.
- Chamar `POST /api/v1/refund.php` com `transaction_id`.
- Permitir estorno apenas para transacao aprovada.
- Registrar auditoria de quem solicitou, quando solicitou e retorno da API.

## Decisao rapida por cenario

- Site/LP com checkout simples:
  - Criar endpoint backend para gerar PIX.
  - Mostrar QR/copia e cola.
  - Confirmar venda por webhook ou reconciliacao.

- Checkout proprio:
  - Criar pedido interno primeiro.
  - Gerar `reference` unico por pedido.
  - Vincular `order_id` interno ao `transaction_id` Paradise.

- SaaS multi-tenant:
  - Resolver `X-API-Key` por tenant.
  - Isolar processamento de webhook por tenant.
  - Aplicar idempotencia por `tenant + transaction_id + status`.

- Oferta com order bump e split:
  - Enviar `orderbump` como hash unico ou array de hashes.
  - Enviar `splits[]` com `recipientId` e `amount` em centavos.
  - Validar soma e regra de comissao antes de enviar.

## Regras obrigatorias

- Base URL: `https://multi.paradisepags.com`.
- Header obrigatorio: `X-API-Key`.
- `amount` sempre em centavos.
- `reference` sempre unico por pedido.
- `customer.document` e `customer.phone` apenas numeros.
- `productHash` e obrigatorio, exceto quando `source` for `api_externa`.
- Webhook e fonte principal de confirmacao.
- Considerar pagamento confirmado apenas em `approved`.
- `refund` apenas para transacao `approved`.
- Implementar retry com backoff para timeout, erro de rede e `5xx`.

## Mapeamento minimo de status

- `pending`: cobranca criada e aguardando pagamento.
- `processing`: pagamento em processamento na adquirente.
- `under_review`: em analise manual.
- `approved`: pagamento confirmado.
- `failed`: falha, cancelamento ou expiracao.
- `refunded`: valor estornado.
- `chargeback`: contestacao aberta.

Normalizar para estados internos do sistema antes de aplicar regras de negocio.

## Entregaveis minimos em tarefas reais

- endpoint backend de criacao de transacao PIX
- endpoint backend de webhook com idempotencia
- persistencia de `reference`, `transaction_id`, status e historico
- reconciliacao por consulta de transacao
- fluxo de estorno com trilha de auditoria
- comandos de teste para criar, consultar e estornar

## Escolher referencias por tarefa

- Contrato da API e payloads:
  - `references/api-contract.md`
- Playbooks por arquitetura (site, checkout, SaaS, ofertas):
  - `references/playbooks.md`
- Operacao de webhook, idempotencia e reconciliacao:
  - `references/webhook-operations.md`
- Testes, cURL e troubleshooting:
  - `references/testing-and-troubleshooting.md`
- Fonte da especificacao utilizada:
  - `references/sources.md`

## Uso combinado com outras skills

- Combinar com `meta-pixel-integration` para disparar eventos de conversao (`InitiateCheckout`, `AddPaymentInfo`, `Purchase` apos confirmacao real).
- Combinar com `utmify-integration` quando o projeto exigir sincronizacao de pedido/status com UTMify.
