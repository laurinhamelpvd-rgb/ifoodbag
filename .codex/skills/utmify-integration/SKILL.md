---
name: utmify-integration
description: Integrar UTMify/UTMfy em API de pedidos, checkout proprio, API PIX, SaaS multi-tenant e sites com tracking de UTMs, status de pagamento, comissao e webhooks. Usar quando o usuario pedir implementacao, correcao, migracao ou depuracao de envio para https://api.utmify.com.br/api-credentials/orders e sincronizacao com Meta Pixel/CAPI.
---

# Skill UTMify Integration

## Objetivo

Atuar como especialista de integracao UTMify para rastrear pedidos de ponta a ponta:
- capturar UTMs e parametros de tracking no checkout
- enviar e atualizar pedidos pela API de credenciais
- sincronizar eventos de venda com Meta Pixel (browser + server)
- manter consistencia entre fluxo de pagamento (PIX/cartao) e status no dashboard UTMify

Nao inventar campos fora da documentacao oficial ou da especificacao fornecida pelo usuario.

## Fluxo de trabalho padrao

1. Definir cenario de integracao
- API propria (SaaS/backend): enviar pedido direto para `POST /api-credentials/orders`.
- Checkout proprio + gateway/PIX: enviar no evento de criacao (`waiting_payment`) e atualizar em webhook (`paid`, `refunded` etc.).
- Site/LP sem backend de pagamento: instalar scripts UTMify e repassar UTMs ao checkout/plataforma.

2. Configurar credenciais e seguranca
- Criar credencial em UTMify (`Integracoes > Webhooks > Credenciais de API`).
- Guardar token no backend (`x-api-token`), nunca expor no frontend.
- Isolar token por tenant/conta em sistemas SaaS.

3. Modelar pedido com contrato correto
- Montar payload com `orderId`, `platform`, `paymentMethod`, `status`, datas UTC e objetos aninhados.
- Reutilizar sempre o mesmo `orderId` e `createdAt` ao atualizar status do mesmo pedido.
- Preencher campos ausentes de tracking com `null` (nao string vazia).

4. Garantir consistencia de estados
- Iniciar com `waiting_payment` quando houver pagamento pendente.
- Atualizar para `paid` ao confirmar pagamento.
- Atualizar para `refunded`, `chargedback` ou `refused` quando aplicavel.
- Tratar webhook como fonte de verdade.

5. Integrar Pixel Meta junto com UTMify
- Disparar eventos browser (`InitiateCheckout`, `AddPaymentInfo`, `Purchase`) nas etapas corretas.
- Disparar CAPI server-side no backend para maior confiabilidade.
- Usar `event_id` igual entre browser e server para deduplicacao (inferencia de boas praticas Meta).

6. Validar e monitorar
- Rodar testes com payload de exemplo (modo teste quando necessario).
- Implementar retry para erros transitorios (`408`, `429`, `5xx`).
- Registrar logs por `orderId`, `status`, `tenant` e resposta da UTMify.

## Decisao rapida por cenario

- API PIX (AtivusHUB, etc.):
  - enviar `waiting_payment` ao gerar PIX
  - enviar `paid` no webhook de confirmacao
  - enviar `refunded` no webhook de estorno
- Checkout proprio cartao:
  - enviar `paid` quando captura aprovada
  - enviar `refused` em falha definitiva
  - enviar `chargedback` quando houver disputa
- SaaS multi-tenant:
  - mapear `x-api-token` por tenant
  - enfileirar envio assincrono com idempotencia por `tenant + orderId + status`
- Site/LP:
  - carregar scripts UTMify para UTMs
  - repassar parametros ao checkout
  - fazer envio de pedidos pela plataforma de pagamento ou backend proprio

## Regras obrigatorias

- Enviar datas no formato `YYYY-MM-DD HH:MM:SS` em UTC.
- Manter `approvedDate` como `null` ate pagamento confirmado.
- Manter `refundedAt` como `null` ate estorno confirmado.
- Enviar todos os campos de `trackingParameters`; usar `null` quando ausentes.
- Evitar `userCommissionInCents = 0` sem justificativa real.
- Nao enviar token UTMify em JavaScript client-side.
- Nao tratar polling de status como fonte principal se houver webhook.

## Entregaveis minimos em tarefas reais

- Endpoint/servico para envio `POST /api-credentials/orders`.
- Mapeamento de status de pagamento para status UTMify.
- Persistencia de `orderId`, UTMs e timestamps UTC.
- Integracao de webhook com idempotencia.
- Integracao de Pixel Meta (browser + CAPI server-side).
- Comandos cURL de teste para os principais estados.

## Referencias deste skill

- Contrato da API de pedidos:
  - `references/api-orders.md`
- Playbooks por arquitetura (PIX, checkout, SaaS e site):
  - `references/playbooks.md`
- Integracao Meta Pixel + CAPI:
  - `references/meta-pixel.md`
- Fontes externas e links oficiais:
  - `references/sources.md`

Ao trabalhar em projeto com AtivusHUB PIX, combinar este skill com `ativushub-pix` para cobrir gateway + tracking de vendas sem duplicar regras.
