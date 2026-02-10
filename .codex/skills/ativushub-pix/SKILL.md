---
name: ativushub-pix
description: Integrar a API PIX da AtivusHUB em checkout proprio, ofertas e sites com CashIn, Split, CashOut, Refund, consulta de status e webhooks. Usar quando o usuario pedir implementacao, manutencao, debug ou migracao de pagamentos PIX AtivusHUB com Pixel (Meta/Google/TikTok) e UTMfy/UTMs.
---

# AtivusHUB PIX

## Objetivo
Atuar como especialista de integracao AtivusHUB PIX para:
- implementar cobranca PIX em checkout proprio
- processar split, cashout, refund e consulta de status
- tratar webhook como fonte de verdade do pedido
- integrar tracking de campanhas com Pixel e UTMfy

Nao inventar campos fora da especificacao fornecida pelo usuario.

## Fluxo padrao
1. Mapear a arquitetura do projeto.
- identificar backend existente, serverless ou necessidade de criar API interna.
- definir onde salvar pedido, transacao, status e UTMs.
2. Configurar segredos no backend.
- usar `ATIVUSHUB_API_KEY_BASE64` apenas no servidor.
- configurar `ATIVUSHUB_SELLER_ID` e `ATIVUSHUB_POSTBACK_URL`.
3. Implementar criacao de cobranca.
- expor endpoint interno (ex.: `POST /api/pix/create`).
- validar campos obrigatorios antes de chamar AtivusHUB.
- incluir UTMs em `checkout.utm_*` quando disponivel.
4. Implementar webhook de confirmacao.
- expor endpoint interno (ex.: `POST /api/pix/webhook`).
- aplicar idempotencia por `idtransaction`.
- atualizar pedido local por status recebido.
5. Integrar frontend de checkout.
- capturar UTMs da URL.
- exibir QR code e copia-e-cola retornados pela API.
- mostrar estado "aguardando pagamento" ate confirmacao.
6. Integrar tracking de conversao.
- disparar `InitiateCheckout` ao abrir checkout.
- disparar `AddPaymentInfo` ao gerar PIX.
- disparar `Purchase` somente apos webhook de pagamento confirmado.

## Escolher referencias por tarefa
- Ler `references/endpoints-and-payloads.md` para contratos da API, exemplos de payload e erros.
- Ler `references/webhook-status-playbook.md` para idempotencia, maquina de status e fluxo de confirmacao.
- Ler `references/pixel-utmfy-playbook.md` para captura de UTM, eventos de pixel e envio para UTMfy.
- Ler `references/sources.md` para links e endpoints oficiais usados no skill.

## Regras nao negociaveis
- Chamar AtivusHUB somente no backend.
- Enviar headers `Authorization: Basic {API_KEY_BASE64}` e `content-type: application/json`.
- Tratar `403` como problema de IP nao autorizado/allowlist.
- Tratar webhook como fonte principal de status; usar polling apenas como fallback.
- Normalizar status para lowercase no dominio interno.
- Registrar logs por `idtransaction` e `externalreference`.
- Proteger contra webhook duplicado com idempotencia.

## Entregaveis minimos
- endpoint interno para criar cobranca PIX
- endpoint interno de webhook com idempotencia
- atualizacao de status do pedido local
- captura e persistencia de UTM
- disparo correto de eventos de pixel
- comandos de teste (`curl`) para criacao e consulta

## Integracao com outras skills
- Usar junto com `$utmify-integration` quando o projeto exigir sincronizacao completa de pedidos na UTMfy.
