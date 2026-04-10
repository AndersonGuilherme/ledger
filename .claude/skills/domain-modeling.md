# Skill — Domain Modeling

## Objective
Representar regras e conceitos de negócio de forma explícita e coerente no código.

## When To Use
- Definição/refino de entidades, agregados, invariantes e fluxos de domínio.

## Required Inputs
- Linguagem do negócio (termos, regras, exceções).
- Casos de uso e eventos principais.

## Process
1. Identificar entidades, value objects e agregados.
2. Definir invariantes e limites de consistência.
3. Nomear comportamentos com linguagem ubíqua.
4. Evitar vazamento de detalhes de infra para o domínio.

## Checklist
- Nomes refletem linguagem do domínio?
- Regras críticas estão protegidas por invariantes?
- Fronteiras de agregados estão claras?
- Há comportamento de domínio onde deveria haver apenas dados?
- Regras de negócio estão fora de camadas de transporte/persistência?

## Rules
- Evitar modelo anêmico quando há regra relevante.
- Preferir expressividade de domínio sobre conveniência técnica.
