# SPEC — Produto financeiro pessoal e para pequenas empresas

## 1. Visão do produto

Plataforma de gestão financeira para pessoas, famílias e pequenas empresas, com foco em clareza do fluxo de caixa, controle de receitas e despesas, planejamento mensal, metas por categoria e apoio na saída de dívidas.

O produto deve permitir que um usuário tenha uma ou mais carteiras financeiras, podendo usá-las individualmente ou compartilhá-las com outras pessoas. Cada carteira possui sua própria estrutura de categorias, metas, orçamento e movimentações.

---

## 2. Objetivos do produto

### Objetivos principais

* Dar visibilidade total sobre origem da renda e destino dos gastos.
* Ajudar o usuário a planejar o mês antes de gastar.
* Mostrar quando o usuário está saindo do orçamento.
* Apoiar a redução de dívidas e a construção de sobra de caixa.
* Permitir uso pessoal, familiar e para pequenos negócios.

### Problemas que o produto resolve

* O usuário ganha dinheiro, mas não sabe para onde ele vai.
* O usuário mistura contas pessoais, familiares e da empresa.
* O usuário não consegue prever se fechará o mês no positivo ou no negativo.
* O usuário não acompanha metas de economia por categoria.
* O usuário tem contas atrasadas e não sabe como organizar a prioridade de pagamento.

---

## 3. Perfis de uso

### Pessoa física

Usuário controla a própria renda, despesas, metas e orçamento.

### Família

Usuário compartilha uma carteira com parceiro(a) ou familiares e acompanha os gastos em conjunto.

### Pequena empresa

Usuário registra entradas, saídas, categorias operacionais e acompanha fluxo de caixa do negócio.

---

## 4. Conceitos principais do domínio

### Conta

Representa o usuário autenticado no sistema.

### Carteira

Espaço financeiro isolado dentro da conta. Pode representar:

* finanças pessoais
* finanças da casa
* finanças de uma pequena empresa
* uma carteira específica de reserva, viagem ou projeto

### Membros da carteira

Usuários que possuem acesso a uma carteira compartilhada.

### Categorias e subcategorias

Estrutura usada para classificar receitas e despesas.

Exemplos:

* Receita Fixa > Empresa A
* Receita Fixa > Empresa B
* Alimentação > Mercado
* Alimentação > Bar
* Moradia > Aluguel
* Dívidas > Cartão atrasado

### Lançamentos

Movimentações financeiras da carteira.
Tipos iniciais:

* receita
* despesa
* transferência interna entre carteiras

### Orçamento

Valor planejado para gastar em um período, geralmente mensalmente, por categoria ou subcategoria.

### Meta

Objetivo financeiro que pode representar:

* limite de gasto
* valor mínimo de economia
* valor-alvo para reserva
* objetivo de quitação de dívida

### Recorrência

Configuração para lançamentos que se repetem, como salário, aluguel, internet e assinaturas.

---

## 5. Estrutura inicial de páginas

## /auth/login

Página de entrada no sistema.

### Objetivo

Permitir que o usuário informe o email e receba um token OTP para autenticação.

### Regras de negócio

* O usuário informa o email.
* O sistema envia um OTP para o email informado.
* O usuário informa o OTP recebido.
* Em caso de sucesso, inicia a sessão.
* Se o usuário ainda não existir, a conta pode ser criada no fluxo de primeiro acesso.

### Components

* **InputEmail**: input para digitar o email.
* **SubmitEmailButton**: botão para solicitar envio do OTP.
* **InputOTPToken**: input para digitar o token OTP.
* **SubmitOTPButton**: botão para validar o token OTP.
* **ResendOTPButton**: botão para reenviar o token.
* **AuthFeedbackMessage**: mensagens de sucesso, erro, expiração ou reenvio.

### Estados da tela

* preenchendo email
* enviando OTP
* aguardando OTP
* validando OTP
* autenticado
* erro de autenticação

---

## /onboarding

Página ou fluxo inicial após o primeiro login.

### Objetivo

Ajudar o usuário a criar sua primeira carteira e começar com uma estrutura mínima útil.

### Etapas sugeridas

1. Escolher o tipo da carteira:

   * pessoal
   * família
   * empresa
2. Definir nome da carteira.
3. Escolher categorias iniciais sugeridas.
4. Informar renda mensal base.
5. Definir se quer convidar outras pessoas para compartilhar.

### Components

* **WalletTypeSelector**
* **WalletNameInput**
* **StarterCategoryTemplateSelector**
* **MonthlyIncomeInput**
* **InviteMembersForm**
* **FinishOnboardingButton**

---

## /dashboard

Visão geral da carteira selecionada.

### Objetivo

