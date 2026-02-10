---
name: pushcut-page
description: Pagina de apoio da skill Pushcut com resumo operacional e caminho do SKILL.md oficial.
---

# Pushcut - Pagina da Skill

## Arquivo oficial da skill
Usar `.codex/skills/pushcut/SKILL.md` como fonte de verdade da skill.

## Escopo da skill
A skill `pushcut` cobre API v1 da Pushcut para:
- envio de notificacoes
- execucao de automacoes (`shortcut` ou `homekit`)
- gestao de subscriptions/webhooks
- listagem de devices e servers
- upload e movimentacao de imagens
- cancelamento de notificacoes e execucoes agendadas

## Como acionar no Codex
Usar prompt com `$pushcut`, por exemplo:

```text
$pushcut implemente um endpoint Node para enviar notificacao e cancelar por id.
```

## Base de integracao
- Base URL: `https://api.pushcut.io/v1`
- Header obrigatorio: `API-Key: <PUSHCUT_API_KEY>`
- Regra de seguranca: nao expor chave em query params, body ou logs

## Endpoints centrais
- `GET /devices`
- `GET /notifications`
- `POST /notifications/{notificationName}`
- `DELETE /submittedNotifications/{notificationId}`
- `GET /loggedNotifications`
- `POST /execute`
- `POST /cancelExecution`
- `GET /subscriptions`
- `POST /subscriptions`
- `DELETE /subscriptions/{subscriptionId}`
- `PUT /images/{imageName}`
- `POST /images/{imageName}/move`
- `GET /servers`

## Observacao
Esta pagina foi atualizada para apontar para a skill padronizada em pasta propria. Evitar manter duas versoes de instrucoes em paralelo.
