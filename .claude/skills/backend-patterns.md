# Skill — Backend Patterns

## Objective
Garantir backend legível, testável e consistente com separação de responsabilidades.

## When To Use
- Em implementação/revisão de rotas, serviços, persistência e integrações.

## Required Inputs
- Fluxo de negócio afetado.
- Estrutura atual de camadas e módulos.

## Process
1. Verificar separação `Controller -> Service -> Repository`.
2. Garantir validação de entrada e contratos explícitos (DTO/schemas).
3. Centralizar regras de domínio no lugar correto.
4. Padronizar erros, transações e observabilidade.

## Checklist
- Controller está fino e sem regra de negócio?
- Service tem foco claro e baixo acoplamento?
- Repositório encapsula acesso a dados?
- Validação ocorre antes da regra de negócio?
- Erros técnicos vs. de domínio estão distintos?
- Side effects estão explícitos e testáveis?

## Rules
- Evitar lógica de domínio em controller/repository.
- Preferir composição e contratos explícitos.