Mostrar rapidamente a saúde financeira atual da carteira.

### Informações principais

* saldo atual
* total de receitas no mês
* total de despesas no mês
* saldo projetado até o fim do mês
* categorias com maior gasto
* principais fontes de receita
* alertas de orçamento estourando
* contas atrasadas ou próximas do vencimento

### Components

* **WalletSwitcher**: seletor da carteira ativa.
* **PeriodFilter**: filtro por período, ex. mês atual, últimos 3 meses, personalizado.
* **BalanceSummaryCard**: saldo atual, receitas, despesas e saldo líquido.
* **ProjectedBalanceCard**: projeção de saldo até o fim do período.
* **ExpensesByCategoryChart**: gráfico de despesas por categoria.
* **IncomeByCategoryChart**: gráfico de receitas por categoria.
* **TopExpensesList**: categorias ou subcategorias com maiores gastos.
* **BudgetAlertsCard**: alertas de orçamento e metas.
* **LateBillsCard**: contas em atraso ou próximas do vencimento.
* **RecentEntriesList**: últimos lançamentos.
* **QuickActionBar**: atalhos para adicionar receita, despesa, transferência e meta.

### Estados da tela

* sem carteira cadastrada
* carteira sem lançamentos
* carteira com dados
* carregando
* erro

---

## /wallets

Listagem e gestão de carteiras.

### Objetivo

Permitir ao usuário criar, editar, arquivar e compartilhar carteiras.

### Ações principais

* listar carteiras do usuário
* criar nova carteira
* editar nome, tipo e configurações
* compartilhar carteira
* remover membro da carteira
* arquivar carteira

### Components

* **WalletList**
* **CreateWalletButton**
* **WalletCard**
* **WalletSettingsModal**
* **WalletMembersPanel**
* **InviteWalletMemberForm**
* **WalletPermissionsTable**

---

## /categories

Listagem de categorias e subcategorias, com cadastro e edição.

### Objetivo

Permitir organizar a classificação financeira da carteira.

### Regras de negócio

* Categorias são vinculadas à carteira.
* Cada categoria possui tipo: receita ou despesa.
* Uma categoria pode possuir várias subcategorias.
* Categorias pré-cadastradas podem ser editadas, desativadas ou complementadas.
* O usuário pode criar categorias totalmente customizadas.

### Components

* **CategoryTypeTabs**: alterna entre receita e despesa.
* **CategoryList**: lista de categorias.
* **SubcategoryList**: lista de subcategorias por categoria.
* **CreateCategoryButton**
* **CreateSubcategoryButton**
* **CategoryFormModal**
* **SubcategoryFormModal**
* **CategoryStatusToggle**: ativa/desativa categoria.
* **CategoryUsageInfo**: mostra quantos lançamentos usam a categoria.

### Estados da tela

* sem categorias customizadas
* apenas categorias padrão
* com categorias e subcategorias ativas

---

## /entries

Registro e listagem de lançamentos financeiros.

### Objetivo

Permitir registrar receitas, despesas e transferências com clareza e rapidez.

### Regras de negócio

* Todo lançamento pertence a uma carteira.
* Todo lançamento deve possuir tipo.
* Receita e despesa devem possuir categoria e opcionalmente subcategoria.
* Lançamentos podem ser únicos ou recorrentes.
* Lançamentos podem ter status, como previsto, pago, recebido, atrasado.
* Lançamentos podem ter data de competência e data real de pagamento/recebimento.

### Components

* **EntryTypeTabs**: receita, despesa, transferência.
* **EntryList**: listagem principal.
* **EntryFiltersBar**: filtro por período, categoria, status, membro, valor e texto.
* **CreateEntryButton**
* **EntryFormModal**
* **EntryStatusBadge**
* **RecurringEntryBadge**
* **InstallmentInfoBadge**
* **EntryDetailsDrawer**
* **BulkActionsBar**: ações em massa, como marcar como pago.

### Campos principais do lançamento

* descrição
* valor
* tipo
* categoria
* subcategoria
* carteira
* data de competência
* data de pagamento/recebimento
* status
* recorrência
* observações
* anexos futuros

---

## /budgets

Planejamento de orçamento por período.

### Objetivo

Permitir que o usuário defina quanto pretende gastar ou arrecadar por categoria.

### Regras de negócio

* Orçamento pode ser mensal.
* Pode existir orçamento por categoria e opcionalmente por subcategoria.
* O sistema compara planejado versus realizado.
* O usuário deve ser alertado ao se aproximar do limite.

### Components

* **BudgetPeriodSelector**
* **BudgetListByCategory**
* **BudgetProgressBar**
* **CreateBudgetButton**
* **BudgetFormModal**
* **BudgetVsActualCard**
* **BudgetAlertsList**

