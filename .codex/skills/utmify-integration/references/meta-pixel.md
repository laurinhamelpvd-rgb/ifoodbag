# Meta Pixel + CAPI com UTMify

## Objetivo

Sincronizar eventos de funil no navegador e no backend para:
- melhorar cobertura de atribuicao
- reduzir perdas por bloqueio de browser
- manter eventos de compra consistentes com status enviados para UTMify

## Mapa de eventos recomendado

- Entrada no checkout: `InitiateCheckout`
- Metodo de pagamento escolhido/PIX gerado: `AddPaymentInfo`
- Pagamento confirmado: `Purchase`
- Reembolso (opcional para analytics): `Refund` customizado no seu stack

## Regras de implementacao

1. Disparar browser event
- Usar Pixel no frontend para eventos de navegacao e interacao.

2. Disparar server event (CAPI)
- Usar backend para enviar evento confirmado de compra e eventos criticos.
- Priorizar envio apos webhook de pagamento aprovado.

3. Deduplicar browser + server
- Gerar `event_id` unico por evento de compra.
- Reutilizar o mesmo `event_id` no browser e no CAPI (inferencia de boas praticas Meta).

4. Melhorar matching de usuario
- Enviar `em` e `ph` com hash SHA-256 no CAPI.
- Quando possivel, enviar `external_id`, `client_ip_address` e `client_user_agent`.

5. Manter consistencia com UTMify
- Se UTMify receber `status = paid`, garantir `Purchase` no Pixel/CAPI.
- Se UTMify receber `refunded`, refletir em eventos/BI conforme estrategia do projeto.

## Exemplo browser (Pixel)

```html
<script>
  const eventId = crypto.randomUUID();
  fbq("track", "Purchase", {
    value: 56.10,
    currency: "BRL"
  }, {
    eventID: eventId
  });
</script>
```

## Exemplo server (CAPI)

```js
const payload = {
  data: [
    {
      event_name: "Purchase",
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      action_source: "website",
      user_data: {
        em: [sha256(email.toLowerCase().trim())],
        ph: [sha256(phoneDigits)]
      },
      custom_data: {
        value: 56.10,
        currency: "BRL"
      }
    }
  ]
};
```

## Checklist de QA

- Verificar evento em tempo real no Events Manager.
- Testar compra completa com UTMs na URL.
- Confirmar que o mesmo pedido aparece em:
  - sistema local
  - UTMify
  - painel de eventos Meta
- Medir diferenca entre eventos browser vs server para identificar perdas.
