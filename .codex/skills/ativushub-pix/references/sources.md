# Sources

Documentacao base usada para esta skill:

- AtivusHUB - get transaction status
  - `GET https://api.ativushub.com.br/s1/getTransaction/api/getTransactionStatus.php?id_transaction={id_transaction}`
- AtivusHUB - get company
  - `GET https://api.ativushub.com.br/s1/getCompany/`
- AtivusHUB - gateway cashin
  - `POST https://api.ativushub.com.br/v1/gateway/api/`
- AtivusHUB - gateway split
  - `POST https://api.ativushub.com.br/v1/gateway/api/split/`
- AtivusHUB - cashout
  - `POST https://api.ativushub.com.br/c1/cashout/api/`
- AtivusHUB - refund
  - `POST https://api.ativushub.com.br/v1/gateway/api/refund/`
- AtivusHUB - webhook examples
  - `GET https://api.ativushub.com.br/s1/getPostBackExamples/`

Headers padrao esperados:
- `Authorization: Basic {API_KEY_BASE64}`
- `content-type: application/json`
