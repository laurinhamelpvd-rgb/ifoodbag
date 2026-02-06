# SKILL — Integração PIX (AtivusHUB) — Guia de Implementação (Completo)

## Objetivo
Você (Codex) vai ajudar a integrar a API PIX da **AtivusHUB** para:
1) Consultar saldo  
2) Consultar status de transação  
3) Obter informações do vendedor (seller)  
4) Criar cobrança PIX (CashIn)  
5) Criar cobrança PIX com split (CashIn Split)  
6) Enviar PIX (CashOut / saque)  
7) Estornar pagamento (Refund)  
8) Receber e processar Webhooks de atualização de status  

## Regras de ouro (sempre siga verificação)
- **Autenticação**: Sempre enviar header `Authorization: Basic {API_KEY_BASE64}` e `Content-Type: application/json`.
- **IP Autorizado**: Alguns endpoints exigem IP previamente autorizado na AtivusHUB. Se vier erro 403 “IP não autorizado”, isso é **infra/config**, não bug de código.
- **Não logar segredos**: nunca imprimir `API_KEY_BASE64` em logs.
- **Timeout e retries**: usar timeout (ex.: 15s) e retry com backoff somente para erros transitórios (5xx, timeouts).
- **Idempotência**: não há header de idempotência documentado. Então, para evitar cobranças duplicadas:
  - gere um `external reference` interno no seu sistema e **não recrie** se já existir transação aberta;
  - persista `idTransaction` retornado.
- **Tratamento de status**: sempre considerar que o status real vem por webhook e/ou consulta de status.

---

## Configuração (ENV)
Crie variáveis de ambiente:

- `ATIVUSHUB_API_KEY_BASE64` = a API Key já codificada em Base64 (sem “Basic ”).
- `ATIVUSHUB_BASE_URL` = `https://api.ativushub.com.br`
- `ATIVUSHUB_WEBHOOK_SECRET` = segredo seu (para validar webhooks por header/token) *(não é da AtivusHUB; é seu para segurança)*

### Headers padrão (todas as requisições autenticadas)
- `Authorization: Basic ${ATIVUSHUB_API_KEY_BASE64}`
- `Content-Type: application/json`

---

## Endpoints (mapa completo)

### 1) Consultar Saldo (GET)
**Endpoint**
- `GET https://api.ativushub.com.br/s1/getsaldo/api/`

**Requisitos**
- IP autorizado (se não, 403)
- Header de autenticação

**Sucesso (200)**: retorna `saldo_liquido` e `transacoes` (entrada/saida)

**Erros**
- 401: API Key não fornecida
- 401: API Key incorreta
- 403: IP não autorizado

---

### 2) Buscar Status da Transação (GET)
**Endpoint**
- `GET https://api.ativushub.com.br/s1/getTransaction/api/getTransactionStatus.php?id_transaction={id_transaction}`

**Parâmetros**
- `id_transaction` = ID_TRANSACTION (ex.: retornado como `idTransaction` nos endpoints de cobrança/cashout)

**Sucesso (200)**: ex.: `situacao`, `tipo`, `data_transacao`, `valor_bruto`, `valor_liquido`

**Erros**
- 401: API Key não fornecida
- 403: API Key incorreta
- 404: Transação não encontrada

---

### 3) Informações do Vendedor (GET)
**Endpoint**
- `GET https://api.ativushub.com.br/s1/getCompany/`

**Sucesso (200)**: `dados_seller.empresa` e `dados_seller.endereco`

**Erros**
- 401: API Key não fornecida
- 401: API Key incorreta

---

### 4) Receber via PIX — Criar Cobrança (POST) [CashIn]
**Endpoint**
- `POST https://api.ativushub.com.br/v1/gateway/api/`

