# Implementation Patterns

## Base code no `<head>`

```html
<!-- Meta Pixel Code -->
<script>
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
  n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'FB_PIXEL_ID');
  fbq('track', 'PageView');
</script>
<noscript>
  <img height="1" width="1" style="display:none"
       src="https://www.facebook.com/tr?id=FB_PIXEL_ID&ev=PageView&noscript=1"/>
</noscript>
<!-- End Meta Pixel Code -->
```

## Evento por clique

```html
<button id="buyButton">Comprar</button>
<script>
  document.getElementById('buyButton').addEventListener('click', function () {
    fbq('track', 'AddToCart', {
      contents: [{ id: 'SKU-123', quantity: 1 }],
      content_type: 'product',
      value: 49.9,
      currency: 'BRL'
    });
  });
</script>
```

## SPA (mudanca de rota)

Integrar no roteador da aplicacao e disparar evento ao trocar rota ou concluir acao.

```js
function onRouteChange(pathname) {
  fbq('track', 'PageView');
  if (pathname === '/checkout') fbq('track', 'InitiateCheckout');
}
```

## Multiplos pixels sem disparo cruzado

Quando houver mais de um pixel inicializado, usar chamadas seletivas:

```html
<script>
  fbq('init', 'PIXEL_A');
  fbq('init', 'PIXEL_B');
  fbq('track', 'PageView');

  fbq('trackSingle', 'PIXEL_A', 'Purchase', { value: 100, currency: 'BRL' });
  fbq('trackSingleCustom', 'PIXEL_B', 'Step4', { source: 'agency-b' });
</script>
```

## Advanced Matching (manual)

Adicionar dados de usuario no `init` (hash automatico SHA-256 pelo pixel quando aplicavel):

```html
<script>
  fbq('init', 'FB_PIXEL_ID', {
    em: 'email@example.com',
    fn: 'joao',
    ln: 'silva',
    ph: '5511999999999'
  });
</script>
```

## CAPI deduplicacao (quando houver backend)

Se o projeto enviar o mesmo evento via browser e servidor, reutilizar o mesmo `event_id` nas duas origens para deduplicacao.
