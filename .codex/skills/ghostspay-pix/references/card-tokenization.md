# Card Tokenization

## Objetivo
Tokenizar cartao no frontend para reduzir exposicao de PAN/CVV no backend de aplicacao.

## Biblioteca oficial
Incluir no frontend:

```html
<script src="https://api.ghostspaysv2.com/functions/v1/js"></script>
```

## Fluxo recomendado
1. Carregar `publicKey` por ambiente.
2. Coletar dados do cartao no frontend.
3. Gerar token com `GhostsPays.encrypt(...)`.
4. Enviar apenas `card.id` (token) para seu backend.
5. Backend cria pagamento `paymentMethod=CARD` usando token.

## Exemplo de tokenizacao (frontend)
```typescript
GhostsPays.setPublicKey("public_key_aqui");

const tokenId = await GhostsPays.encrypt({
  number: "4111111111111111",
  holderName: "Joao Silva",
  expMonth: 1,
  expYear: 2026,
  cvv: "456",
  amount: 1000,
  installments: 12
});
```

## Exemplo de create payment com token (backend)
```json
{
  "customer": {
    "name": "Maria Santos",
    "email": "maria@example.com",
    "phone": "11987654321",
    "document": {
      "number": "12345678901",
      "type": "CPF"
    }
  },
  "paymentMethod": "CARD",
  "amount": 10000,
  "installments": 3,
  "card": {
    "id": "card_token_abc123"
  },
  "items": [
    {
      "title": "Produto Premium",
      "unitPrice": 10000,
      "quantity": 1
    }
  ]
}
```

## Regras de seguranca
- Nunca logar numero completo do cartao ou CVV.
- Nunca persistir PAN/CVV no banco local.
- Usar tokenizacao como padrao para `CARD`.
- Separar chaves por ambiente (`sandbox` e `producao`).
