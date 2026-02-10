# Event Playbook

## Matriz recomendada por funil

| Etapa | Evento | Quando disparar | Parametros principais |
|---|---|---|---|
| Visita | `PageView` | No carregamento da pagina | sem obrigatorios |
| Oferta/produto | `ViewContent` | Em pagina de detalhe/oferta | `content_ids` ou `contents`, `content_type`, `value`, `currency` |
| Busca | `Search` | Ao executar busca no site | `search_string`, `content_ids`, `value`, `currency` |
| Carrinho | `AddToCart` | Ao adicionar item ao carrinho | `contents`, `content_type`, `value`, `currency` |
| Inicio checkout | `InitiateCheckout` | Ao entrar no checkout | `contents` ou `content_ids`, `num_items`, `value`, `currency` |
| Pagamento | `AddPaymentInfo` | Ao salvar/selecionar forma de pagamento | `contents` ou `content_ids`, `value`, `currency` |
| Cadastro | `CompleteRegistration` | Ao concluir cadastro | `status`, `value`, `currency` (se aplicavel) |
| Lead | `Lead` | Ao concluir formulario de lead | `value`, `currency` (se aplicavel) |
| Compra | `Purchase` | So apos confirmacao real do pagamento | `value`, `currency`, `contents` ou `content_ids` |

## Snippets base

```html
<script>
  fbq('track', 'ViewContent', {
    content_ids: ['SKU-123'],
    content_type: 'product',
    value: 49.9,
    currency: 'BRL'
  });
</script>
```

```html
<script>
  fbq('track', 'InitiateCheckout', {
    contents: [{ id: 'SKU-123', quantity: 1 }],
    content_type: 'product',
    num_items: 1,
    value: 49.9,
    currency: 'BRL'
  });
</script>
```

```html
<script>
  fbq('track', 'Purchase', {
    contents: [
      { id: 'SKU-123', quantity: 1 },
      { id: 'SKU-999', quantity: 2 }
    ],
    content_type: 'product',
    value: 149.7,
    currency: 'BRL'
  });
</script>
```

## Eventos customizados

Usar `trackCustom` quando o evento nao existir na lista padrao.

```html
<script>
  fbq('trackCustom', 'ShareDiscount', {
    promotion: 'share_discount_10',
    value: 10,
    currency: 'BRL'
  });
</script>
```

Regras:
- nome do evento customizado deve ser string com ate 50 caracteres.
- evitar nomes que exponham categorias sensiveis.
