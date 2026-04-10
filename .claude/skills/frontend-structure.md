# Skill — Frontend Structure

## Objective
Manter frontend organizado, previsível e fácil de evoluir.

## When To Use
- Em criação/refatoração de telas, componentes e gerenciamento de estado.

## Required Inputs
- Fluxo de UI afetado.
- Padrões atuais de arquitetura frontend.

## Process
1. Separar claramente UI, estado e efeitos.
2. Definir fronteiras entre componentes de página e componentes reutilizáveis.
3. Padronizar loading, erro e estados vazios.
4. Minimizar acoplamento entre camadas.

## Checklist
- Componentes têm responsabilidade única?
- Estado está no nível correto (local/global/server)?
- Efeitos assíncronos estão encapsulados?
- Renderização lida com loading/erro/vazio?
- Reuso foi priorizado sem abstração excessiva?

## Rules
- Evitar mistura de regra de negócio com apresentação.
- Não duplicar estado derivável.
