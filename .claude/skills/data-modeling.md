# Skill — Data Modeling

## Objective
Modelar dados com integridade, performance e evolução segura.

## When To Use
- Criação/alteração de entidades, schemas, índices e migrações.

## Required Inputs
- Regras de domínio.
- Volume esperado, padrões de consulta e retenção.

## Process
1. Definir entidades, cardinalidades e invariantes.
2. Aplicar constraints e chaves para garantir integridade.
3. Planejar índices com base em queries reais.
4. Validar estratégia de migração e retrocompatibilidade.

## Checklist
- Modelo representa corretamente o domínio?
- Integridade referencial e unicidade estão garantidas?
- Índices cobrem consultas críticas sem excesso?
- Campos opcionais/obrigatórios refletem regras reais?
- Estratégia de auditoria/soft delete (se necessária) está clara?
- Multi-tenant e ownership estão explicitamente modelados?

## Rules
- Não aceitar ownership ambíguo.
- Toda mudança de schema precisa plano de migração.