**Obrigatórios (validação forte — se faltar, 422)**
- `amount` (float)
- `id_seller` (string)
- `customer.name`
- `customer.email`
- `customer.cpf` (CPF válido)
- `customer.phone` *(no exemplo simplificado não aparece, mas na documentação diz obrigatório. Se o endpoint aceitar sem phone em alguns casos, trate como “deve enviar sempre” para evitar 422.)*
- `customer.address` completo:
  - `street`, `streetNumber`, `complement`, `zipCode`, `neighborhood`, `city`, `state` (UF), `country` (ex.: `br`)
- `items[]` (>= 1 item com `title`, `quantity` > 0, `unitPrice`, `tangible`)
- `postbackUrl` (URL webhook)
- `ip` (IP do cliente que está fazendo a requisição) *(documentado como obrigatório)*

**Opcionais**
- `pix.expiresInDays` (default 2)
- `customer.id` (se não enviar, gera UUID)
- `customer.externaRef`
- `metadata` (default “metadata”)
- `traceable` (default false)
- `checkout.utm_*` (utm tracking)

**Sucesso (200)**: retorna
- `idTransaction`
- `paymentCode` (PIX copia e cola)
- `paymentCodeBase64` (QR code em base64)
- `status_transaction` (ex.: `WAITING_FOR_APPROVAL`)

**Erros**
- 401: API Key ausente/inválida
- 403: IP não autorizado
- 422: Dados inválidos/ausentes

---

### 5) Receber com Split (POST) [CashIn Split]
**Endpoint**
- `POST https://api.ativushub.com.br/v1/gateway/api/split/`

**Regras do split**
- Máximo 3 splits
- Soma das porcentagens **deve ser < 100** (não pode atingir 100)
- `split` obrigatório
- `id_seller` obrigatório

**Payload**: igual ao CashIn + campo `split: [{ user_id, percentage }]`

**Erros adicionais**
- 401: soma do split >= 100
- 401: mais de 3 splits
- (demais iguais ao CashIn)

---

### 6) Enviar PIX (POST) [CashOut / Saque]
**Endpoint**
- `POST https://api.ativushub.com.br/c1/cashout/api/`

**Obrigatórios**
- `amount` (Number)
- `pixKey` (somente números)
  - Se `pixType=PHONE`, incluir `55` antes do DDD
- `pixType` (CPF, CNPJ, EMAIL, PHONE, RANDOM)
- `beneficiaryName`
- `beneficiaryDocument` (CPF válido)
- `postbackUrl`
- `description` (recomendado)

**Sucesso (200)**: retorna `externalreference`, `status` (ex.: PENDING), `idTransaction`, `valor_liquido`

**Erros**
- 401: API Key ausente/inválida
- 401: IP não autorizado
- 422: dados inválidos

---

### 7) Estornar Pagamento (POST) [Refund]
**Endpoint**
- `POST https://api.ativushub.com.br/v1/gateway/api/refund/`

**Obrigatórios**
- `id` (Number) — ID interno informado pelo seller
- `external_reference` — referência externa da transação original

**Sucesso (200)**: retorna `rtrId`, `valor`, `idTransaction`

**Erros**
- 401: API Key ausente/inválida
- 403: campos obrigatórios faltando
- 404: transação não encontrada por external_reference
- 401: transação já reembolsada

---

### 8) Exemplos de Postback/Webhook (GET)
**Endpoint**
- `GET https://api.ativushub.com.br/s1/getPostBackExamples/`

**Uso**
- Apenas para obter exemplos dos payloads que a plataforma pode enviar.

---

## Webhooks (Postback) — como implementar do jeito certo

### O que a AtivusHUB envia
- Requisição `POST` com `Content-Type: application/json`
- Payload varia por tipo:
  - CashIn: campos `client_name`, `client_document`, `paymentcode`, `paymentCodeBase64`, `deposito_liquido`, `status`, etc.
  - CashOut: `beneficiaryname`, `pixkey`, `cash_out_liquido`, `status`, etc.
  - Refund: parecido com cashin + status de reembolso