---

## /goals

Gestão de metas financeiras.

### Objetivo

Permitir ao usuário acompanhar objetivos financeiros além do simples registro de lançamentos.

### Tipos de meta sugeridos

* limitar gasto em categoria
* economizar valor mensal
* juntar valor para objetivo específico
* quitar dívida

### Components

* **GoalList**
* **CreateGoalButton**
* **GoalFormModal**
* **GoalProgressCard**
* **GoalStatusBadge**
* **GoalProjectionInfo**

---

## /debts

Gestão de dívidas e contas atrasadas.

### Objetivo

Dar visibilidade às pendências financeiras e apoiar um plano de saída das dívidas.

### Funcionalidades

* registrar dívidas
* informar credor, valor, juros e vencimento
* acompanhar parcelas ou pagamentos realizados
* indicar prioridade de pagamento
* visualizar impacto das dívidas no fluxo mensal

### Components

* **DebtList**
* **CreateDebtButton**
* **DebtFormModal**
* **DebtPriorityBadge**
* **DebtProjectionCard**
* **DebtPaymentHistory**
* **DebtSettlementPlanCard**

---

## /reports

Relatórios analíticos.

### Objetivo

Permitir leitura histórica e estratégica dos dados financeiros.

### Relatórios iniciais

* receitas por categoria
* despesas por categoria
* evolução mensal
* comparativo entre meses
* orçamento versus realizado
* gastos por membro da carteira compartilhada

### Components

* **ReportTypeSelector**
* **DateRangeFilter**
* **CategoryFilter**
* **MemberFilter**
* **ReportsChartArea**
* **ReportsSummaryCards**
* **ExportReportButton**

---

## /members

Gestão de membros da carteira compartilhada.

### Objetivo

Permitir colaboração segura entre pessoas.

### Perfis sugeridos

* owner
* admin
* editor
* viewer

### Components

* **MembersList**
* **InviteMemberButton**
* **MemberRoleSelector**
* **PendingInvitesList**
* **RemoveMemberAction**

---

## /settings

Configurações do usuário e da carteira.

### Seções sugeridas

* perfil do usuário
* preferências de moeda e idioma
* notificações
* segurança da conta
* configurações da carteira
* gerenciamento de categorias padrão

### Components

* **ProfileForm**
* **NotificationSettingsForm**
* **SecuritySettingsPanel**
* **WalletSettingsForm**
* **DangerZoneCard**

---

## 6. Navegação principal

### Sidebar ou menu principal

* Dashboard
* Lançamentos
* Categorias
* Orçamentos
* Metas
* Dívidas
* Relatórios
* Carteiras
* Membros
* Configurações

### Ações rápidas globais

* Nova receita
* Nova despesa
* Nova transferência
* Nova meta

---

## 7. Regras de UX importantes

### Regra 1: mostrar clareza antes de complexidade

O dashboard precisa responder rapidamente:

* quanto entrou
* quanto saiu
* quanto ainda posso gastar
* como vou terminar o mês

### Regra 2: cadastro rápido de lançamento

Adicionar receita ou despesa deve levar poucos segundos.

### Regra 3: o produto deve ensinar

Sempre que possível, a interface deve explicar o que está acontecendo.

Exemplos:

* “Você já usou 82% do orçamento de alimentação.”
* “Se continuar nesse ritmo, vai ultrapassar o limite desta categoria.”
* “Seu saldo projetado para o fim do mês é negativo.”

### Regra 4: compartilhar sem perder controle

Carteiras compartilhadas devem ter permissão clara por membro.

---

## 8. Roadmap funcional das páginas

### Fase 1 — MVP

* /auth/login
* /onboarding
* /dashboard
* /wallets
* /categories
* /entries

### Fase 2 — Planejamento

* /budgets
* /goals
* /members

### Fase 3 — Inteligência financeira

* /debts
* /reports
* alertas avançados no /dashboard
* projeções e insights automáticos

### Fase 4 — Escala futura

* importação de extrato
* open finance
* notificações inteligentes
* automações e IA financeira

---

## 9. Próximas definições necessárias

### Definir no próximo documento

* mapa de entidades e relacionamentos
* permissões por membro da carteira
* enums de status e tipos
* regras de recorrência
* regras de orçamento e meta
* definição do dashboard por tipo de carteira
* diferença entre uso pessoal, família e empresa

---

## 10. Observações de produto

### Princípio central

O sistema não deve apenas registrar o passado.
Ele deve ajudar o usuário a decidir melhor o futuro financeiro.

### Proposta de valor resumida

“Veja com clareza para onde seu dinheiro vai, planeje melhor o mês e recupere o controle da sua vida financeira.”
