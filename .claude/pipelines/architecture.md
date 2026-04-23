# Pipeline — Architecture Definition

## Objetivo

Definir a arquitetura técnica inicial do projeto Whalet antes da implementação.

## Participantes

- tech-lead (lead)
- backend-nestjs-lead
- frontend-nextjs-lead

## Contexto

- discoveries já fechados
- data-model.md (se existir)
- SPEC.md

---

## Prompt

Tech Lead, precisamos definir a arquitetura inicial do projeto Whalet.

Contexto:

- Projeto ainda sem código
- Descobertas de produto já fechadas (auth, wallets, categories, entries, dashboard)
- Stack desejada: Next.js + NestJS + PostgreSQL + Prisma

Decisões a tomar:

1. Monorepo vs multirepo
2. Estrutura de pastas
3. Organização de apps (web, api)
4. Uso de packages/shared
5. Onde Prisma deve ficar
6. Estratégia de contratos entre front e backend
7. Estratégia de estado e data fetching no frontend
8. Padrão de modules/services no backend
9. Estratégia de cache (se houver)
10. Ordem de implementação

Execute:

1. Analise o contexto do produto
2. Tome decisões técnicas claras
3. Peça validação do backend e frontend leads
4. Consolide uma arquitetura final

Importante:

- foco em MVP
- evitar overengineering
- priorizar simplicidade com possibilidade de evolução

Formato de saída:

- Documento técnico consolidado
- Pronto para salvar em docs/architecture.md
