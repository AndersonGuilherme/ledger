# Skill — API Design

## Objective
Projetar APIs previsíveis, consistentes, evolutivas e seguras.

## When To Use
- Criação ou evolução de endpoints REST/HTTP.
- Revisão de contratos públicos entre serviços.

## Required Inputs
- Casos de uso e consumidores da API.
- Requisitos de performance/segurança.
- Estratégia de versionamento e compatibilidade.

## Process
1. Definir recursos e operações orientadas ao domínio.
2. Padronizar contratos de request/response e erros.
3. Planejar paginação, filtros, ordenação e idempotência.
4. Garantir versionamento e backward compatibility.
5. Documentar exemplos e códigos de erro.

## Checklist
- Recursos e verbos HTTP estão semânticos?
- Contratos são consistentes entre endpoints?
- Erros seguem formato padronizado e acionável?
- Paginação/filtros estão definidos quando necessário?
- Operações mutáveis têm idempotência quando aplicável?
- Segurança (authn/authz, rate limit) foi considerada?
- Mudanças quebram clientes atuais?

## Expected Output
- Contrato claro por endpoint.
- Convenções de erro e paginação.
- Estratégia de evolução/versionamento.

## Rules
- Não expor estrutura interna do domínio/DB.
- Manter estabilidade de contrato; quebras exigem versão nova.
