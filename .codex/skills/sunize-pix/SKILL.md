---
name: sunize-pix
description: Integrar a API PIX da Sunize em sites, SaaS, ofertas e checkouts proprios com criacao e consulta de transacoes, split, webhooks, reconciliacao de status, retry e hardening de producao. Usar quando o usuario pedir implementacao, correcao, migracao, auditoria ou depuracao de pagamentos PIX Sunize e confirmacao confiavel de compra.
---

# Skill Sunize PIX Integration

## Objetivo

Atuar como especialista em API PIX da Sunize para construir fluxos de pagamento confiaveis ponta a ponta:
- criar e consultar transacoes
- confirmar pagamento via webhook com idempotencia
- tratar split de pagamento
- manter consistencia de status entre gateway, backend e checkout
- operar integracao em arquitetura de site, oferta, checkout proprio e SaaS multi-tenant

Nao inventar campos fora da documentacao fornecida e nao supor headers de assinatura nao documentados.

## Fluxo padrao de implementacao

1. Confirmar o cenario tecnico
- checkout proprio, LP/oferta, SaaS multi-tenant ou API de pedidos.
- definir onde o pagamento sera iniciado e onde o webhook sera recebido.

2. Configurar credenciais e seguranca
- usar `x-api-key` e `x-api-secret` somente no backend.
- isolar credenciais por tenant em SaaS.
- remover segredo de logs, traces e respostas.

3. Implementar criacao de transacao PIX
- chamar `POST /transactions` com `payment_method: "PIX"`.
- validar telefone em E.164 e documento CPF/CNPJ.
- persistir `id` da transacao Sunize e `external_id` interno.

4. Entregar instrucao de pagamento no frontend
- retornar `pix.payload` para copiar e colar ou gerar QR Code no frontend.
- manter pedido interno em estado pendente ate confirmacao.

5. Processar webhook com idempotencia
- tratar notificacao como fonte principal de confirmacao.
- deduplicar por `id` da transacao e `status`.
- responder rapido com `200` e processar assincrono.

6. Reconciliar pagamentos
- usar `GET /transactions/:transaction_id` quando webhook atrasar ou houver divergencia.
- aplicar retry com backoff para falhas transitorias.

7. Encerrar ciclo de pedido
- mapear status Sunize para status interno.
- liberar compra apenas em `AUTHORIZED`.
- registrar trilha de auditoria por `external_id`, `transaction_id`, `status` e timestamp.

## Decisao rapida por cenario

- Site/LP com checkout externo:
  - capturar dados do cliente e criar transacao no backend proprio.
  - renderizar `pix.payload` na pagina.
  - confirmar venda apenas por webhook/consulta.
- Checkout proprio:
  - criar pedido interno primeiro com `external_id` unico.
  - criar transacao Sunize e vincular IDs.
  - atualizar status do pedido no webhook.
- SaaS multi-tenant:
  - armazenar `x-api-key/x-api-secret` por tenant.
  - usar fila para processar webhook e atualizar assinaturas/pedidos.
  - implementar idempotencia por `tenant + transaction_id + status`.
- Ofertas com split:
  - montar `splits[]` com `type` `percentage` ou `fixed`.
  - validar soma de splits conforme regra de negocio antes de enviar.

## Regras obrigatorias

- Base URL fixa: `https://api.sunize.com.br/v1`.
- Headers obrigatorios em toda chamada server-side:
  - `x-api-key`
  - `x-api-secret`
- Nunca expor credenciais no frontend.
- Usar `payment_method: "PIX"` no `POST /transactions`.
- `customer.phone` deve seguir E.164 (ex.: `+5511999999999`).
- `customer.document` deve ser CPF/CNPJ valido conforme `document_type`.
- Usar `external_id` unico e estavel por pedido.
- Tratar webhook como evento principal de status.
- Tratar `AUTHORIZED` como pagamento aprovado.
- Nao marcar pedido como pago em `PENDING`.
- Implementar retry para `5xx`, timeout e erros de rede.
- Implementar reconciliacao ativa por consulta quando necessario.

## Mapeamento minimo de status

- `PENDING`: aguardando pagamento.
- `AUTHORIZED`: pago/aprovado.
- `FAILED`: falha definitiva de pagamento.
- `CHARGEBACK`: estorno/chargeback.
- `IN_DISPUTE`: disputa em andamento.

Sempre normalizar estes estados para o dominio interno do sistema para evitar divergencias de nomenclatura.

## Entregaveis minimos em tarefas reais

- endpoint backend para criar transacao PIX.
- endpoint webhook com idempotencia e processamento assincrono.
- persistencia de `external_id`, `transaction_id` e historico de status.
- log estruturado para auditoria sem segredos.
- comandos de teste (cURL/fetch/axios) para criar, consultar e simular fluxos.
- estrategia de fallback para reconciliacao via `GET /transactions/:transaction_id`.

## Uso combinado com outras skills

- Para rastreamento de conversao com Meta, combinar com `meta-pixel-integration`.
- Para envio de pedidos e tracking UTM, combinar com `utmify-integration`.
- Para outros gateways PIX no mesmo projeto, alinhar mapeamento de status para manter consistencia.

## Referencias deste skill

- Contrato da API Sunize:
  - `references/api-contract.md`
- Playbooks por arquitetura:
  - `references/playbooks.md`
- Operacao de webhook, idempotencia e reconciliacao:
  - `references/webhook-operations.md`
