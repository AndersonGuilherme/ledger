# Discovery — `/categories` + `/entries`

**Produto:** Ledger — Gestão Financeira Pessoal e para Pequenas Empresas
**Escopo:** Categorias, subcategorias e lançamentos financeiros — motor central do produto
**Data:** 2026-04-07
**Stakeholders obrigatórios:** `data-architect`, `backend-nestjs-lead`
**Status:** Rascunho — aguarda validação das decisões abertas

> **Aviso de dependência:** Categories e Entries são a base de dados de todas as funcionalidades do Ledger. Budgets, Goals, Reports, Debts e Dashboard consomem diretamente essas entidades. Qualquer ambiguidade aqui gera inconsistência em cascata. Este documento deve ser aprovado antes de qualquer modelagem de banco.

---

## Índice

1. [Modelo de Categorias e Subcategorias](#1-modelo-de-categorias-e-subcategorias)
2. [Modelo de Lançamentos](#2-modelo-de-lançamentos)
3. [Comportamento dos Lançamentos](#3-comportamento-dos-lançamentos)
4. [Recorrência e Parcelamento](#4-recorrência-e-parcelamento)
5. [Regras de Impacto no Saldo](#5-regras-de-impacto-no-saldo)
6. [Entidades e Relações](#6-entidades-e-relações)
7. [Contratos de API — Alto Nível](#7-contratos-de-api--alto-nível)
8. [Riscos Críticos](#8-riscos-críticos)
9. [Critérios de Aceite](#9-critérios-de-aceite)
10. [Backlog Inicial Priorizado](#10-backlog-inicial-priorizado)
11. [Decisões Abertas](#11-decisões-abertas)

---

## 1. Modelo de Categorias e Subcategorias

### 1.1 Papel das categorias no produto

Categorias são o **vocabulário financeiro da carteira**. Elas organizam os lançamentos e são consumidas por:

- `/entries` → classificação de cada receita ou despesa
- `/budgets` → orçamento é definido por categoria ou subcategoria
- `/goals` → metas de limite de gasto por categoria
- `/reports` → relatórios agrupados por categoria
- `/dashboard` → gráficos de despesas e receitas por categoria

### 1.2 Tipos

| Tipo | Uso |
|---|---|
| `income` | Classifica receitas |
| `expense` | Classifica despesas |

- Uma categoria tem um único tipo, fixo na criação
- O tipo da categoria deve coincidir com o tipo do lançamento que a usa
- Transferências não usam categorias (ver D-01)

### 1.3 Hierarquia

```
Categoria (nível 1)
  └── Subcategoria (nível 2)
```

**Regras de hierarquia:**
- Máximo dois níveis — subcategorias não possuem filhos
- Um lançamento pode ser classificado em:
  - apenas a categoria (sem subcategoria)
  - categoria + subcategoria
- Subcategoria sempre pertence a exatamente uma categoria
- Não é possível usar uma subcategoria sem sua categoria-pai

### 1.4 Escopo por carteira

- Toda categoria pertence a exatamente uma carteira (`wallet_id`)
- Categorias não são compartilhadas entre carteiras — mesmo que o usuário seja owner de ambas
- Cada carteira tem seu próprio conjunto de categorias independente

### 1.5 Categorias padrão vs. customizadas

| Atributo | Padrão (template) | Customizada |
|---|---|---|
| Origem | Criadas automaticamente ao criar carteira | Criadas manualmente pelo usuário |
| `is_default` | `true` | `false` |
| Pode editar nome | Sim | Sim |
| Pode desativar | Sim | Sim |
| Pode excluir permanentemente | Não (ver D-02) | Sim (se sem lançamentos) |

### 1.6 Templates por tipo de carteira

| Tipo de carteira | Exemplos de categorias income | Exemplos de categorias expense |
|---|---|---|
| `personal` | Salário, Freelance, Investimento | Moradia, Alimentação, Saúde, Transporte, Lazer, Assinaturas |
| `family` | Salário Titular, Salário Parceiro, Outros | Casa, Educação, Alimentação, Saúde, Lazer |
| `business` | Serviços Prestados, Produtos, Contratos | Fornecedores, Impostos, Folha, Infraestrutura, Marketing |
| `project` | Aporte, Rendimento | Custo do Projeto, Reserva |

> Templates são definição de produto — devem ser validados com usuários reais antes do lançamento.

### 1.7 Ativação e desativação

- Toda categoria e subcategoria pode ser ativada/desativada (`active: boolean`)
- Categoria desativada: não aparece nos seletores de novos lançamentos
- **Dados históricos não são afetados** — lançamentos antigos mantêm referência à categoria desativada
- Relatórios e budgets históricos continuam exibindo a categoria mesmo desativada
- Desativar uma categoria-pai não desativa automaticamente suas subcategorias — ambas devem ser desativadas individualmente (ver D-03)
- Reativar uma categoria não reativa subcategorias desativadas

### 1.8 Exclusão permanente

- Só permitida para categorias **sem nenhum lançamento vinculado** (present or historical)
- Se há lançamentos: oferecer opção de desativar ao invés de excluir
- `CategoryUsageInfo` deve exibir a contagem de lançamentos antes de permitir exclusão

### 1.9 Estados da interface — `/categories`

| Estado | Descrição |
|---|---|
| `loading` | Carregando categorias da carteira |
| `empty_custom` | Apenas categorias padrão do template existem |
| `list_income` | Aba "Receita" ativa com lista de categorias |
| `list_expense` | Aba "Despesa" ativa com lista de categorias |
| `expanded_category` | Categoria com subcategorias expandidas |
| `open_create_category` | Modal de criação de categoria |
| `open_create_subcategory` | Modal de criação de subcategoria |
| `open_edit_category` | Modal de edição |
| `confirm_deactivate` | Confirmação de desativação |
| `confirm_delete` | Confirmação de exclusão (somente sem lançamentos) |
| `error_load` | Falha ao carregar — retry disponível |

---

## 2. Modelo de Lançamentos

### 2.1 Tipos de lançamento

```
Entry
  ├── income      → dinheiro que entra na carteira
  ├── expense     → dinheiro que sai da carteira
  └── transfer    → movimentação entre carteiras do usuário
```

### 2.2 Tabela de campos por tipo

| Campo | income | expense | transfer | Notas |
|---|---|---|---|---|
| `description` | obrigatório | obrigatório | obrigatório | |
| `amount` | obrigatório | obrigatório | obrigatório | sempre positivo |
| `wallet_id` | obrigatório | obrigatório | origem | carteira que origina |
| `destination_wallet_id` | — | — | obrigatório | carteira de destino |
| `category_id` | obrigatório | obrigatório | — | ver D-01 |
| `subcategory_id` | opcional | opcional | — | |
| `competence_date` | obrigatório | obrigatório | obrigatório | |
| `payment_date` | obrigatório se pago/recebido | obrigatório se pago | obrigatório se concluído | |
| `status` | obrigatório | obrigatório | obrigatório | ver seção 3.4 |
| `recurrence_id` | opcional | opcional | — | ver D-04 |
| `installment_group_id` | — | opcional | — | ver seção 4.2 |
| `notes` | opcional | opcional | opcional | |

### 2.3 Regras de valor

- `amount` é sempre um número **positivo**
- O sinal (entrada/saída) é determinado pelo `type` — nunca pelo valor
- Zero não é permitido como valor (ver D-05)
- Precisão: 2 casas decimais (ex: `1234.56`)
- Armazenar como `integer` em centavos para evitar erros de ponto flutuante (ex: `123456` = R$ 1.234,56)

---

## 3. Comportamento dos Lançamentos

### 3.1 Categoria e subcategoria

| Regra | Detalhe |
|---|---|
| Tipo de categoria deve coincidir com tipo do lançamento | Categoria `expense` não pode ser usada em lançamento `income` |
| Subcategoria deve pertencer à categoria selecionada | Impossível selecionar subcategoria de outra categoria |
| Subcategoria pertence implicitamente à categoria-pai | Lançamento com subcategoria sempre tem categoria inferida |
| Categoria inativa não pode ser usada em novos lançamentos | Validar no backend antes de persistir |

### 3.2 Datas: competência vs. pagamento

```
competence_date  = "a que período este lançamento pertence"
payment_date     = "quando o dinheiro efetivamente moveu"
```

**Exemplos práticos:**

| Situação | competence_date | payment_date |
|---|---|---|
| Aluguel de Dezembro pago em Janeiro | 2025-12-01 | 2026-01-05 |
| Salário de Março recebido em 5/Março | 2026-03-01 | 2026-03-05 |
| Despesa planejada para Abril (não paga) | 2026-04-15 | null |
| Conta de luz prevista | 2026-04-20 | null |

**Regras das datas:**

- `competence_date` é sempre obrigatório
- `payment_date` é obrigatório quando `status = paid` ou `status = received`
- `payment_date` deve ser null quando `status = planned`
- `payment_date` não precisa estar no mesmo mês que `competence_date`
- O dashboard usa `competence_date` para agrupar por período (ver D-06)

### 3.3 Status do lançamento

| Status | Código | Descrição | Afeta saldo real | Afeta saldo projetado |
|---|---|---|---|---|
| Previsto | `planned` | Registrado mas não concluído | Não | Sim |
| Pago | `paid` | Despesa efetivada | Sim (saída) | Não (já computado) |
| Recebido | `received` | Receita efetivada | Sim (entrada) | Não (já computado) |
| Atrasado | `late` | Prazo passou sem pagamento | Não | Sim (sinal de alerta) |

**Transições válidas de status:**

```
planned → paid       (despesa efetivada)
planned → received   (receita efetivada)
planned → late       (automático quando competence_date < hoje e ainda planned)
late    → paid       (despesa em atraso finalmente paga)
late    → received   (receita em atraso finalmente recebida)
paid    → planned    (desfazer pagamento — ver D-07)
received → planned   (desfazer recebimento — ver D-07)
```

**Status `late`:** pode ser computado automaticamente pelo sistema (quando `competence_date < today AND status = planned`) ou marcado manualmente. Recomendação: **computed na query, não armazenado** — elimina inconsistência de atualização em lote. Decidir em D-08.

### 3.4 Status da transferência

| Status | Código |
|---|---|
| Prevista | `planned` |
| Concluída | `completed` |
| Cancelada | `cancelled` |

Transferências não usam `paid`/`received` — o par de termos não faz sentido para movimentação interna.

### 3.5 Campos opcionais importantes

- `notes`: texto livre, máximo 500 caracteres
- `attachments`: fora do escopo do MVP — apenas estrutura prevista (ver roadmap Fase 4)

---

## 4. Recorrência e Parcelamento

### 4.1 Recorrência

Recorrência = lançamento que se repete automaticamente com uma frequência.

**Exemplos:** salário mensal, aluguel, assinatura Netflix, conta de água.

#### Frequências suportadas

| Frequência | Código | Exemplo |
|---|---|---|
| Semanal | `weekly` | Toda segunda-feira |
| Quinzenal | `biweekly` | A cada 15 dias |
| Mensal | `monthly` | Todo dia 5 do mês |
| Bimestral | `bimonthly` | A cada 2 meses |
| Trimestral | `quarterly` | A cada 3 meses |
| Semestral | `semiannual` | A cada 6 meses |
| Anual | `yearly` | Todo 15 de março |

#### Estrutura da recorrência

```
RecurrenceConfig
  ├── template (descrição, valor, categoria, subcategoria)
  ├── frequência e intervalo
  ├── data de início
  ├── data de fim (opcional — null = indefinida)
  └── status: active / paused / ended

Entry
  └── recurrence_id → RecurrenceConfig (nullable)
```

#### Geração de entradas recorrentes

- O sistema gera entradas com antecedência (ver D-09 — quanto tempo de geração antecipada)
- Entradas geradas têm `status = planned` por padrão
- Cada entrada gerada é **independente** — pode ser editada individualmente sem afetar as demais
- O usuário não edita a recorrência diretamente; ele edita as entradas

#### Estratégias de edição de uma entrada recorrente

Quando o usuário edita uma entrada que pertence a uma recorrência:

| Opção | Comportamento |
|---|---|
| **Editar apenas esta** | Desvincula do recorrência (`recurrence_id = null`), torna-se entrada standalone |
| **Editar esta e as futuras** | Encerra `RecurrenceConfig` atual, cria nova recorrência a partir desta data com os novos dados; entradas passadas inalteradas |
| **Editar todas** | Atualiza o template da `RecurrenceConfig`; entradas futuras geradas usam novo template; entradas passadas inalteradas |

#### Estratégias de exclusão de uma entrada recorrente

| Opção | Comportamento |
|---|---|
| **Excluir apenas esta** | Soft delete da entrada; recorrência continua |
| **Excluir esta e as futuras** | Soft delete das entradas futuras; `RecurrenceConfig.end_date = hoje` |
| **Excluir todas** | Soft delete de todas as entradas futuras; `RecurrenceConfig.status = ended` |

#### Problema do fim do mês

Quando a recorrência é "todo dia 31" e o mês tem 28 ou 30 dias:
- Opção A: usar o último dia do mês (`28/02`, `30/04`)
- Opção B: pular o mês (não gerar entrada neste mês)

**Recomendação:** Opção A — mais próximo da intenção do usuário. Definir como padrão e comunicar na UI. Registrar em D-10.

---

### 4.2 Parcelamento

Parcelamento = compra dividida em N parcelas fixas, geralmente cartão de crédito.

**Diferença em relação à recorrência:**

| Aspecto | Recorrência | Parcelamento |
|---|---|---|
| Duração | Indefinida | Finita (N parcelas) |
| Valor | Pode variar | Fixo por parcela |
| Origem | Padrão de gasto regular | Compra específica |
| Exemplo | Aluguel mensal | Sofá 12x R$ 150 |

#### Estrutura do parcelamento

```
Entry (installment 1/12)
  ├── installment_group_id → UUID compartilhado entre todas as parcelas
  ├── installment_position = 1
  └── installment_total = 12

Entry (installment 2/12)
  ├── installment_group_id → mesmo UUID
  ├── installment_position = 2
  └── installment_total = 12
```

- Cada parcela é uma entrada independente
- Todas as parcelas têm o mesmo `installment_group_id`
- Valor total da compra = `amount * installment_total` (armazenado no grupo ou computado)
- Todas as parcelas são criadas de uma vez, com competence_date incrementando mês a mês
- Editar uma parcela só altera aquela parcela (ou todas do grupo — ver D-11)
- Excluir uma parcela só exclui aquela (ou todas do grupo)

> **Nota MVP:** Parcelamento aumenta significativamente a complexidade do backend. Avaliar inclusão no MVP ou adiar para Fase 2. Ver D-12.

---

## 5. Regras de Impacto no Saldo

### 5.1 Princípio central

> **O saldo nunca é armazenado. É sempre calculado a partir dos lançamentos.**

Armazenar saldo como campo cria risco de inconsistência permanente. O sistema deve calcular saldos on-demand e usar cache com invalidação baseada em eventos de criação/edição/exclusão de lançamentos.

### 5.2 Fórmulas

```
Saldo Realizado =
  SUM(amount WHERE type = 'income' AND status = 'received')
  - SUM(amount WHERE type = 'expense' AND status = 'paid')

Saldo Projetado =
  Saldo Realizado
  + SUM(amount WHERE type = 'income' AND status IN ('planned', 'late'))
  - SUM(amount WHERE type = 'expense' AND status IN ('planned', 'late'))
```

> **Escopo:** todos os cálculos são filtrados por `wallet_id` e pelo período selecionado.

### 5.3 Tabela de impacto no saldo

| Tipo | Status | Saldo Realizado | Saldo Projetado |
|---|---|---|---|
| `income` | `planned` | ❌ | ✅ positivo |
| `income` | `received` | ✅ positivo | ❌ (já realizado) |
| `income` | `late` | ❌ | ✅ positivo (com alerta) |
| `expense` | `planned` | ❌ | ✅ negativo |
| `expense` | `paid` | ✅ negativo | ❌ (já realizado) |
| `expense` | `late` | ❌ | ✅ negativo (com alerta) |
| `transfer` | `planned` | ❌ | Neutro (cancela entre as carteiras) |
| `transfer` | `completed` | Neutro | Neutro |

### 5.4 Transferências e saldo

Uma transferência cria **dois registros de impacto atomicamente**:

```
Transferência: Carteira A → Carteira B, R$ 500

Efeito em Carteira A:
  → saída de R$ 500 (reduz saldo de A)

Efeito em Carteira B:
  → entrada de R$ 500 (aumenta saldo de B)

Efeito no saldo consolidado do usuário: ZERO
```

**Atomicidade obrigatória:** se a criação de um dos lados falhar, ambos devem ser revertidos. Usar transação de banco de dados.

### 5.5 Data de referência para agrupamento de saldo

Questão central: ao calcular saldo por período, usar `competence_date` ou `payment_date`?

**Recomendação:** usar `competence_date` como padrão para todos os agrupamentos de período (dashboard, relatórios, orçamentos). Isso garante que o aluguel de Dezembro seja contabilizado em Dezembro, mesmo que pago em Janeiro.

`payment_date` deve ser acessível como filtro adicional nos relatórios avançados.

Registrar como D-06.

### 5.6 Entradas deletadas

- Exclusão é **soft delete** (`deleted_at` timestamp)
- Entradas deletadas NÃO entram em nenhum cálculo de saldo
- Entradas deletadas permanecem no banco para fins de auditoria
- Exclusão permanente (hard delete) não é exposta para o usuário (ver D-13)

---

## 6. Entidades e Relações

### 6.1 Diagrama de relações

```
Wallet
  ├── Category (1-N)
  │     └── Subcategory (1-N)
  ├── Entry (1-N)
  │     ├── → Category (N-1, nullable para transfer)
  │     ├── → Subcategory (N-1, nullable)
  │     ├── → RecurrenceConfig (N-1, nullable)
  │     └── installment_group_id (agrupa parcelas, nullable)
  └── RecurrenceConfig (1-N)
```

---

### 6.2 Category

| Campo | Tipo | Regras |
|---|---|---|
| `id` | UUID | PK |
| `wallet_id` | UUID | FK → Wallet; obrigatório |
| `name` | string | 2–60 chars; único por wallet + type |
| `type` | enum | `income` / `expense` |
| `is_default` | boolean | criado via template |
| `active` | boolean | default `true` |
| `position` | integer | ordenação exibida na UI |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Constraints:**
- `UNIQUE (wallet_id, name, type)` — dois tipos podem ter o mesmo nome (ex: "Outros" income e "Outros" expense)

---

### 6.3 Subcategory

| Campo | Tipo | Regras |
|---|---|---|
| `id` | UUID | PK |
| `category_id` | UUID | FK → Category; obrigatório |
| `wallet_id` | UUID | FK → Wallet; denormalizado para queries diretas por carteira |
| `name` | string | 2–60 chars; único por category_id |
| `active` | boolean | default `true` |
| `position` | integer | ordenação |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Constraints:**
- `UNIQUE (category_id, name)`
- `wallet_id` deve ser igual ao `wallet_id` da categoria-pai (validar no backend)

---

### 6.4 Entry

| Campo | Tipo | Regras |
|---|---|---|
| `id` | UUID | PK |
| `wallet_id` | UUID | FK → Wallet; obrigatório |
| `type` | enum | `income` / `expense` / `transfer` |
| `amount` | integer | centavos; > 0 obrigatório |
| `description` | string | 2–200 chars; obrigatório |
| `category_id` | UUID | FK → Category; obrigatório para income/expense; null para transfer |
| `subcategory_id` | UUID | FK → Subcategory; opcional |
| `competence_date` | date | obrigatório |
| `payment_date` | date | obrigatório se status paid/received; null se planned/late |
| `status` | enum | `planned` / `paid` / `received` / `late` / `completed` / `cancelled` |
| `recurrence_id` | UUID | FK → RecurrenceConfig; nullable |
| `installment_group_id` | UUID | UUID compartilhado entre parcelas; nullable |
| `installment_position` | integer | 1-based; nullable |
| `installment_total` | integer | quantidade total de parcelas; nullable |
| `destination_wallet_id` | UUID | FK → Wallet; obrigatório se type=transfer; null caso contrário |
| `notes` | string | máximo 500 chars; opcional |
| `created_by` | UUID | FK → Account |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |
| `deleted_at` | timestamp | soft delete; null = ativa |

**Constraints:**
- `amount > 0`
- Se `type = income` → `status IN (planned, received, late)`
- Se `type = expense` → `status IN (planned, paid, late)`
- Se `type = transfer` → `status IN (planned, completed, cancelled)`
- `category_id` deve pertencer ao mesmo `wallet_id`
- `subcategory_id` deve pertencer à `category_id` informada
- `category_id.type` deve ser igual ao `entry.type` (quando não transfer)
- Se `installment_position IS NOT NULL` → `installment_total IS NOT NULL` e vice-versa

---

### 6.5 RecurrenceConfig

| Campo | Tipo | Regras |
|---|---|---|
| `id` | UUID | PK |
| `wallet_id` | UUID | FK → Wallet |
| `frequency` | enum | `weekly` / `biweekly` / `monthly` / `bimonthly` / `quarterly` / `semiannual` / `yearly` |
| `interval` | integer | repetição do ciclo; default 1 |
| `day_of_month` | integer | 1–31; para frequências mensais |
| `day_of_week` | integer | 0–6 (seg–dom); para frequências semanais |
| `start_date` | date | obrigatório |
| `end_date` | date | opcional; null = indefinido |
| `status` | enum | `active` / `paused` / `ended` |
| `template_amount` | integer | valor padrão das entradas geradas (centavos) |
| `template_description` | string | descrição padrão |
| `template_category_id` | UUID | FK → Category; nullable |
| `template_subcategory_id` | UUID | FK → Subcategory; nullable |
| `template_type` | enum | `income` / `expense` |
| `created_by` | UUID | FK → Account |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

---

## 7. Contratos de API — Alto Nível

> Todos os endpoints exigem autenticação. Wallet context é validado em cada request.

### 7.1 Categories

```
GET    /wallets/:walletId/categories
       query: type (income|expense), active (boolean)
       returns: Category[] com Subcategory[] aninhadas

POST   /wallets/:walletId/categories
       body: { name, type, position? }
       returns: Category criada

PATCH  /wallets/:walletId/categories/:categoryId
       body: { name?, active?, position? }
       returns: Category atualizada

DELETE /wallets/:walletId/categories/:categoryId
       → se tem lançamentos: 409 com sugestão de desativar
       → se sem lançamentos: soft delete ou hard delete (ver D-02)

GET    /wallets/:walletId/categories/:categoryId/subcategories
       returns: Subcategory[]

POST   /wallets/:walletId/categories/:categoryId/subcategories
       body: { name, position? }
       returns: Subcategory criada

PATCH  /wallets/:walletId/categories/:categoryId/subcategories/:subcategoryId
       body: { name?, active?, position? }
       returns: Subcategory atualizada

DELETE /wallets/:walletId/categories/:categoryId/subcategories/:subcategoryId
       → mesma lógica de lançamentos vinculados
```

---

### 7.2 Entries

```
GET    /wallets/:walletId/entries
       query: type, status, category_id, subcategory_id,
              competence_date_from, competence_date_to,
              payment_date_from, payment_date_to,
              min_amount, max_amount, search (text), created_by,
              page, limit, sort_by, sort_dir
       returns: Entry[] paginada com total e saldo do período

POST   /wallets/:walletId/entries
       body: { type, amount, description, category_id?, subcategory_id?,
               competence_date, payment_date?, status, notes?,
               recurrence?: { frequency, interval, start_date, end_date? } }
       returns: Entry criada (ou array se recorrente gerou múltiplas)

GET    /wallets/:walletId/entries/:entryId
       returns: Entry completa com categoria, subcategoria e recorrência

PATCH  /wallets/:walletId/entries/:entryId
       body: campos editáveis + scope? (this|this_and_future|all) para recorrentes
       returns: Entry atualizada

DELETE /wallets/:walletId/entries/:entryId
       query: scope? (this|this_and_future|all) para recorrentes
       returns: 204

POST   /wallets/:walletId/entries/:entryId/pay
       body: { payment_date }
       returns: Entry com status = paid

POST   /wallets/:walletId/entries/:entryId/receive
       body: { payment_date }
       returns: Entry com status = received

POST   /wallets/:walletId/entries/:entryId/unmark
       → reverte paid → planned ou received → planned (ver D-07)
       returns: Entry com status = planned

POST   /wallets/:walletId/entries/bulk-pay
       body: { entry_ids[], payment_date }
       returns: { updated: number, failed: EntryId[] }
```

---

### 7.3 Transfers

```
POST   /transfers
       body: { from_wallet_id, to_wallet_id, amount, description,
               competence_date, payment_date?, notes? }
       → cria dois registros atomicamente
       returns: { source_entry: Entry, destination_entry: Entry }

PATCH  /transfers/:transferGroupId
       → edita os dois lados atomicamente
       returns: { source_entry, destination_entry }

DELETE /transfers/:transferGroupId
       → soft delete dos dois lados atomicamente
       returns: 204
```

---

### 7.4 Saldo e projeções

```
GET    /wallets/:walletId/balance
       query: period_start, period_end
       returns: {
         realized: number,
         projected: number,
         income_realized: number,
         expense_realized: number,
         income_planned: number,
         expense_planned: number
       }
```

---

## 8. Riscos Críticos

### 8.1 Inconsistência de saldo

| ID | Risco | Severidade | Mitigação |
|---|---|---|---|
| R-01 | **Saldo armazenado desincronizado** — se saldo for campo calculado e armazenado, qualquer criação/edição sem atualizar o campo gera inconsistência permanente | Crítica | **Nunca armazenar saldo.** Sempre calcular a partir de entries. Usar cache com TTL curto e invalidação por evento. |
| R-02 | **Transferência parcialmente criada** — se o lado da carteira de destino falhar após o lado de origem ser criado, o saldo da origem é impactado incorretamente | Crítica | Transferência deve usar **transação atômica de banco de dados**. Se um lado falha, ambos são revertidos. |
| R-03 | **Amount negativo aceito por bug** — se validação falhar, despesas com valor negativo entram como receita no cálculo | Alta | Constraint `CHECK (amount > 0)` no banco. Validação adicional no backend. Testes unitários. |
| R-04 | **Status inconsistente com datas** — entry `paid` sem `payment_date` ou entry `planned` com `payment_date` gera relatórios errados | Alta | Validação cruzada status + payment_date tanto na camada de API quanto no banco. |

---

### 8.2 Duplicidade

| ID | Risco | Severidade | Mitigação |
|---|---|---|---|
| R-05 | **Gerador de recorrência executa duas vezes** — job de geração de entradas futuras roda em paralelo e cria entradas duplicadas | Alta | Idempotência no gerador: constraint `UNIQUE (recurrence_id, competence_date)`; gerador usa lock distribuído. |
| R-06 | **Retry de criação de entry** — falha de rede no frontend, usuário clica duas vezes, entrada criada duplicada | Alta | Implementar `idempotency_key` no POST de entries. Frontend deve desabilitar botão após primeiro clique. |
| R-07 | **Parcelamento parcialmente criado** — criação de 12 parcelas falha na 8ª; usuário cria novamente e tem 8 + 12 = 20 parcelas | Alta | Criação de parcelamento em transação única: ou todas as parcelas são criadas ou nenhuma. Rollback em falha. |

---

### 8.3 Erros de recorrência

| ID | Risco | Severidade | Mitigação |
|---|---|---|---|
| R-08 | **Geração retroativa indesejada** — recorrência pausada tem `end_date` expirado; ao reativar, o sistema gera entradas para os meses passados | Alta | Ao reativar recorrência pausada, gerar apenas entradas a partir de `hoje`, nunca retroativamente. |
| R-09 | **Dia 31 em meses curtos** — recorrência configurada para dia 31 tenta gerar em fevereiro (28 dias) | Média | Usar o último dia do mês quando o dia configurado não existe. Exibir aviso na UI na criação. |
| R-10 | **Geração muito à frente** — gerador cria entradas para 5 anos no futuro, dificultando edição e projeções | Média | Definir horizonte máximo de geração (ex: 13 meses à frente). Ver D-09. |
| R-11 | **Carteira arquivada com recorrência ativa** — entradas futuras continuam sendo geradas para carteira que não aceita mais lançamentos | Média | Ao arquivar carteira, encerrar (`status = ended`) todas as `RecurrenceConfig` ativas vinculadas. |

---

### 8.4 Erros de categorização

| ID | Risco | Severidade | Mitigação |
|---|---|---|---|
| R-12 | **Categoria com tipo errado para o lançamento** — income category usado em expense entry via manipulação de API | Alta | Validação cruzada `entry.type === category.type` no backend. Constraint não pode ser apenas na UI. |
| R-13 | **Subcategoria órfã** — subcategoria passada no body não pertence à categoria informada | Alta | Validar `subcategory.category_id === category_id` no backend antes de persistir. |
| R-14 | **Categoria de outra carteira** — `category_id` passado pertence a outra wallet do usuário | Alta | Validar `category.wallet_id === entry.wallet_id` no backend. |
| R-15 | **Categoria desativada reutilizada** — usuário envia `category_id` de categoria inativa em novo lançamento | Média | Validar `category.active === true` no POST/PATCH de entries. Retornar 422 com mensagem clara. |

---

## 9. Critérios de Aceite

### 9.1 Categorias

- [ ] **CA-01** — Usuário com role owner/admin/editor pode criar categorias na carteira ativa
- [ ] **CA-02** — Categoria criada com tipo inválido (fora de income/expense) é rejeitada
- [ ] **CA-03** — Duas categorias do mesmo tipo não podem ter o mesmo nome na mesma carteira
- [ ] **CA-04** — Subcategoria é vinculada exclusivamente à categoria selecionada
- [ ] **CA-05** — Categoria desativada não aparece nos seletores de novos lançamentos
- [ ] **CA-06** — Lançamentos históricos vinculados à categoria desativada permanecem intactos
- [ ] **CA-07** — `CategoryUsageInfo` exibe a quantidade correta de lançamentos antes de exclusão
- [ ] **CA-08** — Tentativa de excluir categoria com lançamentos retorna erro com sugestão de desativação
- [ ] **CA-09** — Categorias de outra carteira não aparecem nos seletores da carteira ativa
- [ ] **CA-10** — `viewer` não enxerga opções de criar, editar ou desativar categorias

### 9.2 Lançamentos — criação e validação

- [ ] **CA-11** — Lançamento `income` ou `expense` sem `category_id` é rejeitado pelo backend
- [ ] **CA-12** — Lançamento com `category_id` de tipo oposto ao lançamento é rejeitado
- [ ] **CA-13** — `subcategory_id` que não pertence à `category_id` informada é rejeitado
- [ ] **CA-14** — `amount = 0` ou negativo é rejeitado
- [ ] **CA-15** — `competence_date` ausente é rejeitado
- [ ] **CA-16** — Lançamento `paid` sem `payment_date` é rejeitado
- [ ] **CA-17** — Lançamento `planned` com `payment_date` é rejeitado
- [ ] **CA-18** — `category_id` de outra carteira é rejeitado com 422

### 9.3 Lançamentos — saldo

- [ ] **CA-19** — Lançamento `income received` aumenta o saldo realizado da carteira
- [ ] **CA-20** — Lançamento `expense paid` diminui o saldo realizado da carteira
- [ ] **CA-21** — Lançamento `planned` não afeta saldo realizado, apenas projetado
- [ ] **CA-22** — Soft delete de lançamento remove seu impacto do saldo imediatamente
- [ ] **CA-23** — Saldo realizado e projetado são calculados sobre `competence_date` por padrão

### 9.4 Transferências

- [ ] **CA-24** — Transferência cria dois lançamentos atomicamente (origem e destino)
- [ ] **CA-25** — Falha na criação de um dos lados da transferência reverte ambos
- [ ] **CA-26** — Transferência entre carteiras do mesmo usuário tem efeito zero no saldo consolidado
- [ ] **CA-27** — Transferência para carteira sem acesso do usuário é rejeitada

### 9.5 Recorrência

- [ ] **CA-28** — Criação de recorrência gera entradas futuras no horizonte configurado
- [ ] **CA-29** — Editar "somente esta" desvincula apenas o lançamento selecionado da recorrência
- [ ] **CA-30** — Editar "esta e as futuras" encerra recorrência atual e cria nova a partir da data selecionada
- [ ] **CA-31** — Gerador de recorrências é idempotente: executar duas vezes não cria duplicatas
- [ ] **CA-32** — Arquivar a carteira encerra todas as recorrências ativas vinculadas a ela
- [ ] **CA-33** — Recorrência com dia 31 em mês de 28 dias usa o último dia disponível (dia 28)

### 9.6 Parcelamento

- [ ] **CA-34** — Todas as parcelas são criadas atomicamente; falha reverte o lote inteiro
- [ ] **CA-35** — `installment_position` e `installment_total` são exibidos corretamente na lista (ex: 3/12)
- [ ] **CA-36** — `InstallmentInfoBadge` exibe posição/total na listagem de lançamentos

### 9.7 Segurança e isolamento

- [ ] **CA-37** — `viewer` pode visualizar lançamentos mas não criar, editar ou excluir
- [ ] **CA-38** — `editor` não pode editar ou excluir lançamentos de outros membros
- [ ] **CA-39** — Lançamentos de uma carteira nunca aparecem em outra carteira via API
- [ ] **CA-40** — Bulk action "marcar como pago" aplica validação de permissão para cada entry

---

## 10. Backlog Inicial Priorizado

### P0 — Crítico (bloqueante para MVP)

| ID | Item | Camada |
|---|---|---|
| B-01 | Modelagem e migrations: Category, Subcategory, Entry, RecurrenceConfig | Data / Backend |
| B-02 | Constraints de integridade no banco (tipos, amount > 0, status x payment_date) | Data |
| B-03 | Endpoint CRUD completo de categorias com validação de wallet scope | Backend |
| B-04 | Endpoint CRUD completo de subcategorias com validação de category scope | Backend |
| B-05 | Endpoint de criação de lançamento com todas as validações cruzadas | Backend |
| B-06 | Endpoint de listagem de lançamentos com filtros e paginação | Backend |
| B-07 | Endpoint de edição de lançamento com validação de role | Backend |
| B-08 | Endpoint de soft delete de lançamento | Backend |
| B-09 | Endpoint de saldo realizado e projetado por wallet e período | Backend |
| B-10 | Endpoint de criação de transferência atômica | Backend |
| B-11 | Página `/categories` com tabs receita/despesa, lista e modals de CRUD | Frontend |
| B-12 | `CategoryUsageInfo` com contagem de lançamentos antes de desativar/excluir | Frontend |
| B-13 | Página `/entries` com lista, filtros e `EntryStatusBadge` | Frontend |
| B-14 | `EntryFormModal` completo com todos os campos e validações inline | Frontend |
| B-15 | `BulkActionsBar` para marcar em massa como pago/recebido | Frontend |

### P1 — Alta (qualidade financeira e experiência)

| ID | Item | Camada |
|---|---|---|
| B-16 | Endpoints pay/receive/unmark com validação de payment_date | Backend |
| B-17 | Criação de recorrência: gerador de entradas futuras | Backend |
| B-18 | Job/worker de geração antecipada de entradas recorrentes | Backend / Infra |
| B-19 | Idempotência no gerador de recorrências (constraint unique) | Backend / Data |
| B-20 | Edição de lançamento recorrente com seleção de escopo (this/future/all) | Backend / Frontend |
| B-21 | Exclusão de lançamento recorrente com seleção de escopo | Backend / Frontend |
| B-22 | `RecurringEntryBadge` e `EntryDetailsDrawer` com info de recorrência | Frontend |
| B-23 | `idempotency_key` no POST de entries para evitar duplicatas por retry | Backend |
| B-24 | Testes de isolamento de saldo por carteira (sem vazamento entre wallets) | QA / Backend |
| B-25 | Encerramento automático de recorrências ao arquivar carteira | Backend |

### P2 — Média (completude e robustez)

| ID | Item | Camada |
|---|---|---|
| B-26 | Criação de parcelamento com criação atômica de todas as parcelas | Backend |
| B-27 | `InstallmentInfoBadge` e agrupamento de parcelas na listagem | Frontend |
| B-28 | Endpoint de edição/exclusão de parcelamento por grupo | Backend |
| B-29 | Tratamento de fim de mês em recorrências mensais (dia 31 → último dia) | Backend |
| B-30 | `EntryFiltersBar` completo: período, categoria, status, membro, valor, texto | Frontend |
| B-31 | Hard delete de categorias sem lançamentos | Backend |
| B-32 | Soft delete de subcategorias com validação de uso | Backend |
| B-33 | Logs de auditoria de criação, edição e exclusão de lançamentos | Backend |

---

## 11. Decisões Abertas

| ID | Questão | Impacto |
|---|---|---|
| D-01 | Transferências podem ter categoria? (ex: "Investimento") | Modelagem de Entry; impacto em relatórios |
| D-02 | Categorias padrão (is_default = true) podem ser excluídas permanentemente ou apenas desativadas? | Integridade de templates |
| D-03 | Desativar categoria-pai desativa automaticamente suas subcategorias? | UX e comportamento em cascata |
| D-04 | Transferências podem ser recorrentes? | Modelagem de RecurrenceConfig |
| D-05 | Valor zero (R$ 0,00) é permitido em algum caso? (ex: lançamento de controle) | Validação de amount |
| D-06 | Qual data rege o agrupamento por período: competence_date ou payment_date? | Cálculo de saldo; relatórios; orçamentos |
| D-07 | Usuário pode "desmarcar" um pagamento (paid → planned)? Quais restrições? | Fluxo de status; auditoria |
| D-08 | Status `late` é armazenado ou computado na query? | Modelagem; performance; consistência |
| D-09 | Qual é o horizonte máximo de geração antecipada de entradas recorrentes? (ex: 3, 6 ou 13 meses) | Performance; UX de planejamento |
| D-10 | Recorrência mensal no dia 31: usar último dia do mês ou pular o mês? | Comportamento financeiro; expectativa do usuário |
| D-11 | Editar uma parcela de parcelamento altera só aquela ou oferece opção de "alterar todas"? | UX; complexidade de backend |
| D-12 | Parcelamento entra no MVP ou é adiado para Fase 2? | Escopo do MVP |
| D-13 | Hard delete de lançamentos é permitido para algum role? | Auditoria; integridade de relatórios |