### Lista de status esperados (tratar todos)
- `paid`, `pending`, `cancelled`, `failed`, `retido`, `med`, `refunded`,
- `waiting_for_approval`, `approved`, `rejected`

### Segurança (muito importante)
A documentação não cita assinatura HMAC. Então aplique **uma dessas proteções**:
1) **Token na URL**: `postbackUrl = https://seusite.com/webhook/ativushub?token=SEU_TOKEN`
2) **Basic Auth no endpoint** (se seu servidor permitir)
3) **IP allowlist** (se a AtivusHUB fornecer IPs de saída; caso não, use token)

Sempre rejeitar webhooks sem token válido.

### Persistência e idempotência (essencial)
- Use `idtransaction` (ou `idTransaction`) como chave única.
- Se receber o mesmo webhook 2x, responder 200 e **não duplicar atualização**.

### Resposta do seu webhook
- Retorne `200` com JSON simples: `{"status":"success"}` para confirmar recebimento.

---

## Estratégia de implementação (arquitetura recomendada)

### Modelo de dados mínimo no seu sistema
- `idTransaction` (string) — chave única
- `type` (CASHIN | CASHOUT | REFUND)
- `status` (string)
- `amount` (number)
- `net_amount` (number, se houver)
- `externalreference` (string, se houver)
- `customer` / `beneficiary` (campos úteis)
- `created_at`, `updated_at`

### Fluxo CashIn (cobrança)
1) Criar cobrança (`/v1/gateway/api/`)
2) Salvar `idTransaction`, `paymentCode`, `paymentCodeBase64`, `status_transaction`
3) Exibir QR/“copia e cola” pro cliente
4) Aguardar webhook (preferencial) e/ou consultar status periodicamente

### Fluxo CashOut (saque)
1) Criar cashout (`/c1/cashout/api/`)
2) Salvar `idTransaction`, `externalreference`, `status`
3) Aguardar webhook para status final

### Fluxo Refund
1) Requisitar refund (`/v1/gateway/api/refund/`)
2) Salvar `rtrId`, `idTransaction`, status retornado
3) Aguardar webhook/consulta status

---

## Exemplos de código — Node.js/TypeScript (fetch)

### Cliente HTTP padrão
```ts
// ativushubClient.ts
const BASE_URL = process.env.ATIVUSHUB_BASE_URL ?? "https://api.ativushub.com.br";
const API_KEY_B64 = process.env.ATIVUSHUB_API_KEY_BASE64!;

type RequestInitExt = RequestInit & { timeoutMs?: number };

async function http<T>(path: string, init: RequestInitExt): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 15000);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Basic ${API_KEY_B64}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    const text = await res.text();
    let data: any = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!res.ok) {
      // padroniza erro
      const err = new Error(`AtivusHUB HTTP ${res.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
      (err as any).status = res.status;
      (err as any).data = data;
      throw err;
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const ativus = {
  // 1) saldo
  getSaldo: () => http<any>("/s1/getsaldo/api/", { method: "GET" }),

  // 2) status
  getTransactionStatus: (idTransaction: string) =>
    http<any>(`/s1/getTransaction/api/getTransactionStatus.php?id_transaction=${encodeURIComponent(idTransaction)}`, { method: "GET" }),

  // 3) seller
  getCompany: () => http<any>("/s1/getCompany/", { method: "GET" }),

  // 4) cashin
  createPixCharge: (payload: any) =>
    http<any>("/v1/gateway/api/", { method: "POST", body: JSON.stringify(payload) }),

  // 5) cashin split
  createPixChargeSplit: (payload: any) =>
    http<any>("/v1/gateway/api/split/", { method: "POST", body: JSON.stringify(payload) }),

  // 6) cashout
  createCashout: (payload: any) =>
    http<any>("/c1/cashout/api/", { method: "POST", body: JSON.stringify(payload) }),

  // 7) refund
  refund: (payload: any) =>
    http<any>("/v1/gateway/api/refund/", { method: "POST", body: JSON.stringify(payload) }),
};
