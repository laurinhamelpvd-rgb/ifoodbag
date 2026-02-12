# Sources

## Fonte usada para este skill

- Documentacao textual da API Paradise fornecida pelo usuario nesta sessao.

Cobertura da fonte:
- guia de inicio rapido
- autenticacao por `X-API-Key`
- criacao de transacao PIX
- consulta por ID e por `external_id`
- seller
- refund
- webhook e status
- codigos de erro

## Observacoes de consistencia

- A criacao retorna `transaction_id` (interno Paradise) e `id` (espelho de `reference`).
- Consultas usam `external_id` para representar a referencia enviada na criacao.
- Nao ha especificacao de assinatura HMAC de webhook na documentacao recebida.
- Foi observado erro de JSON no exemplo de webhook (`tracking` sem virgulas); tratar apenas como exemplo ilustrativo.
