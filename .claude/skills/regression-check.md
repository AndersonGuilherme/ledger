# Skill — Regression Check

## Objective
Evitar que mudanças introduzam quebras em fluxos existentes, contratos e comportamento esperado.

## When To Use
- Em qualquer PR que altere comportamento, contrato, integração ou dados.
- Antes de merge e antes de release.

## Required Inputs
- Lista de arquivos alterados.
- Fluxos impactados direta e indiretamente.
- Contratos públicos (API, eventos, schemas, UI states).

## Process
1. Mapear superfície de impacto da mudança.
2. Listar riscos de regressão por fluxo/contrato.
3. Cobrir com testes, checks manuais e validações de compatibilidade.
4. Confirmar cenários happy-path, edge e erro.
5. Registrar riscos residuais e plano de rollback.

## Checklist
- Mudou regra de negócio existente?
- Mudou assinatura/contrato público?
- Mudou estrutura de dados persistidos?
- Fluxos legados continuam com mesmo resultado?
- Mensagens de erro, estados vazios e loading permanecem corretos?
- Existe migração retrocompatível quando necessário?
- Testes relevantes foram executados e passaram?

## Expected Output
- Matriz de impacto (o que pode quebrar).
- Evidência de validação por fluxo crítico.
- Lista de riscos residuais com severidade.

## Anti-Patterns
- Assumir que refactor "não muda comportamento" sem evidência.
- Validar só caminho feliz.
- Merge sem checar contratos externos.

## Definition Of Done
- Principais fluxos existentes validados sem quebra.
- Contratos preservados ou versionados.
- Riscos residuais explícitos e aceitos.
