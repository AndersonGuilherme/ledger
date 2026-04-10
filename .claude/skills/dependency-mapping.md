# Skill — Dependency Mapping

## Objective
Mapear dependências e ordem de execução para reduzir bloqueios e retrabalho.

## When To Use
- Planejamento de implementação, refactors e releases multi-equipe.

## Required Inputs
- Lista de tarefas/entregáveis.
- Dependências técnicas e de negócio.

## Process
1. Identificar pré-requisitos de cada tarefa.
2. Construir grafo simples de dependências.
3. Separar trilhas paralelizáveis.
4. Marcar caminho crítico e bloqueadores.

## Checklist
- Quais tarefas bloqueiam outras?
- O que pode executar em paralelo com segurança?
- Existem dependências externas sem SLA claro?
- Há risco de dependência circular?
- Sequência minimiza tempo total de entrega?

## Expected Output
- Ordem recomendada de execução.
- Caminho crítico e riscos de atraso.
- Plano de paralelismo por frente.

## Rules
- Evitar ciclos e acoplamento desnecessário entre tarefas.
- Tornar bloqueadores explícitos cedo.
