# Skill — Release Readiness

## Objective
Assegurar que a entrega está pronta para produção com risco operacional aceitável.

## When To Use
- Em preparo de release (feature, hotfix, migração, mudança infra).

## Required Inputs
- Escopo final aprovado.
- Status de testes e checks de CI.
- Plano de deploy/rollback.

## Process
1. Validar qualidade funcional e técnica.
2. Verificar observabilidade, segurança e performance mínima.
3. Confirmar readiness operacional (deploy, rollback, runbook).
4. Consolidar riscos e decisão de go/no-go.

## Checklist
- Critérios de aceite foram atendidos?
- Testes automáticos críticos estão verdes?
- Mudanças de schema/migração foram validadas?
- Logs, métricas e alertas cobrem o fluxo novo?
- Feature flags, se usadas, estão configuradas?
- Existe plano de rollback testado?
- Stakeholders necessários foram informados?

## Expected Output
- Status de readiness por área (Produto, Eng, Ops, Segurança).
- Riscos abertos com mitigação e responsável.
- Decisão objetiva: `GO`, `GO WITH MITIGATIONS` ou `NO-GO`.

## Anti-Patterns
- Liberar com incertezas críticas sem owner.
- Confundir "build verde" com prontidão de produção.

## Definition Of Done
- Sem bloqueadores críticos abertos.
- Plano de rollback claro e executável.
- Responsáveis de monitoramento definidos para pós-release.
