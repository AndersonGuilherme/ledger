# Skill — Risk Assessment

## Objective
Identificar e priorizar riscos técnicos, de produto e operacionais antes de merge/release.

## When To Use
- Em mudanças com impacto em dados, segurança, arquitetura ou operação.
- Em revisões de release e incidentes recorrentes.

## Required Inputs
- Escopo da mudança.
- Premissas e dependências.
- Histórico de incidentes semelhantes (se houver).

## Process
1. Levantar riscos por categoria: funcional, segurança, performance, dados, operação.
2. Classificar por probabilidade x impacto.
3. Definir mitigação, detecção e resposta.
4. Registrar risco residual e owner.

## Checklist
- Quais falhas têm maior impacto no usuário/negócio?
- O que depende de terceiros/sistemas externos?
- Existe risco de corrupção/perda de dados?
- Quais hipóteses não validadas sustentam a solução?
- Como detectar falha rapidamente em produção?
- Existe contingência para cada risco alto?

## Expected Output
- Tabela de riscos com severidade (`Low/Medium/High/Critical`).
- Mitigação por risco e responsável.
- Riscos aceitos explicitamente.

## Anti-Patterns
- Tratar risco como observação vaga sem ação.
- Ignorar risco de baixa probabilidade e alto impacto.

## Definition Of Done
- Riscos críticos têm plano concreto de mitigação/resposta.
- Riscos residuais estão explícitos e aprovados pelo time.
