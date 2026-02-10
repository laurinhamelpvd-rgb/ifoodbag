# Playbooks de Integracao

## 1) Checkout proprio (backend + frontend)

Fluxo recomendado:
1. Criar pedido interno com `order_id` e status pendente.
2. Gerar `external_id` unico e chamar `POST /transactions`.
3. Salvar `transaction_id` (`id` da Sunize) e resposta `pix.payload`.
4. Exibir copia-e-cola PIX/QR code no frontend.
5. Receber webhook e atualizar pedido para pago somente em `AUTHORIZED`.
6. Em divergencia de status, consultar `GET /transactions/:transaction_id`.

Boas praticas:
- usar timeout por chamada externa.
- aplicar retry com backoff exponencial em erros de rede/`5xx`.
- registrar log por correlacao: `order_id`, `external_id`, `transaction_id`.

## 2) Oferta/LP com pagina unica

Fluxo recomendado:
1. Criar endpoint backend `/api/checkout/create-pix`.
2. Receber dados minimos do comprador e validar CPF/CNPJ + E.164.
3. Chamar Sunize no backend (nunca direto no browser).
4. Retornar apenas dados necessarios para UI (`transaction_id`, `pix.payload`, valor).
5. Confirmar compra no webhook.

Riscos comuns:
- marcar compra como paga logo apos criar transacao.
- perder notificacao por falta de fila/retry.

## 3) SaaS multi-tenant

Fluxo recomendado:
1. Associar credenciais Sunize por tenant.
2. Selecionar credencial correta por contexto da venda.
3. Persistir chave de idempotencia por `tenant + external_id`.
4. Processar webhook com isolamento por tenant.
5. Expor trilha de auditoria para suporte.

Hardening minimo:
- rotacao de segredos.
- mascaramento de dados sensiveis em logs.
- dead-letter queue para falhas persistentes de webhook.

## 4) Split de pagamento

Regras de implementacao:
- montar `splits[]` somente quando houver divisao real.
- validar regras locais de negocio antes do envio.
- separar validacao de split do endpoint de pagamento para facilitar manutencao.

Checklist rapido:
- `user_id` valido para cada recebedor.
- `type` em `percentage` ou `fixed`.
- `value` coerente com o tipo.

## 5) Status e reconciliacao

Estrutura minima:
- Tabela de transacoes com historico de transicoes de estado.
- Regra de idempotencia para nao reprocessar o mesmo evento.
- Job de reconciliacao para pedidos pendentes alem do SLA esperado.

Sugestao de politica:
- considerar webhook como fonte primaria.
- usar consulta como fallback quando webhook atrasar, falhar ou vier inconsistente.
