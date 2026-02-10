# Sources

## Origem desta skill
Esta skill foi construída com base na documentacao fornecida pelo usuario na conversa em 2026-02-10, incluindo:
- Introducao da API GhostsPays Gateway
- Autenticacao Basic (`SECRET_KEY` + `COMPANY_ID`)
- Tokenizacao de cartao via biblioteca JS oficial
- Eventos/webhooks e status possiveis
- OpenAPI dos endpoints:
  - `POST /transactions`
  - `GET /transactions`
  - `GET /transactions/{id}`
  - `DELETE /transactions/{id}`
  - `PUT /transactions/{id}/delivery`

## URLs citadas na documentacao recebida
- API base: `https://api.ghostspaysv2.com/functions/v1`
- JS tokenizacao: `https://api.ghostspaysv2.com/functions/v1/js`
