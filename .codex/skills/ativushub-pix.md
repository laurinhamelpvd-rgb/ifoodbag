---
name: skill-pushcut
description: >
  Skill especializada na Pushcut API v1. 
  Permite listar devices, listar notificações, enviar notificações inteligentes,
  cancelar notificações, executar ações do Automation Server,
  gerenciar webhooks (subscriptions) e imagens.
trigger:
  - pushcut
  - notificação
  - automation server
  - webhook pushcut
  - executar shortcut
---

# Skill Pushcut (API v1)

## Papel da Skill
Você é um **especialista na Pushcut API v1**.
Sempre que o usuário pedir algo relacionado a Pushcut, você deve:
- Escolher o endpoint correto
- Montar a requisição HTTP completa
- Explicar headers, parâmetros e body
- Gerar exemplos prontos para uso (curl, fetch ou axios)
- Nunca inventar campos fora da documentação oficial

Base URL da API:
https://api.pushcut.io/v1


Autenticação:
Header: API-Key: <PUSHCUT_API_KEY>


---

## Funcionalidades suportadas

### 📱 Devices
- Listar todos os devices ativos

Endpoint:
GET /devices


Exemplo:
```bash
curl -X GET https://api.pushcut.io/v1/devices \
  -H "API-Key: PUSHCUT_API_KEY"
🔔 Notificações
Listar notificações definidas
GET /notifications
Enviar notificação inteligente
POST /notifications/{notificationName}
Campos suportados no body:

id

title

text

input

sound

image / imageData

actions

devices

isTimeSensitive

threadId

delay

Exemplo:

curl -X POST https://api.pushcut.io/v1/notifications/MyNotification \
  -H "API-Key: PUSHCUT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Alerta",
    "text": "Mensagem dinâmica",
    "sound": "subtle",
    "isTimeSensitive": true
  }'
Cancelar notificação enviada
DELETE /submittedNotifications/{notificationId}
Parâmetros opcionais:

devices

onlyScheduled

🤖 Automation Server
Executar ação (Shortcut ou HomeKit)
POST /execute
Parâmetros possíveis:

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
Cancelar execução agendada
POST /cancelExecution?identifier=MyIdentifier
🌐 Subscriptions (Webhooks)
Listar subscriptions
GET /subscriptions
Criar subscription (online action)
POST /subscriptions
Body obrigatório:

actionName

url

isLocalUrl

Exemplo:

curl -X POST https://api.pushcut.io/v1/subscriptions \
  -H "API-Key: PUSHCUT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "actionName": "Meu Webhook",
    "url": "https://meuservidor.com/pushcut",
    "isLocalUrl": false
  }'
Remover subscription
DELETE /subscriptions/{subscriptionId}
🖼️ Imagens
Upload de imagem
PUT /images/{imageName}
Content-Type: image/png

Corpo: binário PNG

Mover imagem
POST /images/{imageName}/move
Body:

{
  "destination": "NovoNome"
}
Regras importantes
Sempre validar se o endpoint exige path params, query params ou body

Nunca misturar Shortcut e HomeKit no mesmo request

Delay e agendamentos exigem plano compatível

API-Key nunca vai no body, apenas no header