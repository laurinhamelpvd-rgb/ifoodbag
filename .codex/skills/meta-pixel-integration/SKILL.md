---
name: meta-pixel-integration
description: Implementar Meta Pixel (Facebook Pixel) em ofertas, landing pages, sites, SaaS e checkouts com eventos padrao, eventos customizados, parametros, multiplos pixels, SPA e validacao no Events Manager. Usar quando o usuario pedir implementacao, correcao, migracao, auditoria ou debug de rastreamento de conversao com Pixel Meta.
---

# Meta Pixel Integration

## Objetivo

Atuar como especialista em implementacao de Meta Pixel para medir funil, conversao e audiencias.

Garantir rastreamento confiavel no browser sem inventar eventos ou parametros fora da especificacao fornecida.

## Fluxo padrao

1. Mapear arquitetura e funil.
- Identificar stack (site estatico, SSR, SPA, checkout proprio, SaaS multi-tenant).
- Mapear etapas reais do funil para eventos (ex.: `ViewContent` -> `InitiateCheckout` -> `Purchase`).
2. Instalar base code corretamente.
- Inserir o Meta Pixel base code entre `<head></head>` em todas as paginas rastreadas.
- Manter `fbq('track', 'PageView')` ativo.
3. Implementar eventos por contexto.
- Pagina: disparar no carregamento quando o evento e de page hit.
- Interacao: disparar no clique/submit quando o evento depende de acao do usuario.
- Checkout: disparar `Purchase` apenas em confirmacao real de pagamento.
4. Enviar parametros obrigatorios e consistentes.
- Para `Purchase`, enviar `value` numerico e `currency` ISO 4217.
- Para catalogo/collaborative ads, enviar `contents` ou `content_ids` com IDs compativeis com catalogo.
5. Tratar cenarios avancados.
- SPA: integrar eventos no roteador/history changes.
- Multiplos pixels: usar `trackSingle` e `trackSingleCustom` para evitar disparo cruzado.
- CAPI (quando houver backend): reutilizar `event_id` para deduplicacao browser/server.
6. Validar e monitorar.
- Validar com Meta Pixel Helper e Events Manager.
- Conferir deduplicacao, nomes de eventos, tipos de parametro e moeda/valor.

## Decisao rapida por cenario

- Oferta/landing page:
  - base code em todo o site
  - `PageView`, `ViewContent`, `Lead` (se captacao), `Purchase` (se checkout na propria pagina)
- Checkout proprio:
  - `InitiateCheckout` ao iniciar checkout
  - `AddPaymentInfo` ao salvar/selecionar pagamento
  - `Purchase` apenas na confirmacao
- SaaS:
  - `CompleteRegistration`, `StartTrial`, `Subscribe` ou `Purchase` conforme modelo de negocio
  - padronizar taxonomia de eventos entre tenants
- E-commerce/catalogo:
  - `ViewContent`, `AddToCart`, `Purchase`
  - garantir `content_ids`/`contents` casando com IDs do catalogo
- SPA:
  - disparar eventos em mudanca de rota e acoes, nao depender de reload completo

## Regras nao negociaveis

- Nao expor logica sensivel de negocio em eventos client-side alem do necessario.
- Nao disparar `Purchase` antes da confirmacao efetiva da compra.
- Nao enviar `value` como string formatada com virgula (ex.: `"5000,00"`).
- Nao usar simbolo de moeda; usar codigo ISO (ex.: `USD`, `BRL`).
- Nao usar `content_type` invalido para catalogo/collaborative ads (usar `product` quando aplicavel).
- Nao usar nomes de eventos customizados com mais de 50 caracteres.
- Evitar nomes/regras de conversao personalizada que sugiram dados sensiveis nao permitidos.
- Em multiplos pixels, evitar `track` generico para eventos seletivos; preferir `trackSingle`/`trackSingleCustom`.

## Escolher referencias por tarefa

- Ler `references/event-playbook.md` para matriz de eventos por funil e payloads recomendados.
- Ler `references/implementation-patterns.md` para snippets (base code, clique, SPA, multiplos pixels, advanced matching).
- Ler `references/validation-compliance.md` para checklist de validacao, AEM, consentimento e CSP.

## Entregaveis minimos em tarefas reais

- Instalacao do base code no local correto.
- Mapeamento de eventos por etapa do funil.
- Implementacao de eventos com parametros obrigatorios.
- Ajustes de SPA/multiplos pixels quando necessario.
- Checklist de validacao no Pixel Helper e Events Manager.

## Referencias deste skill

- `references/event-playbook.md`
- `references/implementation-patterns.md`
- `references/validation-compliance.md`
