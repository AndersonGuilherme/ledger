# Skill — Multi-Tenant Safety

## Objective
Garantir isolamento forte entre tenants em leitura, escrita e operações administrativas.

## When To Use
- Em qualquer mudança que toque dados multi-tenant, autorização ou consultas agregadas.

## Required Inputs
- Modelo de tenant atual.
- Fluxo de autenticação/autorização.
- Queries e endpoints afetados.

## Process
1. Mapear caminho completo do `tenant_id` da autenticação até o acesso a dados.
2. Verificar escopo obrigatório em todas as queries/mutações.
3. Validar proteção em joins, cache e jobs assíncronos.
4. Cobrir testes de isolamento positivo e negativo.

## Checklist
- `tenant_id` vem de contexto confiável no backend?
- Toda query sensível inclui escopo explícito por tenant?
- Existe risco de cross-tenant em joins, filtros opcionais ou buscas globais?
- Cache/chaves incluem contexto de tenant?
- Jobs/filas propagam tenant corretamente?
- Acesso administrativo está auditado e restrito?

## Rules
- Nunca confiar no cliente para definir tenant efetivo.
- Isolamento é requisito de segurança, não detalhe de implementação.
