# Validation And Compliance

## Checklist de validacao tecnica

1. Conferir se o base code esta no `<head>` de todas as paginas rastreadas.
2. Validar disparos com Meta Pixel Helper no navegador.
3. Confirmar chegada dos eventos no Events Manager.
4. Garantir que `Purchase` tenha `value` numerico e `currency` valida.
5. Garantir que `content_ids`/`contents` batem com IDs de catalogo (quando aplicavel).
6. Em multiplos pixels, confirmar ausencia de overfiring usando `trackSingle`.
7. Em SPA, validar eventos em trocas de rota e nao apenas em reload.

## Erros comuns

- `value` como string com virgula: `"5000,00"`.
- `currency` como simbolo: `"$"` em vez de `USD`/`BRL`.
- `content_ids` fora de array: `'SKU1,SKU2'` em vez de `['SKU1', 'SKU2']`.
- `contents` sem `quantity`.
- `Purchase` disparado no clique de botao antes de pagamento confirmado.

## Politicas e privacidade

- Configurar consentimento conforme jurisdicao (ex.: GDPR/CCPA/LGPD quando aplicavel).
- Definir CSP para permitir scripts de `https://connect.facebook.net`.
- Revisar prioridade de eventos para AEM (iOS 14.5+), com limite de eventos configurados por dominio/app.

## Conversoes personalizadas sinalizadas

A partir de 2 de setembro de 2025, conversoes personalizadas com indicios de informacoes sensiveis podem ser sinalizadas como indisponiveis.

Impacto pratico:
- campanhas novas nao poderao usar conversoes sinalizadas.
- campanhas ativas podem exigir duplicacao com outra conversao valida.
- pela API, conversoes sinalizadas podem retornar `is_unavailable = true`.
