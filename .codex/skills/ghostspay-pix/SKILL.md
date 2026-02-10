---
name: ghostspay-pix
description: Integrar a API GhostsPay/GhostsPays em sites, SaaS, ofertas e checkouts proprios com PIX, cartao e boleto, incluindo tokenizacao de cartao, listagem/consulta de transacoes, estorno, status de entrega e webhooks. Usar quando o usuario pedir implementacao, manutencao, debug, auditoria ou migracao de pagamentos GhostsPay com foco em confiabilidade de status e confirmacao de compra.
---

# GhostsPay PIX

## Objetivo
Atuar como especialista de integracao GhostsPay para:
- implementar pagamentos PIX/CARD/BOLETO com backend seguro
- conectar checkout, ofertas e SaaS ao ciclo de transacao
- usar webhook como fonte de verdade do pedido
- reduzir falhas de confirmacao, estorno e conciliacao

Nao inventar campos fora da especificacao recebida do usuario.

## Fluxo padrao
1. Mapear arquitetura do projeto.
- identificar stack (site estatico, SPA, SSR, API, monolito, serverless, multi-tenant).
- definir entidade de pedido/transacao e chave de idempotencia.
2. Proteger credenciais e autenticar corretamente.
- usar `SECRET_KEY` e `COMPANY_ID` apenas no backend.
- montar `Authorization: Basic base64(SECRET_KEY:COMPANY_ID)`.
- se a conta retornar `401` com esse formato, validar variacao legada `SECRET_KEY:`.
3. Criar pagamento no backend.
- expor endpoint interno (ex.: `POST /api/payments/create`).
- validar `customer`, `items`, `amount`, `paymentMethod`.
- enviar `postbackUrl` do backend e `metadata` com referencia interna.
4. Exibir instrucao de pagamento no frontend.
- PIX: renderizar `pix.qrcode` e `pix.qrcodeText` quando disponivel.
- manter estado "aguardando pagamento" ate confirmacao real.
5. Processar webhook de mudanca de status.
- responder `200` rapido e processar assincrono.
- aplicar idempotencia por `event.id` e/ou `data.id + status`.
- atualizar pedido local com maquina de status consistente.
6. Tratar operacoes de ciclo de vida.
- listar e consultar transacao (`GET /transactions`, `GET /transactions/{id}`).
- estornar total/parcial quando `paid` (`DELETE /transactions/{id}`).
- atualizar status de entrega (`PUT /transactions/{id}/delivery`) quando aplicavel.
7. Validar ponta a ponta.
- testar criacao, confirmacao por webhook, consulta, estorno e reprocessamento de webhook.
- registrar logs por `transactionId`, `externalRef` e `requestId` interno.

## Escolher referencias por tarefa
- Ler `references/endpoints-and-payloads.md` para contratos da API e exemplos de payload.
- Ler `references/webhook-status-playbook.md` para idempotencia, retries e maquina de status.
- Ler `references/integration-patterns.md` para padroes em site, checkout, oferta e SaaS.
- Ler `references/card-tokenization.md` para fluxo seguro de tokenizacao no frontend.
- Ler `references/testing-and-troubleshooting.md` para `curl`, erros comuns e checklist de go-live.
- Ler `references/sources.md` para origem da especificacao usada neste skill.

## Regras nao negociaveis
- Nunca enviar `Secret Key` e `Company ID` ao cliente/browser.
- Nunca criar pagamento direto do frontend para a API da GhostsPay.
- Sempre usar idempotencia no endpoint interno de criacao e no consumidor de webhook.
- Tratar webhook como fonte principal de status; polling e apenas fallback.
- Normalizar status de transacao para lowercase no dominio interno.
- Nao confirmar compra apenas por retorno imediato do create payment.
- Salvar payload bruto de webhook para auditoria e debugging.

## Entregaveis minimos em tarefas reais
- endpoint interno para criar pagamento (PIX/CARD/BOLETO)
- endpoint interno de webhook com idempotencia
- persistencia de pedido + transacao + historico de status
- fluxo de consulta/listagem para conciliacao
- fluxo de estorno total/parcial
- comandos de teste e checklist de validacao

## Integracao com outras skills
- Usar junto com `$meta-pixel-integration` para eventos de conversao (`InitiateCheckout`, `AddPaymentInfo`, `Purchase` apos confirmacao).
- Usar junto com `$utmify-integration` quando o projeto exigir sincronizacao de pedidos e UTMs com UTMify.
