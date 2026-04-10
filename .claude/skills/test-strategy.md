# Skill — Test Strategy

## Objective
Cobrir riscos reais com o menor custo de manutenção possível.

## When To Use
- Definição de plano de testes para feature, refactor ou bugfix.

## Required Inputs
- Mudança proposta.
- Riscos principais e fluxos críticos.

## Process
1. Mapear risco por área (domínio, integração, UI, dados).
2. Escolher nível de teste adequado (unit, integration, e2e).
3. Priorizar cenários críticos e regressões prováveis.
4. Definir o que será manual vs. automatizado com justificativa.

## Checklist
- Fluxos de maior impacto estão cobertos?
- Casos de erro e borda foram incluídos?
- Integrações externas críticas têm cobertura?
- Há equilíbrio entre confiança e tempo de execução?
- Testes são determinísticos e legíveis?

## Rules
- Testar comportamento, não implementação interna.
- Evitar excesso de testes frágeis de baixo valor.
