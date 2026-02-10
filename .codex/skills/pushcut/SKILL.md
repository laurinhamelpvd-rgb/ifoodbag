---
name: pushcut
description: Integrar e operar a API v1 da Pushcut para envio de notificacoes, execucao de shortcuts ou HomeKit via Automation Server, gestao de subscriptions (webhooks), devices, imagens e cancelamentos. Usar quando o usuario pedir implementacao, correcao, depuracao ou operacao de fluxos Pushcut em backend, scripts, automacoes ou webhooks.
---

# Skill Pushcut API v1

## Papel da skill
Atuar como especialista de Pushcut API v1 para:
- implementar integracoes seguras com header `API-Key`
- enviar notificacoes e cancelar envios agendados
- executar automacoes via `shortcut` ou `homekit`
- criar e remover subscriptions de webhooks
- listar devices, servers e notificacoes registradas
- subir e mover imagens para uso em notificacoes

Nao inventar campos e nao misturar endpoints.

## Regras obrigatorias
- Usar `https://api.pushcut.io/v1` como base URL.
- Enviar autenticacao somente no header `API-Key: <PUSHCUT_API_KEY>`.
- Nao enviar API key em body, query string, logs ou mensagens de erro.
- Validar o objetivo da tarefa antes de gerar chamada: notificacao, automacao, subscription, imagem ou consulta.
- Nao enviar `shortcut` e `homekit` juntos no endpoint `/execute`.
- Usar `identifier` para sobrescrever ou cancelar execucoes agendadas quando necessario.
- Explicar sempre qual endpoint foi escolhido e por qual motivo.
- Gerar exemplos em `curl`, `fetch` ou `axios` quando solicitado.

## Endpoints principais
- `GET /devices`: listar devices ativos.
- `GET /notifications`: listar notificacoes definidas.
- `POST /notifications/{notificationName}`: enviar notificacao inteligente.
- `DELETE /submittedNotifications/{notificationId}`: cancelar notificacao enviada.
- `GET /loggedNotifications`: listar historico de notificacoes.
- `POST /execute`: executar shortcut ou HomeKit no Automation Server.
- `POST /cancelExecution?identifier={id}`: cancelar execucao agendada por identificador.
- `GET /subscriptions`: listar subscriptions.
- `POST /subscriptions`: criar subscription para Online Action.
- `DELETE /subscriptions/{subscriptionId}`: remover subscription.
- `PUT /images/{imageName}`: upload de imagem (binario PNG).
- `POST /images/{imageName}/move`: renomear/mover imagem.
- `GET /servers`: listar servidores ativos.

## Fluxo padrao de implementacao
1. Coletar o caso de uso exato e os recursos da conta Pushcut envolvidos.
2. Validar disponibilidade de `PUSHCUT_API_KEY` e ambiente seguro para chamada server-side.
3. Criar endpoint interno no backend para encapsular a chamada da Pushcut.
4. Montar payload somente com campos documentados para o endpoint escolhido.
5. Executar chamada com timeout e tratamento de erros HTTP.
6. Registrar logs sem segredo e com identificadores de correlacao.
7. Retornar resposta normalizada para o frontend ou sistema chamador.
8. Entregar comandos de teste para reproduzir fluxo e validar comportamento.

## Modelos de requisicao

### Enviar notificacao
```bash
curl -X POST "https://api.pushcut.io/v1/notifications/MyNotification" \
  -H "API-Key: PUSHCUT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "notif-001",
    "title": "Alerta importante",
    "text": "Mensagem dinamica enviada pela API",
    "sound": "subtle",
    "isTimeSensitive": true
  }'
```

Campos comuns aceitos em notificacao:
`id`, `title`, `text`, `input`, `defaultAction`, `image`, `imageData`, `sound`, `actions`, `devices`, `isTimeSensitive`, `threadId`, `delay`.

### Executar shortcut
```bash
curl -X POST "https://api.pushcut.io/v1/execute?shortcut=My%20Shortcut&input=Teste" \
  -H "API-Key: PUSHCUT_API_KEY"
```

Regras:
- Enviar apenas um alvo por chamada: `shortcut` ou `homekit`.
- Usar `identifier` para controlar deduplicacao e cancelamento.

### Criar subscription (webhook)
```bash
curl -X POST "https://api.pushcut.io/v1/subscriptions" \
  -H "API-Key: PUSHCUT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "actionName": "Minha Online Action",
    "url": "https://meuservidor.com/pushcut",
    "isLocalUrl": false
  }'
```

### Upload de imagem
```bash
curl -X PUT "https://api.pushcut.io/v1/images/banner-alerta" \
  -H "API-Key: PUSHCUT_API_KEY" \
  -H "Content-Type: image/png" \
  --data-binary "@imagem.png"
```

A API converte a imagem para PNG.

### Cancelar notificacao enviada
```bash
curl -X DELETE "https://api.pushcut.io/v1/submittedNotifications/notif-001" \
  -H "API-Key: PUSHCUT_API_KEY"
```

### Cancelar execucao agendada
```bash
curl -X POST "https://api.pushcut.io/v1/cancelExecution?identifier=job-123" \
  -H "API-Key: PUSHCUT_API_KEY"
```

## Tratamento minimo de erro
- `400`: validar parametro faltante, payload invalido ou combinacao de campos proibida.
- `401` ou `403`: validar `API-Key`, permissao de conta e escopo do recurso.
- `404`: validar nome de notificacao, id de subscription, id de notificacao ou endpoint.
- `429`: aplicar retry com backoff exponencial e jitter.
- `5xx`: aplicar retry limitado, registrar falha e retornar erro controlado.

## Checklist de entrega
- Entregar endpoint interno que encapsule chamada para Pushcut.
- Garantir que segredo fique somente no backend.
- Cobrir caminho feliz e caminho de erro com resposta previsivel.
- Incluir comando de teste `curl` para reproduzir fluxo principal.
- Informar claramente pre requisitos da conta Pushcut para o caso.
