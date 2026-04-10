# discovery

## Purpose

Transformar uma ideia vaga em um plano claro de produto, com MVP definido, riscos identificados e backlog estruturado.

Esse pipeline NÃO implementa nada.

---

## Steps

### 1. product-owner-orchestrator

Responsável por:

- Entender a ideia do usuário
- Traduzir em problema real
- Definir objetivo inicial
- Identificar contexto do produto

Output esperado:

- descrição do problema
- hipótese de solução
- objetivo da feature

---

### 2. product-analyst

Responsável por:

- Definir persona
- Mapear cenários de uso
- Identificar dores reais
- Refinar proposta de valor

Output esperado:

- user stories
- cenários de uso
- definição de valor

---

### 3. design-lead

Responsável por:

- Definir fluxo do usuário
- Criar estrutura das telas
- Definir arquitetura de navegação
- Pensar experiência antes do código

Output esperado:

- fluxo do usuário
- descrição das telas
- hierarquia da interface
- estados (loading, empty, error)

---

### 4. data-architect

Responsável por:

- Identificar entidades envolvidas
- Avaliar impacto em dados existentes
- Sugerir estrutura inicial de dados
- Identificar complexidade futura

Output esperado:

- entidades afetadas
- relações entre entidades
- riscos de modelagem
- pontos críticos de consistência

---

### 5. backend-nestjs-lead

Responsável por:

- Traduzir domínio em API
- Definir endpoints necessários
- Identificar regras de negócio
- Avaliar complexidade técnica

Output esperado:

- lista de endpoints
- regras de negócio
- validações necessárias

---

### 6. security-red-team

Responsável por:

- Avaliar riscos de segurança
- Avaliar abuso de fluxo
- Identificar exposição de dados
- Revisar riscos financeiros

Output esperado:

- riscos classificados (critical/high/medium/low)
- cenários de ataque
- recomendações

---

### 7. qa-release-reviewer

Responsável por:

- Definir critérios de aceite
- Identificar edge cases
- Garantir testabilidade

Output esperado:

- critérios de aceite claros
- lista de edge cases
- cenários de teste

---

### 8. product-owner-orchestrator (final)

Responsável por:

- Consolidar tudo
- Definir escopo final
- Definir MVP
- Criar backlog priorizado

Output esperado:

- resumo executivo
- escopo MVP
- fora do escopo
- backlog inicial
- plano de execução

---

## Rules

- NÃO implementar nada neste pipeline
- Sempre começar pelo problema, não pela solução
- Sempre envolver design antes de qualquer decisão técnica
- Sempre envolver data-architect para features financeiras
- Sempre avaliar riscos antes de avançar
- Sempre terminar com critérios de aceite

---

## Output

Ao final do pipeline, deve existir:

- problema claramente definido
- solução proposta
- MVP definido
- entidades mapeadas
- fluxo do usuário definido
- endpoints definidos
- riscos identificados
- critérios de aceite
- backlog inicial estruturado

---

## When to use

- nova ideia de produto
- nova feature complexa
- dúvida sobre como implementar algo
- antes de iniciar qualquer desenvolvimento grande
