# Skill — Architecture Guardian

## Objective
Preservar arquitetura coesa, modular e sustentável ao longo do tempo.

## When To Use
- Em decisões estruturais de médio/alto impacto.
- Em PRs que alteram fronteiras entre módulos/camadas.

## Required Inputs
- Contexto da mudança e componentes afetados.
- Requisitos não funcionais (escala, disponibilidade, custo, segurança).

## Process
1. Avaliar fronteiras de módulo e responsabilidades.
2. Checar direção de dependências e acoplamento.
3. Validar impactos em evolução, testes e operação.
4. Propor simplificações e decisões arquiteturais explícitas.

## Checklist
- Responsabilidades estão bem separadas?
- Dependências respeitam camadas e direção correta?
- Existe acoplamento temporal ou cíclico?
- A solução é observável e operável em produção?
- Complexidade está proporcional ao problema?
- Trade-offs foram explicitados?

## Expected Output
- Parecer arquitetural curto e objetivo.
- Riscos e trade-offs principais.
- Recomendações de ajuste priorizadas.

## Rules
- Preferir simplicidade com evolução incremental.
- Evitar abstrações prematuras e indireção desnecessária.
