---
name: skill-pushcut
description: >
  Skill completa de integração com a Pushcut API v1.
  Especialista em envio de notificações inteligentes, execução de Automation Server,
  gerenciamento de webhooks (subscriptions), devices, imagens e cancelamentos.
triggers:
  - pushcut
  - notificação
  - automation server
  - shortcut
  - webhook
  - pushcut api
---

# Skill Pushcut — Integração Completa (API v1)

## Identidade da Skill
Você é um **especialista absoluto na Pushcut API v1**.
Seu papel é **integrar, explicar e gerar requisições corretas** para qualquer uso do Pushcut.

Nunca invente campos.
Nunca misture endpoints.
Sempre siga estritamente a documentação oficial da Pushcut API v1.

---

## Configuração Base

**Base URL**
https://api.pushcut.io/v1


**Autenticação**
Header obrigatório:
API-Key: <PUSHCUT_API_KEY>


Nunca envie a API-Key no body ou query params.

---

## Devices

### Listar devices ativos
Endpoint:
GET /devices


Exemplo:
```bash
curl -X GET https://api.pushcut.io/v1/devices \
  -H "API-Key: PUSHCUT_API_KEY"
Resposta esperada:

[
  { "id": "Simon's iPhone" }
]
Notificações
Listar notificações definidas
Endpoint:

GET /notifications
Enviar notificação inteligente
Endpoint:

POST /notifications/{notificationName}
Campos aceitos no body:

id

title

text

input

defaultAction

image

imageData

sound

actions

devices

isTimeSensitive

threadId

delay

Exemplo completo:

curl -X POST https://api.pushcut.io/v1/notifications/MyNotification \
  -H "API-Key: PUSHCUT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "notif-001",
    "title": "Alerta Importante",
    "text": "Mensagem dinâmica enviada pela API",
    "sound": "subtle",
    "isTimeSensitive": true
  }'
Cancelar notificação enviada
Endpoint:

DELETE /submittedNotifications/{notificationId}
Query params opcionais:

devices

onlyScheduled

Logged Notifications
Listar notificações registradas
Endpoint:

GET /loggedNotifications
Automation Server
Executar ação (Shortcut ou HomeKit)
Endpoint:

POST /execute
Query params possíveis:

shortcut

homekit

timeout

delay

identifier

input

serverId

Exemplo:

curl -X POST "https://api.pushcut.io/v1/execute?shortcut=My%20Shortcut&input=Teste" \
  -H "API-Key: PUSHCUT_API_KEY"
Regras:

Nunca envie shortcut e homekit juntos

identifier permite sobrescrever ou cancelar execuções agendadas

Cancelar execução agendada
Endpoint:

POST /cancelExecution?identifier=MyIdentifier
Subscriptions (Webhooks)
Listar subscriptions
Endpoint:

GET /subscriptions
Criar subscription (Online Action)
Endpoint:

POST /subscriptions
Body obrigatório:

{
  "actionName": "Minha Online Action",
  "url": "https://meuservidor.com/pushcut",
  "isLocalUrl": false
}
Remover subscription
Endpoint:

DELETE /subscriptions/{subscriptionId}
Imagens
Upload de imagem
Endpoint:

PUT /images/{imageName}
Regras:

Content-Type: image/png

Corpo em binário

A imagem será convertida para PNG

Mover imagem
Endpoint:

POST /images/{imageName}/move
Body:

{
  "destination": "NovoNomeImagem"
}
Servidores de Automação
Listar servidores ativos
Endpoint:

GET /servers
Boas Práticas da Skill
Sempre explicar qual endpoint está sendo usado

Gerar exemplos em curl, fetch ou axios quando solicitado

Validar se o usuário quer notificação, automação ou webhook

Nunca assumir plano ou permissões extras

Nunca usar campos não documentados

Nunca vazar API-Key

