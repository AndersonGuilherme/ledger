# Skill — Security Check

## Objective
Reduzir vulnerabilidades e garantir controles mínimos de segurança por padrão.

## When To Use
- Em qualquer mudança que envolva entrada de usuário, autenticação/autorização, dados sensíveis ou integrações externas.

## Required Inputs
- Fluxo afetado e superfícies de entrada.
- Modelo de autenticação/autorização atual.
- Tipos de dados tratados (PII, segredos, financeiros, etc.).

## Process
1. Identificar vetores de ataque no fluxo alterado.
2. Validar controles de input, acesso e exposição de dados.
3. Checar transporte/armazenamento de dados sensíveis.
4. Revisar logging e tratamento de erro para evitar vazamento.
5. Verificar dependências e configurações inseguras.

## Checklist
- Entrada é validada e sanitizada no backend?
- Autorização é verificada no recurso (não só no cliente)?
- Segredos/tokens ficam fora de código e logs?
- Dados sensíveis estão minimizados, mascarados e protegidos?
- Erros evitam divulgar detalhes internos?
- Rate limiting e proteção a abuso são necessários?
- Dependências críticas possuem vulnerabilidades conhecidas?

## Expected Output
- Lista de riscos de segurança e severidade.
- Controles existentes e lacunas.
- Recomendações priorizadas de correção.

## Anti-Patterns
- Confiar em validação apenas no frontend.
- Reutilizar tokens/segredos sem rotação e escopo mínimo.
- Logar payload sensível por conveniência.

## Definition Of Done
- Sem falhas críticas de segurança abertas.
- Controles mínimos aplicados e verificados.
- Riscos residuais documentados com owner e prazo.
