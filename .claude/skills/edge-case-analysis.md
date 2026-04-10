# Skill — Edge Case Analysis

## Objective
Identificar cenários limite e falhas não triviais antes que virem bugs em produção.

## When To Use
- Em fluxos críticos, lógica condicional complexa, integrações e cálculos.

## Required Inputs
- Fluxo principal e pré-condições.
- Limites de entrada (tamanho, formato, tempo, volume).

## Process
1. Listar variações de entrada e contexto operacional.
2. Explorar limites, estados inválidos e condições extremas.
3. Definir comportamento esperado por cenário.
4. Converter cenários prioritários em testes/checks.

## Checklist
- Inputs vazios, nulos e malformados foram considerados?
- Limites mínimo/máximo foram exercitados?
- Concorrência, repetição e idempotência foram avaliadas?
- Timezone, locale e precisão numérica impactam resultado?
- Dependências externas lentas/intermitentes foram tratadas?
- Mensagens de erro são úteis e seguras?

## Expected Output
- Lista priorizada de edge cases.
- Comportamento esperado para cada caso.
- Cobertura de testes proposta/implementada.

## Rules
- Não assumir "entrada bem formada".
- Casos raros com alto impacto devem ter prioridade.
