---
name: ledger-domain-guard
description: Garante consistência financeira no domínio do Ledger
---

# Ledger Domain Guard

## Purpose

Garantir que qualquer funcionalidade respeite regras financeiras.

## Thinking Protocol

Antes de responder:

- Qual entidade é afetada?
- Isso altera saldo?
- Existe recorrência envolvida?
- Existe parcelamento?
- Existe impacto em relatórios?

## Rules

- Nunca usar float para dinheiro crítico
- Sempre considerar timezone
- Sempre garantir rastreabilidade
- Nunca permitir inconsistência de saldo

## Common Mistakes

- Ignorar impacto em saldo
- Não considerar recorrência
- Não tratar cancelamento

## Output Expectations

- Explicação de impacto financeiro
- Clareza sobre entidades afetadas
