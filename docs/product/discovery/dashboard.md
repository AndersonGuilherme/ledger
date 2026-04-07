# Discovery — `/dashboard`

**Produto:** Ledger — Gestão Financeira Pessoal e para Pequenas Empresas
**Escopo:** Dashboard — tela principal de saúde financeira da carteira
**Data:** 2026-04-07
**Atualizado em:** 2026-04-07 — decisões abertas encerradas
**Stakeholders obrigatórios:** `design-lead`, `frontend-nextjs-lead`, `backend-nestjs-lead`
**Depende de:** `categories-entries.md`, `wallets.md`
**Status:** Aprovado — pronto para desenvolvimento

> **Princípio de design:** O dashboard não é um relatório. É uma **ferramenta de decisão**. Cada bloco de informação deve responder a uma pergunta acionável. Se o usuário vê o dado mas não sabe o que fazer com ele, o bloco não tem lugar no dashboard.

---

## Índice

1. [Objetivo Principal](#1-objetivo-principal)
2. [As Quatro Perguntas do Dashboard](#2-as-quatro-perguntas-do-dashboard)
3. [Hierarquia de Visualização](#3-hierarquia-de-visualização)
4. [Definição dos Blocos](#4-definição-dos-blocos)
5. [Cálculos Financeiros](#5-cálculos-financeiros)
6. [Filtro de Período](#6-filtro-de-período)
7. [Estados da Interface](#7-estados-da-interface)
8. [Dependências de Dados](#8-dependências-de-dados)
9. [Riscos](#9-riscos)
10. [Critérios de Aceite](#10-critérios-de-aceite)
11. [Backlog Inicial Priorizado](#11-backlog-inicial-priorizado)
12. [Decisões Encerradas](#12-decisões-encerradas)

---

## 1. Objetivo Principal

O dashboard deve responder à situação financeira da carteira em **menos de 10 segundos**, sem que o usuário precise navegar para outra tela.

### O que o dashboard é

- Visão consolidada e interpretada dos dados financeiros da carteira ativa
- Ponto de partida para decisões: pagar uma conta, registrar um gasto, criar uma meta
- Detector de problemas antes que virem crises

### O que o dashboard não é

- Substituto para os relatórios (`/reports`)
- Local para entrada de dados complexos
- Listagem exaustiva de lançamentos (`/entries`)
- Substituto para a gestão de orçamentos (`/budgets`)
- Visão consolidada de múltiplas carteiras — o dashboard é **sempre por carteira**

### Regra de ouro

> Se uma informação não altera o comportamento do usuário, ela não pertence ao dashboard.

---

## 2. As Quatro Perguntas do Dashboard

O dashboard existe para responder exatamente quatro perguntas, nessa ordem de prioridade:

```
1. "Como estou agora?"
   → BalanceSummaryCard: saldo atual, receitas, despesas, líquido do período

2. "Como vou terminar o mês?"
   → ProjectedBalanceCard: projeção até o fim do período

3. "Onde devo prestar atenção?"
   → BudgetAlertsCard + LateBillsCard: alertas ativos e urgentes

4. "O que está consumindo mais?"
   → TopExpensesList + ExpensesByCategoryChart: maiores gastos por categoria
```

Tudo que não responde a uma dessas quatro perguntas é candidato a remoção ou rebaixamento de prioridade visual.

---

## 3. Hierarquia de Visualização

### Layout de referência (topo → base)

```
┌─────────────────────────────────────────────┐
│  [WalletSwitcher]          [PeriodFilter]   │  ← contexto global
├─────────────────────────────────────────────┤
│                                             │
│          BalanceSummaryCard                 │  ← pergunta 1: "como estou?"
│   saldo atual | receitas | despesas | líq.  │
│                                             │
├─────────────────────────────────────────────┤
│          ProjectedBalanceCard               │  ← pergunta 2: "como vou terminar?"
│                                             │
├──────────────────────┬──────────────────────┤
│   BudgetAlertsCard   │    LateBillsCard     │  ← pergunta 3: "onde prestar atenção?"
│   (alertas ativos)   │  (contas urgentes)   │
├──────────────────────┴──────────────────────┤
│         ExpensesByCategoryChart             │  ← pergunta 4: "o que consome mais?"
│           + TopExpensesList                 │
├─────────────────────────────────────────────┤
│    IncomeByCategoryChart (condicional)      │  ← apenas com 3+ categorias de receita
├─────────────────────────────────────────────┤
│           RecentEntriesList                 │  ← contexto recente
│                                             │
├─────────────────────────────────────────────┤
│              QuickActionBar                 │  ← ação imediata (fixo no bottom ou top)
└─────────────────────────────────────────────┘
```

### Prioridade visual por bloco

| Posição | Bloco | Justificativa |
|---|---|---|
| 1 | WalletSwitcher + PeriodFilter | Contexto obrigatório: sem isso, nenhum dado faz sentido |
| 2 | BalanceSummaryCard | A pergunta mais urgente do usuário |
| 3 | ProjectedBalanceCard | Segunda pergunta mais urgente |
| 4 | BudgetAlertsCard + LateBillsCard | Alertas têm caráter de urgência — devem vir antes de gráficos |
| 5 | ExpensesByCategoryChart + TopExpensesList | Análise — importante, não urgente |
| 6 | IncomeByCategoryChart | Condicional — exibido apenas com 3+ categorias de receita com lançamentos no período |
| 7 | RecentEntriesList | Contexto — confirma que os dados estão atualizados |
| 8 | QuickActionBar | Ação — disponível sempre, sem competir visualmente com os dados |

### Bloco `IncomeByCategoryChart` — regra de exibição condicional

O gráfico de receitas por categoria é **ocultado por padrão** e exibido apenas quando:

- A carteira ativa possui **3 ou mais categorias de receita distintas** com pelo menos um lançamento `received` no período selecionado

**Motivação:** a maioria dos usuários tem uma ou duas fontes de receita — exibir o gráfico com uma ou duas fatias gera mais ruído visual do que informação útil.

---

## 4. Definição dos Blocos

### 4.1 WalletSwitcher

**Propósito:** Identificar em qual carteira o usuário está operando. Dado mais contextual do produto.

**Regras:**
- Sempre visível no topo do dashboard e em todas as páginas financeiras
- Exibe nome e tipo da carteira ativa
- Dropdown lista carteiras **ativas** do usuário (arquivadas não aparecem)
- Ao trocar de carteira, todos os dados do dashboard são recarregados — o `PeriodFilter` **não é resetado**
- A última carteira selecionada é persistida em **localStorage** por usuário no MVP — não salvar no backend
- Ao reabrir o app, restaurar a última carteira do localStorage se ela ainda estiver ativa e acessível; caso contrário, selecionar a carteira mais recente
- Se o usuário tem apenas uma carteira, o seletor ainda aparece (para futura criação de novas)

---

### 4.2 PeriodFilter

**Propósito:** Definir o intervalo de tempo dos dados exibidos.

**Opções:**

| Opção | Label | Comportamento |
|---|---|---|
| `current_month` | Este mês | Do dia 1 ao último dia do mês atual (padrão inicial) |
| `last_month` | Mês passado | Do dia 1 ao último dia do mês anterior |
| `last_3_months` | Últimos 3 meses | Dos últimos 90 dias até hoje |
| `last_6_months` | Últimos 6 meses | Dos últimos 180 dias até hoje |
| `current_year` | Este ano | De 1º de janeiro ao 31 de dezembro do ano atual |
| `custom` | Personalizado | Date range picker com limite máximo de 24 meses |

**Regras:**
- Padrão ao abrir o dashboard pela **primeira vez na sessão**: `current_month`
- Seleção persistida durante a sessão inteira — não reseta ao navegar para outra página e voltar
- **Trocar de carteira mantém o período selecionado** — o PeriodFilter não é resetado na troca de carteira
- Ao selecionar `custom`, exibir date range picker inline (não modal)
- Limite máximo da seleção customizada: 24 meses
- PeriodFilter afeta: BalanceSummaryCard (receitas/despesas/líquido), ProjectedBalanceCard, ExpensesByCategoryChart, IncomeByCategoryChart, TopExpensesList, BudgetAlertsCard
- PeriodFilter **não afeta**: BalanceSummaryCard (saldo atual acumulado), LateBillsCard, RecentEntriesList

---

### 4.3 BalanceSummaryCard

**Propósito:** Responder "como estou agora?" com os quatro números mais importantes.

**Quatro métricas exibidas:**

| Métrica | Cálculo | Afetado pelo PeriodFilter? |
|---|---|---|
| Saldo Atual | Ver seção 5.1 | **Não** — acumulado histórico |
| Receitas no Período | `SUM(income WHERE status=received AND competence_date IN period)` | **Sim** |
| Despesas no Período | `SUM(expense WHERE status=paid AND competence_date IN period)` | **Sim** |
| Saldo Líquido do Período | `Receitas no Período - Despesas no Período` | **Sim** |

**Regras visuais:**
- Saldo Atual: maior destaque tipográfico — é o número mais consultado; label "Saldo Total (acumulado)"
- Saldo Líquido: cor verde se positivo, vermelho se negativo, cinza se zero
- Todos os valores formatados no locale e moeda da carteira
- Valores nunca truncados — se grande demais, usar abreviação inteligente (ex: R$ 12,4k)
- Tooltip no Saldo Atual explicando que representa o acumulado histórico, não o período selecionado

---

### 4.4 ProjectedBalanceCard

**Propósito:** Responder "como vou terminar o período?" antecipando o impacto dos lançamentos planejados.

**Cálculo:** Ver seção 5.2.

**Elementos visuais:**

```
Saldo projetado ao fim do período

  R$ 3.200,00
  ▲ R$ 800,00 acima do saldo atual

  Previsto receber:   R$ 4.500,00
  Previsto pagar:     R$ 3.700,00
  Lançamentos atraso: R$ 800,00 (atenção)
```

**Regras:**
- Se saldo projetado < saldo atual → destaque em laranja (risco de déficit)
- Se saldo projetado < 0 → destaque em vermelho com mensagem contextual indicando qual categoria ou conta principal causa o déficit
- Exibir separadamente o total de lançamentos em atraso que compõem a projeção
- Quando não há lançamentos planejados no período: exibir "Sem lançamentos previstos" no lugar da projeção incremental

---

### 4.5 BudgetAlertsCard

**Propósito:** Alertar sobre categorias que estão consumindo mais do que o planejado ou se aproximando do limite.

**Limiar de alerta:** **80% fixo** — não configurável pelo usuário no MVP.

**Lógica de exibição:**

```
Alertas exibidos, em ordem de criticidade:

  1. Categorias já acima de 100% do orçamento (estourado)
  2. Categorias entre 80% e 100% do orçamento (atenção)
  3. Categorias entre 60% e 80% (aviso suave — exibir apenas se couber)
```

**Regras:**
- Exibir no máximo 4 alertas; se houver mais, exibir "Ver todos os alertas" → `/budgets`
- Ordenação: percentual decrescente (mais crítico primeiro)
- Se nenhum orçamento foi configurado: exibir card com CTA "Criar orçamento" → `/budgets`
- Se todos os orçamentos estão abaixo de 80%: exibir mensagem positiva "Orçamentos sob controle"
- Limiar de alerta de 80% é fixo no MVP — configurabilidade fica para settings futuras

**Formato de cada alerta:**

```
[ícone] Alimentação       ████████░░  82%
        R$ 820 de R$ 1.000
```

---

### 4.6 LateBillsCard

**Propósito:** Sinalizar contas atrasadas e vencimentos próximos para que o usuário tome ação imediata.

**Janela de "vencendo em breve": 7 dias fixos** — não configurável pelo usuário no MVP.

**Duas seções do card:**

```
Seção 1: Em atraso
  Lançamentos com status = late ou planned com competence_date < hoje
  Ordenados por data mais antiga primeiro

Seção 2: Vencendo em breve (próximos 7 dias)
  Lançamentos com status = planned e competence_date entre hoje e hoje+7
  Ordenados por data mais próxima primeiro
```

**Regras:**
- Limite de exibição: 3 itens por seção — se houver mais, exibir "Ver todos" → `/entries?status=late`
- LateBillsCard **não é afetado pelo PeriodFilter** — mostra sempre o que está atrasado ou vence nos próximos 7 dias, independente do período selecionado
- Cada item exibe: descrição, categoria, valor, data de competência e status
- Ação inline por item: botão "Pagar" → abre modal de confirmação com campo de data de pagamento
- Se não há atrasos nem vencimentos nos próximos 7 dias: **ocultar o card completamente** (não exibir card vazio)
- Janela de 7 dias é fixa no MVP — configurabilidade fica para settings futuras

---

### 4.7 ExpensesByCategoryChart + TopExpensesList

**Propósito:** Responder "onde está indo meu dinheiro?" de forma visual e rankeável.

**ExpensesByCategoryChart:**
- Gráfico de donut com categorias de despesa realizadas no período
- Máximo 5 fatias nomeadas + fatia "Outros" agrupando o restante
- Ao clicar em uma fatia: destaque + filtra a TopExpensesList para aquela categoria
- Sem dados: exibir estado vazio com mensagem contextual

**TopExpensesList:**
- Lista rankeada por valor pago no período
- Exibe: posição, nome da categoria, valor total, % do total de despesas
- Se há orçamento para a categoria: exibir barra de progresso inline
- Limite: 5 categorias + "Ver mais" → `/entries?type=expense`
- Clique na categoria → `/entries?category_id=X&period=...`

**Regras:**
- Ambos os blocos usam `status = paid` exclusivamente — planejados não entram
- Período controlado pelo PeriodFilter
- Subcategorias são agrupadas sob a categoria-pai no chart (detalhamento disponível em `/reports`)

---

### 4.8 IncomeByCategoryChart

**Propósito:** Mostrar de onde vem a receita quando há diversidade suficiente de fontes.

**Regra de exibição condicional:**
- Exibido **somente** quando houver 3 ou mais categorias de receita distintas com ao menos um lançamento `received` no período selecionado
- Oculto em todos os outros casos — sem exibir placeholder ou card vazio
- Período controlado pelo PeriodFilter

---

### 4.9 RecentEntriesList

**Propósito:** Confirmar que os dados estão atualizados e dar acesso rápido a lançamentos recentes.

**Regras:**
- Exibe os últimos 5 lançamentos criados na carteira ativa, **independente do período selecionado**
- Ordenados por `created_at` decrescente (mais recente primeiro)
- Exibe: tipo (ícone), descrição, categoria, valor, status badge e data de competência
- Clique no lançamento → abre `EntryDetailsDrawer` inline
- Rodapé: "Ver todos os lançamentos" → `/entries`
- Sem lançamentos: exibir estado vazio com CTA "Adicionar primeiro lançamento"

---

### 4.10 QuickActionBar

**Propósito:** Reduzir ao máximo o tempo entre "quero registrar algo" e "registrei".

**Ações disponíveis:**

| Ação | Label | Comportamento |
|---|---|---|
| Nova receita | + Receita | Abre EntryFormModal pré-preenchido com type=income |
| Nova despesa | + Despesa | Abre EntryFormModal pré-preenchido com type=expense |
| Nova transferência | + Transferência | Abre EntryFormModal pré-preenchido com type=transfer |

**Regras:**
- Visível para `owner`, `admin` e `editor`; **oculto para `viewer`**
- QuickActionBar é fixo — visível sem scroll na versão desktop; sticky bottom na versão mobile
- Ações abrem modal inline — não abrem nova página para preservar o contexto do dashboard
- Após criar o lançamento: **invalidação seletiva + refetch** dos blocos afetados (BalanceSummaryCard e RecentEntriesList no mínimo) — sem full reload da página e sem atualização otimista para cálculos financeiros agregados

---

## 5. Cálculos Financeiros

> Todas as fórmulas são escopadas por `wallet_id`. Nenhum dado cruza carteiras.
> **Base de cálculo:** `competence_date` em todo o dashboard — `payment_date` fica restrito a relatórios e filtros avançados em `/reports`.
> O dashboard é **sempre por carteira ativa** — não existe visão consolidada multi-carteira no MVP.

### 5.1 Saldo Atual (acumulado)

```
Saldo Atual =
  SUM(amount WHERE type='income' AND status='received' AND deleted_at IS NULL)
  - SUM(amount WHERE type='expense' AND status='paid' AND deleted_at IS NULL)

Escopo: TODOS os lançamentos da carteira desde o início, sem filtro de período
```

**Por que sem filtro de período?**
O saldo atual representa o estado real do caixa acumulado. Filtrar por período criaria a falsa impressão de que o dinheiro de meses anteriores "sumiu". O período afeta apenas as métricas de fluxo (receitas, despesas, líquido do período).

---

### 5.2 Saldo Projetado

```
Saldo Projetado =
  Saldo Atual
  + SUM(amount WHERE type='income' AND status IN ('planned','late')
        AND competence_date <= fim_do_período AND deleted_at IS NULL)
  - SUM(amount WHERE type='expense' AND status IN ('planned','late')
        AND competence_date <= fim_do_período AND deleted_at IS NULL)

Escopo: lançamentos da carteira de hoje até o fim do período selecionado
```

**Lançamentos em atraso na projeção:**
Entradas com `status = late` entram na projeção como obrigações pendentes — representam compromissos financeiros reais não cumpridos. São destacadas separadamente no `ProjectedBalanceCard`.

---

### 5.3 Saldo Líquido do Período

```
Saldo Líquido do Período =
  SUM(amount WHERE type='income' AND status='received'
      AND competence_date IN [período] AND deleted_at IS NULL)
  - SUM(amount WHERE type='expense' AND status='paid'
      AND competence_date IN [período] AND deleted_at IS NULL)

Escopo: apenas o período selecionado no PeriodFilter
```

---

### 5.4 Receitas e Despesas do Período

```
Receitas do Período =
  SUM(amount WHERE type='income' AND status='received'
      AND competence_date IN [período] AND deleted_at IS NULL)

Despesas do Período =
  SUM(amount WHERE type='expense' AND status='paid'
      AND competence_date IN [período] AND deleted_at IS NULL)
```

**Lançamentos planejados NÃO entram nas métricas de receita/despesa do período** — apenas nos cálculos de projeção.

---

### 5.5 Tratamento de previstos vs. pagos

| Tipo | Status | Saldo Atual | Receitas/Despesas do Período | Saldo Projetado |
|---|---|---|---|---|
| income | received | ✅ | ✅ | ❌ (já realizado) |
| income | planned | ❌ | ❌ | ✅ |
| income | late | ❌ | ❌ | ✅ (com alerta) |
| expense | paid | ✅ | ✅ | ❌ (já realizado) |
| expense | planned | ❌ | ❌ | ✅ |
| expense | late | ❌ | ❌ | ✅ (com alerta) |
| transfer | completed | Neutro | Neutro | Neutro |
| transfer | planned | ❌ | ❌ | Neutro |

---

### 5.6 Transferências e o dashboard

Transferências entre carteiras do mesmo usuário não afetam o saldo individual de cada carteira de forma cruzada — cada carteira mostra apenas seu próprio efeito (saída ou entrada). O efeito no saldo consolidado do usuário é nulo, mas o dashboard exibe sempre apenas a carteira ativa.

---

## 6. Filtro de Período

### 6.1 Comportamento do PeriodFilter

| Situação | Comportamento |
|---|---|
| Primeira abertura do dashboard na sessão | `current_month` (padrão) |
| Navegar para outra página e voltar ao dashboard | Manter período da sessão |
| **Trocar de carteira** | **Manter o período selecionado — não resetar** |
| Usuário altera manualmente | Período atualizado e persistido na sessão |

---

### 6.2 Impacto por bloco

| Bloco | Afetado pelo PeriodFilter? | Observação |
|---|---|---|
| WalletSwitcher | Não | — |
| BalanceSummaryCard — Saldo Atual | **Não** | Acumulado histórico; independente de período |
| BalanceSummaryCard — Receitas/Despesas/Líquido | **Sim** | Filtrado por competence_date |
| ProjectedBalanceCard | **Sim** | Projeta até o fim do período |
| BudgetAlertsCard | **Sim** | Compara orçamento vs. realizado no período |
| LateBillsCard | **Não** | Baseado em data corrente; janela fixa de 7 dias |
| ExpensesByCategoryChart | **Sim** | — |
| TopExpensesList | **Sim** | — |
| IncomeByCategoryChart | **Sim** | Condicional: exibido apenas com 3+ categorias de receita no período |
| RecentEntriesList | **Não** | Sempre os 5 últimos por created_at |
| QuickActionBar | Não | — |

---

### 6.3 Casos extremos do filtro

| Situação | Comportamento esperado |
|---|---|
| Período sem lançamentos realizados | Exibir R$ 0,00 nas métricas de fluxo; Saldo Atual mantém valor acumulado correto |
| Período futuro (ex: próximo mês) | Receitas e despesas = R$ 0,00; Projeção = soma de todos os planejados |
| Período muito longo (6+ meses) | Loading skeleton enquanto dados chegam; sem bloqueio |
| Data de início > data de fim (custom) | Bloqueado no date picker — não pode ser submetido |
| IncomeByCategoryChart com menos de 3 categorias de receita no período | Bloco ocultado completamente |

---

## 7. Estados da Interface

### 7.1 `no_wallet` — sem carteira ativa

**Gatilho:** Usuário não completou onboarding ou todas as carteiras foram arquivadas.

**Exibição:**
- Mensagem central: "Você ainda não tem uma carteira ativa"
- CTA primário: "Criar carteira" → `/wallets`
- Nenhum bloco de dados exibido
- Não deve ocorrer em fluxo normal pós-onboarding

---

### 7.2 `loading` — carregando dados

**Gatilho:** Primeira carga ou troca de carteira/período.

**Exibição:**
- Skeleton de cada bloco na posição correta da hierarquia
- WalletSwitcher e PeriodFilter já visíveis e interativos
- QuickActionBar já visível (não depende de dados)
- Skeletons com a mesma altura aproximada dos blocos reais
- Timeout de 10 segundos: se resposta não chegou, transicionar para estado `error`

---

### 7.3 `wallet_empty` — carteira sem lançamentos

**Gatilho:** Carteira existe e está ativa, mas sem nenhum lançamento.

**Exibição:**

```
BalanceSummaryCard:
  Saldo Atual: R$ 0,00 | Receitas: R$ 0,00 | Despesas: R$ 0,00 | Líquido: R$ 0,00

ProjectedBalanceCard:
  "Sem lançamentos previstos. Comece adicionando receitas e despesas."

ExpensesByCategoryChart: estado vazio com mensagem contextual

BudgetAlertsCard: CTA "Criar seu primeiro orçamento" → /budgets

RecentEntriesList: estado vazio com CTA "Adicionar primeiro lançamento"

IncomeByCategoryChart: oculto (0 categorias de receita — condição não atendida)

QuickActionBar: visível e funcional — principal CTA desta tela
```

**Regra:** todo estado vazio deve ser útil, não apenas informativo. Cada seção vazia entrega um CTA contextual.

---

### 7.4 `with_data` — carteira com dados

Estado normal de operação. Todos os blocos exibidos conforme definido na seção 4.

**Sub-estados por bloco:**

| Bloco | Sub-estado possível |
|---|---|
| BudgetAlertsCard | Sem alertas (todos abaixo de 80%) → mensagem positiva; com alertas → lista priorizada |
| LateBillsCard | Sem atrasos nem vencimentos em 7 dias → oculto |
| ExpensesByCategoryChart | Sem despesas `paid` no período → estado vazio contextual |
| IncomeByCategoryChart | Menos de 3 categorias de receita com lançamentos → oculto |
| ProjectedBalanceCard | Sem planejados → exibe saldo atual como projeção sem delta |

---

### 7.5 `error` — falha total de carregamento

**Gatilho:** Timeout ou erro de rede no endpoint agregado.

**Exibição:**
- Mensagem: "Não foi possível carregar os dados. Verifique sua conexão."
- Botão "Tentar novamente" — dispara novo fetch do endpoint agregado
- WalletSwitcher, PeriodFilter e QuickActionBar permanecem visíveis

---

### 7.6 `partial_error` — falha em bloco específico

**Gatilho:** O endpoint agregado retorna dados parciais com erro representado no payload para um bloco específico.

**Exibição:**
- O bloco afetado exibe mensagem de erro inline com botão "Recarregar"
- Demais blocos funcionam normalmente com seus dados
- Não bloqueia a experiência global

---

## 8. Dependências de Dados

### 8.1 Endpoint agregado único

O dashboard usa um **único endpoint agregado** no MVP. Não há múltiplos endpoints paralelos por bloco.

```
GET /wallets/:walletId/dashboard
    query: period_start, period_end

Response: {
  balance: {
    current: number,           // saldo atual acumulado (sem filtro de período)
    period_income: number,     // receitas received no período (competence_date)
    period_expense: number,    // despesas paid no período (competence_date)
    period_net: number,        // líquido do período
    projected: number,         // saldo projetado ao fim do período
    projected_income: number,  // total planned/late a receber até fim do período
    projected_expense: number, // total planned/late a pagar até fim do período
    late_amount: number        // total em atraso (dentro do projetado)
  },
  top_expense_categories: [
    { category_id, name, amount, budget_amount?, budget_percentage?, position }
  ],
  income_categories_count: number,  // para determinar se IncomeByCategoryChart deve ser exibido
  income_categories: [              // retornado sempre; frontend decide se exibe
    { category_id, name, amount, percentage }
  ],
  budget_alerts: [
    { category_id, name, budget_amount, realized_amount, percentage, alert_status }
    // alert_status: 'over_budget' | 'warning' | 'soft_warning'
  ],
  late_bills: [
    { entry_id, description, category_name, amount, competence_date, status }
  ],
  upcoming_bills: [               // vencendo nos próximos 7 dias
    { entry_id, description, category_name, amount, competence_date, days_until_due }
  ],
  recent_entries: [               // últimos 5 por created_at, independente do período
    { entry_id, type, description, category_name, amount, status, competence_date }
  ],
  block_errors: {                 // erros por bloco sem quebrar o payload global
    budget_alerts?: string,
    late_bills?: string,
    recent_entries?: string
  }
}
```

**Decisões da arquitetura:**
- Endpoint único — sem múltiplos fetches paralelos no MVP
- Erros internos por bloco representados em `block_errors` — não quebram o payload
- Frontend exibe `partial_error` nos blocos com erros em `block_errors`
- Invalidação seletiva após ação do QuickActionBar: refetch do endpoint agregado com os parâmetros do período atual

---

### 8.2 Dependências por funcionalidade

| Funcionalidade | Depende de |
|---|---|
| BalanceSummaryCard | Entries (status, competence_date, amount, type) |
| ProjectedBalanceCard | Entries (status planned/late, competence_date futura) |
| BudgetAlertsCard | Budgets + Entries realized do período |
| LateBillsCard | Entries (late ou planned com competence_date < hoje ou entre hoje e hoje+7) |
| ExpensesByCategoryChart + TopExpensesList | Entries paid + Categories + Budgets (opcional) |
| IncomeByCategoryChart | Entries received + Categories (condicional: 3+ categorias) |
| RecentEntriesList | Entries (últimas 5 por created_at, qualquer status) |
| QuickActionBar | Categories (pré-popular o formulário de criação) |

---

### 8.3 Pré-condições necessárias

- Wallet ativa selecionada
- Autenticação válida (AccessToken válido)
- Permissão mínima: `viewer` — **todos os roles podem ver o dashboard completo**
- QuickActionBar visível apenas para `owner`, `admin` e `editor`

---

## 9. Riscos

### 9.1 Inconsistência de cálculo

| ID | Risco | Severidade | Mitigação |
|---|---|---|---|
| R-01 | **"Saldo Atual" e "Receitas do Período" parecem contradizer-se** — usuário muda o período, saldo atual não muda mas receitas mudam | Alta | Label "Saldo Total (acumulado)" + tooltip explicativo. Receitas rotuladas como "Receitas deste período". |
| R-02 | **Lançamentos atrasados distorcem a projeção sem aviso** — saldo projetado parece positivo mas inclui atrasos não pagos | Alta | Separação visual obrigatória: "Inclui R$ X em atraso" destacado no ProjectedBalanceCard. |
| R-03 | **Transferência contada como despesa** — transferência saindo da carteira pode aparecer como despesa no gráfico | Alta | Transferências exibidas com ícone e label próprios; excluídas dos cálculos de receita/despesa. |
| R-04 | **Cache obsoleto após soft delete** — lançamento deletado continua no saldo exibido | Alta | Refetch do endpoint agregado ao criar, editar ou deletar qualquer entry da carteira ativa. |
| R-05 | **Confusão sobre competence_date vs. payment_date** — conta de fevereiro paga em março aparece no período errado para o usuário | Média | Tooltip informativo no PeriodFilter: "Os dados são agrupados pela data de competência do lançamento." |

### 9.2 Confusão de UX

| ID | Risco | Severidade | Mitigação |
|---|---|---|---|
| R-06 | **Usuário não sabe em qual carteira está** — após trocar de carteira, perde o contexto | Alta | WalletSwitcher sempre visível no header; nome da carteira exibido no título da página |
| R-07 | **Estado vazio parecendo erro** — carteira sem dados parece app quebrado | Alta | Empty states com ilustração amigável, texto explicativo e CTA claro — nunca tela em branco |
| R-08 | **Saldo projetado negativo sem contexto** — número vermelho sem explicação gera pânico desnecessário | Média | Ao projetado negativo: exibir qual categoria ou conta principal causa o déficit |
| R-09 | **localStorage de carteira aponta para carteira arquivada** — ao reabrir o app, tentativa de restaurar carteira inativa | Média | Validar se a carteira do localStorage ainda está ativa e acessível; fallback para carteira mais recente |
| R-10 | **QuickActionBar sobrepõe conteúdo no mobile** — botões flutuantes cobrem informações | Média | QuickActionBar sticky com margem inferior suficiente; conteúdo com padding-bottom adequado |

### 9.3 Excesso de informação

| ID | Risco | Severidade | Mitigação |
|---|---|---|---|
| R-11 | **Dashboard com 8+ blocos simultâneos paralisa o usuário** | Alta | Prioridade visual clara (seção 3); LateBillsCard oculto sem atrasos; IncomeByCategoryChart condicional |
| R-12 | **BudgetAlertsCard com 10+ alertas perde caráter de urgência** | Média | Máximo 4 alertas exibidos; "Ver todos" → `/budgets` |
| R-13 | **Excesso de cores e badges competindo pela atenção** | Média | Design system com hierarquia: vermelho = urgente, laranja = atenção, verde = positivo, cinza = neutro |

---

## 10. Critérios de Aceite

### 10.1 Carga e contexto

- [ ] **CA-01** — O dashboard carrega e exibe todos os blocos em menos de 3 segundos em conexão padrão
- [ ] **CA-02** — WalletSwitcher exibe apenas carteiras ativas do usuário autenticado
- [ ] **CA-03** — Ao trocar de carteira, todos os blocos são recarregados com os dados da nova carteira
- [ ] **CA-04** — PeriodFilter padrão ao abrir o dashboard pela primeira vez na sessão é "Este mês"
- [ ] **CA-05** — Trocar de carteira **mantém** o período selecionado no PeriodFilter — não reseta para `current_month`
- [ ] **CA-06** — A última carteira selecionada é salva em localStorage e restaurada ao reabrir o app, desde que ainda esteja ativa e acessível
- [ ] **CA-07** — Ao restaurar carteira do localStorage inativa ou inacessível, o app seleciona a carteira ativa mais recente sem exibir erro

### 10.2 Saldo e cálculos

- [ ] **CA-08** — Saldo Atual exibe o acumulado histórico de todos os lançamentos realized, independente do PeriodFilter
- [ ] **CA-09** — Label "Saldo Total (acumulado)" com tooltip explicativo diferencia o saldo atual das métricas de período
- [ ] **CA-10** — Receitas e Despesas do período usam `competence_date` para filtrar por período — não `payment_date`
- [ ] **CA-11** — Saldo Líquido do Período = Receitas do Período − Despesas do Período
- [ ] **CA-12** — Saldo Projetado inclui lançamentos `planned` e `late` com `competence_date` até o fim do período
- [ ] **CA-13** — Criar ou deletar lançamento dispara refetch seletivo do endpoint agregado — sem full reload da página
- [ ] **CA-14** — Lançamentos com `deleted_at IS NOT NULL` não entram em nenhum cálculo de saldo

### 10.3 Blocos de alerta

- [ ] **CA-15** — BudgetAlertsCard exibe apenas categorias a partir de 80% do orçamento — limiar fixo, sem configuração
- [ ] **CA-16** — BudgetAlertsCard exibe no máximo 4 alertas ordenados por percentual decrescente; se houver mais, exibe "Ver todos" → `/budgets`
- [ ] **CA-17** — BudgetAlertsCard exibe mensagem positiva "Orçamentos sob controle" quando todos estão abaixo de 80%
- [ ] **CA-18** — LateBillsCard exibe lançamentos `late` e `planned` com vencimento nos próximos **7 dias** — janela fixa
- [ ] **CA-19** — LateBillsCard não é afetado pelo PeriodFilter
- [ ] **CA-20** — LateBillsCard é completamente ocultado quando não há atrasos nem vencimentos nos próximos 7 dias
- [ ] **CA-21** — Ao clicar em "Pagar" em item do LateBillsCard, abre modal de confirmação com campo de data de pagamento

### 10.4 Gráficos e listas

- [ ] **CA-22** — ExpensesByCategoryChart exibe no máximo 5 fatias nomeadas + "Outros"
- [ ] **CA-23** — ExpensesByCategoryChart considera apenas despesas `paid` com `competence_date` no período
- [ ] **CA-24** — TopExpensesList exibe as 5 categorias com maior valor `paid` no período
- [ ] **CA-25** — IncomeByCategoryChart é exibido **somente** quando há 3 ou mais categorias de receita distintas com lançamentos `received` no período
- [ ] **CA-26** — IncomeByCategoryChart é completamente ocultado (sem placeholder) quando a condição de 3+ categorias não é atendida
- [ ] **CA-27** — RecentEntriesList exibe os últimos 5 lançamentos ordenados por `created_at` desc, independente do PeriodFilter

### 10.5 Estados e erros

- [ ] **CA-28** — Estado vazio exibe CTA contextual em cada bloco — nunca tela em branco
- [ ] **CA-29** — Em caso de falha total do endpoint, exibe mensagem de erro com botão "Tentar novamente"
- [ ] **CA-30** — Em caso de erro parcial (bloco_errors no payload), apenas o bloco afetado exibe erro inline — demais funcionam normalmente
- [ ] **CA-31** — Skeleton de carregamento é exibido na posição correta de cada bloco antes dos dados chegarem

### 10.6 Permissões

- [ ] **CA-32** — `viewer` pode ver o dashboard completo — nenhum bloco financeiro é ocultado por role no dashboard
- [ ] **CA-33** — QuickActionBar é visível para `owner`, `admin` e `editor`; completamente ocultado para `viewer`
- [ ] **CA-34** — Após criar lançamento via QuickActionBar, o endpoint agregado é refetchado seletivamente — sem full reload e sem atualização otimista nos cálculos agregados

---

## 11. Backlog Inicial Priorizado

### P0 — Crítico (bloqueante para MVP)

| ID | Item | Camada | Observação |
|---|---|---|---|
| B-01 | Endpoint agregado `GET /wallets/:id/dashboard?period_start&period_end` | Backend | Retorna todos os blocos; `block_errors` para falhas parciais |
| B-02 | Cálculo de saldo atual acumulado (todos os realized, sem filtro de período) | Backend | |
| B-03 | Cálculo de receitas, despesas e líquido filtrados por `competence_date` no período | Backend | |
| B-04 | Cálculo de saldo projetado (planned + late com competence_date até fim do período) | Backend | |
| B-05 | Cálculo de `income_categories_count` para controle do IncomeByCategoryChart | Backend | |
| B-06 | WalletSwitcher funcional com persistência em localStorage | Frontend | Validar carteira do localStorage ao restaurar |
| B-07 | PeriodFilter mantendo seleção ao trocar de carteira | Frontend | Não resetar ao trocar wallet |
| B-08 | BalanceSummaryCard com 4 métricas, label "acumulado" e tooltip | Frontend | |
| B-09 | ProjectedBalanceCard com indicador visual e separação de atrasos | Frontend | |
| B-10 | Loading skeletons para todos os blocos na hierarquia correta | Frontend | |
| B-11 | Estados vazios com CTA contextual por bloco | Frontend | |
| B-12 | Estado de erro total e parcial (block_errors) por bloco | Frontend | |
| B-13 | QuickActionBar oculto para `viewer`; refetch seletivo após criação | Frontend | Sem full reload, sem otimismo |

### P1 — Alta (experiência completa)

| ID | Item | Camada | Observação |
|---|---|---|---|
| B-14 | ExpensesByCategoryChart com donut, máximo 5 fatias + "Outros" | Frontend | |
| B-15 | TopExpensesList com rank e barra de progresso de orçamento | Frontend | |
| B-16 | BudgetAlertsCard com limiar de 80% fixo, máximo 4 alertas | Frontend / Backend | |
| B-17 | LateBillsCard com atrasos e janela fixa de 7 dias | Frontend / Backend | |
| B-18 | Ação inline "Pagar" no LateBillsCard com modal de confirmação | Frontend / Backend | |
| B-19 | IncomeByCategoryChart condicional (3+ categorias de receita no período) | Frontend | |
| B-20 | RecentEntriesList com EntryDetailsDrawer ao clicar | Frontend | |
| B-21 | Separação visual de lançamentos em atraso no ProjectedBalanceCard | Frontend | |
| B-22 | Invalidação e refetch do endpoint agregado ao criar/editar/deletar entry | Frontend / Backend | |

### P2 — Média (refinamento)

| ID | Item | Camada | Observação |
|---|---|---|---|
| B-23 | Tooltip no PeriodFilter sobre uso de `competence_date` | Frontend | |
| B-24 | Mensagem contextual quando projetado negativo (qual categoria causa déficit) | Frontend / Backend | |
| B-25 | PeriodFilter opção "Personalizado" com date range picker inline | Frontend | |
| B-26 | Dashboard responsivo com layout mobile (QuickActionBar sticky bottom com padding correto) | Frontend | |
| B-27 | Fallback de localStorage: validar se carteira ainda está ativa/acessível ao restaurar | Frontend | |

---

## 12. Decisões Encerradas

Todas as decisões abaixo foram incorporadas nas seções anteriores deste documento. Não há questões abertas.

| ID | Questão | Decisão |
|---|---|---|
| D-01 | `IncomeByCategoryChart` deve ser exibido sempre ou apenas com 3+ categorias de receita ativas? | **Condicional.** Exibido somente com 3 ou mais categorias de receita distintas com lançamentos `received` no período. Oculto nos demais casos, sem placeholder. |
| D-02 | A última carteira selecionada é persistida por sessão ou por usuário? | **localStorage por usuário no MVP.** Sem persistência no backend. Ao restaurar, validar se a carteira ainda está ativa e acessível; caso contrário, usar a carteira mais recente. |
| D-03 | O limiar de alerta de orçamento (80%) será fixo ou configurável? | **Fixo em 80% no MVP.** Configurabilidade fica para settings em fase futura. |
| D-04 | Agrupamento por período usa `competence_date` ou `payment_date`? | **`competence_date` em todo o dashboard.** `payment_date` restrito a relatórios e filtros avançados em `/reports`. Alinhado com `categories-entries.md`. |
| D-05 | Haverá visão consolidada multi-carteira no dashboard? | **Não no MVP.** O dashboard é sempre por carteira ativa. O endpoint permanece orientado à carteira. |
| D-06 | Endpoint agregado único ou múltiplos endpoints paralelos? | **Endpoint agregado único** `GET /wallets/:id/dashboard`. Erros por bloco representados em `block_errors` no payload, sem quebrar a estrutura global. |
| D-07 | Janela de "vencendo em breve" no LateBillsCard: fixo ou configurável? | **Fixo em 7 dias no MVP.** Configurabilidade fica para settings em fase futura. |
| D-08 | `viewer` pode ver o dashboard completo ou há dados ocultos por role? | **Dashboard completo para todos os roles, incluindo `viewer`.** Restrições de role continuam nas ações de escrita — não na leitura do dashboard. |
| D-09 | Atualização após QuickActionBar: full reload, invalidação seletiva ou otimista? | **Invalidação seletiva + refetch do endpoint agregado.** Sem full reload. Sem atualização otimista para cálculos financeiros agregados no MVP. |
| D-10 | Trocar de carteira reseta o PeriodFilter ou mantém o período? | **Mantém o período selecionado.** O PeriodFilter não é resetado ao trocar de carteira. O usuário altera o período manualmente quando quiser. |
