# Modelo de Dados — Ledger MVP

**Produto:** Ledger — Gestão Financeira Pessoal e para Pequenas Empresas
**Escopo:** Modelo de dados consolidado do MVP
**Data:** 2026-04-07
**Origem:** Consolidado dos discoveries: `auth-onboarding.md`, `wallets.md`, `categories-entries.md`, `dashboard.md`
**Stakeholders:** `data-architect`, `backend-nestjs-lead`
**Status:** Base técnica para modelagem de banco e backend — não implementar sem revisão do data-architect

> **Princípio central de saldo:** O saldo nunca é armazenado como campo. É sempre calculado a partir dos lançamentos. Armazenar saldo cria risco de inconsistência permanente.

---

## Índice

1. [Visão Geral das Entidades](#1-visão-geral-das-entidades)
2. [Enums](#2-enums)
3. [Entidades — Definição Completa](#3-entidades--definição-completa)
4. [Relacionamentos](#4-relacionamentos)
5. [Constraints](#5-constraints)
6. [Soft Delete vs. Hard Delete](#6-soft-delete-vs-hard-delete)
7. [Índices Recomendados](#7-índices-recomendados)
8. [Observações de Modelagem](#8-observações-de-modelagem)
9. [Riscos de Inconsistência](#9-riscos-de-inconsistência)

---

## 1. Visão Geral das Entidades

### Mapa de entidades do MVP

```
Account
  ├── OTP (1-N)
  ├── RefreshToken (1-N)
  ├── WalletMember (1-N) ──────────────────────────────────┐
  └── (criador de) Wallet (1-N)                            │
                                                           │
Wallet ◄────────────────────────────────────────────────── ┘
  ├── WalletMember (1-N)
  │     └── WalletInviteToken (1-1)
  ├── Category (1-N)
  │     └── Subcategory (1-N)
  ├── Entry (1-N)
  │     ├── → Category (N-1, nullable)
  │     ├── → Subcategory (N-1, nullable)
  │     ├── → RecurrenceConfig (N-1, nullable)
  │     └── installment_group_id (auto-referência lógica)
  └── RecurrenceConfig (1-N)
```

### Tabela de entidades

| # | Entidade | Descrição | Soft Delete |
|---|---|---|---|
| 1 | `Account` | Conta do usuário autenticado | Não (ver seção 6) |
| 2 | `OTP` | Token de autenticação de uso único | Não — expiração por TTL |
| 3 | `RefreshToken` | Token de renovação de sessão com rotação | Não — revogação por flag |
| 4 | `Wallet` | Unidade de isolamento financeiro | Não — arquivamento por status |
| 5 | `WalletMember` | Participação de um Account em uma Wallet | Não — status de convite controla ciclo |
| 6 | `WalletInviteToken` | Token efêmero do link de convite | Não — expiração por TTL |
| 7 | `Category` | Categoria financeira da carteira | Não — desativação por flag `active` |
| 8 | `Subcategory` | Subcategoria vinculada a uma Category | Não — desativação por flag `active` |
| 9 | `Entry` | Lançamento financeiro (receita, despesa ou transferência) | **Sim** — `deleted_at` |
| 10 | `RecurrenceConfig` | Configuração de recorrência de lançamentos | Não — encerramento por status |

---

## 2. Enums

### `EntryType`
```
income    → receita
expense   → despesa
transfer  → transferência entre carteiras do mesmo usuário
```

### `EntryStatus`
```
planned    → lançamento registrado, não efetivado
paid       → despesa paga (uso exclusivo: type=expense)
received   → receita recebida (uso exclusivo: type=income)
late       → prazo passou sem efetivação (computed ou armazenado — ver seção 8.3)
completed  → transferência concluída (uso exclusivo: type=transfer)
cancelled  → transferência cancelada (uso exclusivo: type=transfer)
```

**Mapeamento obrigatório de status por tipo:**

| type | statuses válidos |
|---|---|
| `income` | `planned`, `received`, `late` |
| `expense` | `planned`, `paid`, `late` |
| `transfer` | `planned`, `completed`, `cancelled` |

### `CategoryType`
```
income   → classifica receitas
expense  → classifica despesas
```

### `WalletType`
```
personal  → finanças individuais
family    → finanças compartilhadas do núcleo familiar
business  → fluxo de caixa de pequeno negócio ou freelancer
project   → objetivo específico (viagem, reserva, reforma)
```

### `WalletStatus`
```
active    → carteira operacional
archived  → arquivada; somente leitura; não aceita novos lançamentos
```

### `WalletMemberRole`
```
owner   → controle total; único por carteira; não removível sem transferência
admin   → gestão de membros e configurações; pode convidar editor/viewer
editor  → cria e edita apenas os próprios lançamentos; gerencia categorias
viewer  → somente leitura; sem poder de criação ou edição
```

### `WalletMemberInviteStatus`
```
pending   → convite enviado, aguardando resposta (TTL: 7 dias)
accepted  → convite aceito; membro ativo
rejected  → convite recusado; registro mantido para auditoria
expired   → TTL expirou sem resposta; pode ser reenviado
```

### `RecurrenceFrequency`
```
weekly      → semanal
biweekly    → quinzenal
monthly     → mensal
bimonthly   → bimestral
quarterly   → trimestral
semiannual  → semestral
yearly      → anual
```

### `RecurrenceStatus`
```
active  → gerando entradas normalmente
paused  → pausada; não gera novas entradas
ended   → encerrada; não gera novas entradas; estado terminal
```

---

## 3. Entidades — Definição Completa

---

### 3.1 `Account`

| Campo | Tipo SQL | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | UUID | NÃO | `gen_random_uuid()` | PK |
| `email` | VARCHAR(255) | NÃO | — | Único; identificador de login |
| `onboarding_completed` | BOOLEAN | NÃO | `false` | Controla redirecionamento pós-login |
| `created_at` | TIMESTAMPTZ | NÃO | `now()` | |
| `updated_at` | TIMESTAMPTZ | NÃO | `now()` | |

**Notas:**
- Conta criada via silent signup no primeiro envio de OTP para e-mail desconhecido
- `onboarding_completed` setado para `true` apenas ao concluir a última etapa do onboarding
- Exclusão de conta é bloqueada enquanto o usuário for `owner` de qualquer Wallet

---

### 3.2 `OTP`

| Campo | Tipo SQL | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | UUID | NÃO | `gen_random_uuid()` | PK |
| `account_id` | UUID | NÃO | — | FK → Account |
| `token` | VARCHAR(255) | NÃO | — | Hash do token (bcrypt ou SHA-256); nunca armazenar plain |
| `expires_at` | TIMESTAMPTZ | NÃO | — | `created_at + 10 minutos` |
| `attempt_count` | SMALLINT | NÃO | `0` | Contador de tentativas inválidas; máximo 5 |
| `used_at` | TIMESTAMPTZ | SIM | `null` | Preenchido ao usar com sucesso OU ao esgotar tentativas |
| `created_at` | TIMESTAMPTZ | NÃO | `now()` | |

**Notas:**
- TTL: 10 minutos a partir de `created_at`
- OTP inválido quando: `expires_at < now()` OR `used_at IS NOT NULL`
- Ao atingir `attempt_count = 5`: marcar `used_at = now()` sem validar o token
- Reenvio de OTP cria novo registro e marca `used_at = now()` no OTP anterior do mesmo `account_id`

---

### 3.3 `RefreshToken`

| Campo | Tipo SQL | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | UUID | NÃO | `gen_random_uuid()` | PK |
| `account_id` | UUID | NÃO | — | FK → Account |
| `token` | VARCHAR(255) | NÃO | — | Hash do token opaque enviado ao cliente |
| `expires_at` | TIMESTAMPTZ | NÃO | — | `created_at + 7 dias` |
| `rotated_at` | TIMESTAMPTZ | SIM | `null` | Preenchido quando substituído por novo token na rotação |
| `revoked_at` | TIMESTAMPTZ | SIM | `null` | Preenchido em revogação manual (logout) ou detecção de reuso |
| `created_at` | TIMESTAMPTZ | NÃO | `now()` | |

**Notas:**
- AccessToken é JWT stateless — **não armazenado no banco**; validade de 15 minutos
- RefreshToken válido: `expires_at > now()` AND `rotated_at IS NULL` AND `revoked_at IS NULL`
- Detecção de reuso: uso de token com `rotated_at IS NOT NULL` → revogar **todos** os RefreshTokens do `account_id`

---

### 3.4 `Wallet`

| Campo | Tipo SQL | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | UUID | NÃO | `gen_random_uuid()` | PK |
| `name` | VARCHAR(60) | NÃO | — | 2–60 caracteres |
| `description` | VARCHAR(200) | SIM | `null` | |
| `type` | wallet_type | NÃO | — | Enum; **imutável após criação** |
| `owner_id` | UUID | NÃO | — | FK → Account; atualizado a cada transferência de ownership |
| `status` | wallet_status | NÃO | `active` | |
| `monthly_income` | INTEGER | SIM | `null` | Centavos; renda mensal base; coletada no onboarding (opcional) |
| `archived_at` | TIMESTAMPTZ | SIM | `null` | Preenchido ao arquivar; nullificado ao desarquivar |
| `created_at` | TIMESTAMPTZ | NÃO | `now()` | |
| `updated_at` | TIMESTAMPTZ | NÃO | `now()` | |

**Notas:**
- `type` é imutável — endpoint de edição deve rejeitar tentativas de alterar este campo
- `monthly_income = null` indica dado incompleto; dashboard exibe CTA para preenchimento
- Ao arquivar: `status = archived`, `archived_at = now()`, encerrar RecurrenceConfigs ativas vinculadas
- Ao desarquivar: `status = active`, `archived_at = null`; recorrências **não** são restauradas
- Sem limite de Wallets por Account no MVP

---

### 3.5 `WalletMember`

| Campo | Tipo SQL | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | UUID | NÃO | `gen_random_uuid()` | PK |
| `wallet_id` | UUID | NÃO | — | FK → Wallet |
| `account_id` | UUID | SIM | `null` | FK → Account; null enquanto convite pendente para e-mail sem conta |
| `role` | wallet_member_role | NÃO | — | Enum |
| `invite_status` | wallet_member_invite_status | NÃO | `pending` | Enum |
| `invited_by` | UUID | NÃO | — | FK → Account; quem emitiu o convite |
| `invited_email` | VARCHAR(255) | NÃO | — | E-mail alvo do convite |
| `invited_at` | TIMESTAMPTZ | NÃO | `now()` | |
| `accepted_at` | TIMESTAMPTZ | SIM | `null` | Preenchido quando o convidado aceita |
| `expires_at` | TIMESTAMPTZ | NÃO | — | `invited_at + 7 dias`; fixo |

**Notas:**
- Exatamente 1 membro com `role = owner` por Wallet — garantir via aplicação e verificação no backend
- `owner` não pode sair sem transferir ownership; ao transferir, assume `admin` automaticamente
- Não pode existir dois registros com `invite_status = pending` para o mesmo `(wallet_id, invited_email)`
- Membro ativo = `invite_status = accepted`

---

### 3.6 `WalletInviteToken`

| Campo | Tipo SQL | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | UUID | NÃO | `gen_random_uuid()` | PK |
| `wallet_member_id` | UUID | NÃO | — | FK → WalletMember |
| `token` | VARCHAR(255) | NÃO | — | Hash do token do link de convite; nunca armazenar plain |
| `expires_at` | TIMESTAMPTZ | NÃO | — | Consistente com `WalletMember.expires_at` |
| `used_at` | TIMESTAMPTZ | SIM | `null` | Preenchido ao aceitar o convite |

**Notas:**
- Um WalletMember tem no máximo um WalletInviteToken válido por vez
- Ao reenviar convite: marcar `used_at = now()` no token anterior e criar novo registro
- Token inválido: `expires_at < now()` OR `used_at IS NOT NULL`

---

### 3.7 `Category`

| Campo | Tipo SQL | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | UUID | NÃO | `gen_random_uuid()` | PK |
| `wallet_id` | UUID | NÃO | — | FK → Wallet |
| `name` | VARCHAR(60) | NÃO | — | 2–60 caracteres |
| `type` | category_type | NÃO | — | Enum; fixo na criação |
| `is_default` | BOOLEAN | NÃO | `false` | `true` = criada via template ao criar a Wallet |
| `active` | BOOLEAN | NÃO | `true` | Desativada = oculta em seletores de novos lançamentos |
| `position` | SMALLINT | NÃO | `0` | Ordenação na UI |
| `created_at` | TIMESTAMPTZ | NÃO | `now()` | |
| `updated_at` | TIMESTAMPTZ | NÃO | `now()` | |

**Notas:**
- Categorias são escopadas por Wallet — não compartilhadas entre carteiras
- `type` é fixo na criação e deve coincidir com o `type` de qualquer Entry que a use
- Desativar Category **não** desativa automaticamente suas Subcategories
- Hard delete só permitido quando sem Entries vinculadas (históricas ou atuais)
- Categorias padrão (`is_default = true`) não devem ser deletadas permanentemente — apenas desativadas

---

### 3.8 `Subcategory`

| Campo | Tipo SQL | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | UUID | NÃO | `gen_random_uuid()` | PK |
| `category_id` | UUID | NÃO | — | FK → Category |
| `wallet_id` | UUID | NÃO | — | FK → Wallet; denormalizado para queries diretas por wallet |
| `name` | VARCHAR(60) | NÃO | — | 2–60 caracteres |
| `active` | BOOLEAN | NÃO | `true` | |
| `position` | SMALLINT | NÃO | `0` | Ordenação na UI |
| `created_at` | TIMESTAMPTZ | NÃO | `now()` | |
| `updated_at` | TIMESTAMPTZ | NÃO | `now()` | |

**Notas:**
- `wallet_id` deve ser idêntico ao `wallet_id` da Category-pai — validar no backend
- Não é possível usar uma Subcategory sem sua Category-pai estar ativa
- Hard delete só permitido quando sem Entries vinculadas

---

### 3.9 `Entry`

| Campo | Tipo SQL | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | UUID | NÃO | `gen_random_uuid()` | PK |
| `wallet_id` | UUID | NÃO | — | FK → Wallet |
| `type` | entry_type | NÃO | — | Enum |
| `amount` | INTEGER | NÃO | — | Centavos; deve ser > 0 |
| `description` | VARCHAR(200) | NÃO | — | 2–200 caracteres |
| `category_id` | UUID | SIM | `null` | FK → Category; obrigatório para income/expense; null para transfer |
| `subcategory_id` | UUID | SIM | `null` | FK → Subcategory; sempre opcional |
| `competence_date` | DATE | NÃO | — | Data de competência; base para todos os agrupamentos de período |
| `payment_date` | DATE | SIM | `null` | Obrigatório quando status=paid/received/completed; null quando planned/late/cancelled |
| `status` | entry_status | NÃO | `planned` | Enum; conjunto válido depende do type |
| `recurrence_id` | UUID | SIM | `null` | FK → RecurrenceConfig; null se entrada avulsa |
| `transfer_group_id` | UUID | SIM | `null` | UUID compartilhado entre os dois lados de uma transferência |
| `installment_group_id` | UUID | SIM | `null` | UUID compartilhado entre todas as parcelas de um parcelamento |
| `installment_position` | SMALLINT | SIM | `null` | Posição da parcela (1-based); null se não parcelado |
| `installment_total` | SMALLINT | SIM | `null` | Quantidade total de parcelas; null se não parcelado |
| `destination_wallet_id` | UUID | SIM | `null` | FK → Wallet; obrigatório se type=transfer; null caso contrário |
| `notes` | VARCHAR(500) | SIM | `null` | Observações livres |
| `created_by` | UUID | NÃO | — | FK → Account; membro que criou o lançamento |
| `created_at` | TIMESTAMPTZ | NÃO | `now()` | |
| `updated_at` | TIMESTAMPTZ | NÃO | `now()` | |
| `deleted_at` | TIMESTAMPTZ | SIM | `null` | Soft delete; null = ativo |

**Notas:**
- `amount` em centavos (integer) — elimina erros de ponto flutuante
- `competence_date` é a base de todos os agrupamentos de período no dashboard e relatórios; `payment_date` serve apenas para registro e filtros avançados em `/reports`
- Transferências criam **dois registros atomicamente**, ambos com o mesmo `transfer_group_id`
- `Editor` só pode editar/excluir entries onde `created_by = account_id do editor`
- Campos de parcelamento presentes na tabela mesmo que a funcionalidade seja adiada para Fase 2

---

### 3.10 `RecurrenceConfig`

| Campo | Tipo SQL | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | UUID | NÃO | `gen_random_uuid()` | PK |
| `wallet_id` | UUID | NÃO | — | FK → Wallet |
| `frequency` | recurrence_frequency | NÃO | — | Enum |
| `interval` | SMALLINT | NÃO | `1` | Multiplicador da frequência |
| `day_of_month` | SMALLINT | SIM | `null` | 1–31; para frequências mensais/anuais |
| `day_of_week` | SMALLINT | SIM | `null` | 0–6 (0=domingo); para frequências semanais/quinzenais |
| `start_date` | DATE | NÃO | — | Data de início da geração |
| `end_date` | DATE | SIM | `null` | Data de encerramento; null = indefinido |
| `status` | recurrence_status | NÃO | `active` | Enum |
| `template_type` | entry_type | NÃO | — | Apenas `income` ou `expense`; transfer não suportado no MVP |
| `template_amount` | INTEGER | NÃO | — | Centavos; valor padrão das entradas geradas |
| `template_description` | VARCHAR(200) | NÃO | — | Descrição padrão das entradas geradas |
| `template_category_id` | UUID | SIM | `null` | FK → Category |
| `template_subcategory_id` | UUID | SIM | `null` | FK → Subcategory |
| `created_by` | UUID | NÃO | — | FK → Account |
| `created_at` | TIMESTAMPTZ | NÃO | `now()` | |
| `updated_at` | TIMESTAMPTZ | NÃO | `now()` | |

**Notas:**
- `template_type` permite apenas `income` ou `expense` — transferências não são recorrentes no MVP
- Ao arquivar Wallet: encerrar todas as RecurrenceConfigs `active` da wallet atomicamente (`status = ended`, `end_date = today`)
- Geração antecipada de Entries: horizonte máximo recomendado de 13 meses
- Problema do dia 31: quando `day_of_month = 31` e o mês tem menos dias, usar o último dia do mês
- Idempotência obrigatória no gerador via constraint `UNIQUE (recurrence_id, competence_date)` nas Entries

---

## 4. Relacionamentos

```
Account          1 ──────── N  OTP
Account          1 ──────── N  RefreshToken
Account          1 ──────── N  WalletMember
Account          1 ──────── N  Wallet            (via owner_id)
Account          1 ──────── N  Entry             (via created_by)
Account          1 ──────── N  RecurrenceConfig  (via created_by)

Wallet           1 ──────── N  WalletMember
Wallet           1 ──────── N  Category
Wallet           1 ──────── N  Entry
Wallet           1 ──────── N  RecurrenceConfig

WalletMember     1 ──────── 1  WalletInviteToken (por convite ativo)

Category         1 ──────── N  Subcategory
Category         1 ──────── N  Entry             (via category_id)
Category         1 ──────── N  RecurrenceConfig  (via template_category_id)

Subcategory      1 ──────── N  Entry             (via subcategory_id)
Subcategory      1 ──────── N  RecurrenceConfig  (via template_subcategory_id)

RecurrenceConfig 1 ──────── N  Entry             (via recurrence_id)

Entry            N ──────── 1  Wallet            (via destination_wallet_id, para transfers)
Entry            N ──────── N  Entry             (via transfer_group_id, par de transferência)
```

### Transferências — par atômico via `transfer_group_id`

```
Entry (lado origem — Wallet A)
  wallet_id              = Wallet A
  type                   = transfer
  amount                 = X
  destination_wallet_id  = Wallet B
  transfer_group_id      = UUID compartilhado
  status                 = planned | completed | cancelled

Entry (lado destino — Wallet B)
  wallet_id              = Wallet B
  type                   = transfer
  amount                 = X
  destination_wallet_id  = Wallet A
  transfer_group_id      = UUID compartilhado (idêntico ao acima)
  status                 = (espelha o lado origem)
```

Ambos os registros são criados, editados e deletados em transação atômica única.

---

## 5. Constraints

### `Account`
```sql
UNIQUE (email)
```

### `OTP`
```sql
CHECK (attempt_count >= 0 AND attempt_count <= 5)
```

### `Wallet`
```sql
CHECK (LENGTH(TRIM(name)) >= 2)
CHECK (status IN ('active', 'archived'))
-- type é imutável: validar via trigger de banco + validação de aplicação
```

### `WalletMember`
```sql
UNIQUE (wallet_id, account_id)
  WHERE invite_status = 'accepted'

UNIQUE (wallet_id, invited_email)
  WHERE invite_status = 'pending'
```

### `Category`
```sql
UNIQUE (wallet_id, name, type)
CHECK (LENGTH(TRIM(name)) >= 2)
```

### `Subcategory`
```sql
UNIQUE (category_id, name)
CHECK (LENGTH(TRIM(name)) >= 2)
```

### `Entry`
```sql
CHECK (amount > 0)

-- Status válido por tipo
CHECK (
  (type = 'income'   AND status IN ('planned', 'received', 'late'))   OR
  (type = 'expense'  AND status IN ('planned', 'paid', 'late'))        OR
  (type = 'transfer' AND status IN ('planned', 'completed', 'cancelled'))
)

-- category_id obrigatório para income/expense, proibido para transfer
CHECK (
  (type IN ('income', 'expense') AND category_id IS NOT NULL) OR
  (type = 'transfer' AND category_id IS NULL)
)

-- destination_wallet_id obrigatório para transfer, proibido para outros
CHECK (
  (type = 'transfer' AND destination_wallet_id IS NOT NULL) OR
  (type != 'transfer' AND destination_wallet_id IS NULL)
)

-- transfer_group_id obrigatório para transfer
CHECK (
  (type = 'transfer' AND transfer_group_id IS NOT NULL) OR
  (type != 'transfer' AND transfer_group_id IS NULL)
)

-- payment_date obrigatório por status
CHECK (
  (status IN ('paid', 'received', 'completed') AND payment_date IS NOT NULL) OR
  (status IN ('planned', 'late', 'cancelled')  AND payment_date IS NULL)
)

-- parcelamento: position e total sempre juntos ou nenhum
CHECK (
  (installment_position IS NULL AND installment_total IS NULL) OR
  (installment_position IS NOT NULL AND installment_total IS NOT NULL
   AND installment_position > 0 AND installment_total > 0
   AND installment_position <= installment_total)
)

-- idempotência do gerador de recorrências
UNIQUE (recurrence_id, competence_date)
  WHERE recurrence_id IS NOT NULL AND deleted_at IS NULL
```

### `RecurrenceConfig`
```sql
CHECK (template_type IN ('income', 'expense'))
CHECK (interval >= 1)
CHECK (day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31))
CHECK (day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6))
CHECK (template_amount > 0)
```

---

## 6. Soft Delete vs. Hard Delete

| Entidade | Estratégia | Justificativa |
|---|---|---|
| `Account` | **Bloqueio de exclusão** enquanto owner de qualquer Wallet | Integridade referencial; conta sem Wallets pode ser deletada fisicamente |
| `OTP` | **Expiração por TTL** (`expires_at`) + invalidação via `used_at` | Dado efêmero; limpar periodicamente com job de manutenção |
| `RefreshToken` | **Revogação por flag** (`revoked_at` / `rotated_at`) | Rastrear histórico de sessões para auditoria de segurança |
| `Wallet` | **Arquivamento por `status`** | Preservar dados históricos; sem delete no MVP |
| `WalletMember` | **Ciclo por `invite_status`** | Histórico de convites para auditoria |
| `WalletInviteToken` | **Expiração por TTL** + `used_at` | Dado efêmero; limpar periodicamente |
| `Category` | **Desativação por `active = false`** | Preservar referência histórica em lançamentos antigos |
| `Subcategory` | **Desativação por `active = false`** | Idem Category |
| `Entry` | **Soft delete obrigatório** (`deleted_at`) | Excluir do saldo mas preservar para auditoria |
| `RecurrenceConfig` | **Encerramento por `status = ended`** | Preservar histórico de configuração |

### Regras de soft delete — `Entry`

- Toda query de saldo, projeção e relatório filtra `deleted_at IS NULL`
- Hard delete de Entry não é exposto ao usuário no MVP
- Jobs de limpeza de dados efêmeros devem respeitar período mínimo de retenção para auditoria (definir com o time)

---

## 7. Índices Recomendados

### `Account`
```sql
UNIQUE INDEX ON account (email)
```

### `OTP`
```sql
INDEX ON otp (account_id)
INDEX ON otp (expires_at) WHERE used_at IS NULL   -- job de limpeza
```

### `RefreshToken`
```sql
INDEX ON refresh_token (account_id)
INDEX ON refresh_token (token)                    -- lookup por hash na renovação
INDEX ON refresh_token (account_id, expires_at)
  WHERE revoked_at IS NULL AND rotated_at IS NULL
```

### `Wallet`
```sql
INDEX ON wallet (owner_id)
INDEX ON wallet (status)
```

### `WalletMember`
```sql
INDEX ON wallet_member (wallet_id)
INDEX ON wallet_member (account_id)
INDEX ON wallet_member (wallet_id, account_id)
PARTIAL UNIQUE INDEX ON wallet_member (wallet_id, invited_email)
  WHERE invite_status = 'pending'
INDEX ON wallet_member (expires_at)
  WHERE invite_status = 'pending'                 -- job de expiração
```

### `WalletInviteToken`
```sql
INDEX ON wallet_invite_token (wallet_member_id)
INDEX ON wallet_invite_token (token)              -- lookup no link de aceite
```

### `Category`
```sql
INDEX ON category (wallet_id)
INDEX ON category (wallet_id, type)
INDEX ON category (wallet_id, type, active)
```

### `Subcategory`
```sql
INDEX ON subcategory (category_id)
INDEX ON subcategory (wallet_id)
```

### `Entry` — críticos para performance do dashboard

```sql
-- Base de toda query de saldo
INDEX ON entry (wallet_id, deleted_at)

-- Cálculo de saldo realizado e projetado
INDEX ON entry (wallet_id, type, status, deleted_at)

-- Agrupamento por período (dashboard, relatórios, orçamentos)
INDEX ON entry (wallet_id, competence_date, deleted_at)

-- Query principal do dashboard (composta)
INDEX ON entry (wallet_id, type, status, competence_date, deleted_at)

-- LateBillsCard: atrasos e vencimentos próximos
INDEX ON entry (wallet_id, status, competence_date, deleted_at)
  WHERE status IN ('planned', 'late')

-- Recorrência
INDEX ON entry (recurrence_id)
  WHERE recurrence_id IS NOT NULL

-- Idempotência do gerador
UNIQUE INDEX ON entry (recurrence_id, competence_date)
  WHERE recurrence_id IS NOT NULL AND deleted_at IS NULL

-- Parcelamento
INDEX ON entry (installment_group_id)
  WHERE installment_group_id IS NOT NULL

-- Transferências
INDEX ON entry (transfer_group_id)
  WHERE transfer_group_id IS NOT NULL
INDEX ON entry (destination_wallet_id)
  WHERE destination_wallet_id IS NOT NULL

-- Auditoria por criador
INDEX ON entry (created_by)

-- Soft delete (limpeza futura, auditoria)
INDEX ON entry (deleted_at)
  WHERE deleted_at IS NOT NULL
```

### `RecurrenceConfig`
```sql
INDEX ON recurrence_config (wallet_id)
INDEX ON recurrence_config (wallet_id, status)
INDEX ON recurrence_config (status)
  WHERE status = 'active'                         -- job de geração antecipada
```

---

## 8. Observações de Modelagem

### 8.1 Saldo calculado, nunca armazenado

Nenhuma entidade possui campo de saldo. O saldo é sempre computado via queries agregadas sobre `Entry`. Toda query de saldo deve filtrar:
- `wallet_id = :walletId`
- `deleted_at IS NULL`
- `type` e `status` conforme a fórmula aplicável

Cache de saldo é permitido com TTL curto, invalidado a cada criação, edição ou soft delete de Entry da carteira.

---

### 8.2 Centavos como INTEGER

`amount` em `Entry` e `template_amount` em `RecurrenceConfig` são armazenados em **centavos como INTEGER**:
- R$ 1.500,00 → `150000`
- R$ 9,99 → `999`

Elimina erros de arredondamento de ponto flutuante. Conversão para exibição (÷ 100) é responsabilidade da camada de apresentação.

---

### 8.3 Status `late` — computed vs. armazenado

**Opção A — Computed na query (recomendado):**
```sql
CASE
  WHEN status = 'planned' AND competence_date < CURRENT_DATE
  THEN 'late'
  ELSE status
END AS effective_status
```
- Vantagem: sempre consistente, sem dependência de job
- Desvantagem: `CASE` em queries de alto volume; requer índice funcional se necessário

**Opção B — Armazenado:**
- Requer job periódico para atualizar `status = 'late'` quando `competence_date < today AND status = 'planned'`
- Risco: inconsistência entre execuções do job

**Decisão:** `data-architect` deve definir antes da implementação com base em análise de volume de dados.

---

### 8.4 `transfer_group_id` — par atômico de transferências

Campo adicionado explicitamente em `Entry` (ausente nos discoveries originais, necessário para implementação). Garante:
- Edição atômica dos dois lados da transferência
- Exclusão atômica dos dois lados
- Identificação do par sem joins complexos

Ambos os registros de uma transferência **sempre** compartilham o mesmo `transfer_group_id`.

---

### 8.5 `Wallet.type` imutável — garantia em duas camadas

**Camada de banco:**
```sql
-- Trigger BEFORE UPDATE rejeitando alteração de type
CREATE OR REPLACE FUNCTION prevent_wallet_type_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type != OLD.type THEN
    RAISE EXCEPTION 'wallet.type is immutable after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Camada de aplicação:**
- Middleware ou service rejeita o campo `type` em qualquer `PATCH /wallets/:id` com HTTP 422

Ambas as camadas são recomendadas — defense-in-depth.

---

### 8.6 Denormalização de `Subcategory.wallet_id`

Campo denormalizado — pode ser derivado via `category.wallet_id`. A redundância serve para:
- Queries diretas de subcategorias por carteira sem JOIN adicional
- Garantia de isolamento via validação cruzada no backend

Deve ser validado ao criar/editar: `subcategory.wallet_id === category.wallet_id`.

---

### 8.7 Parcelamento — campos na tabela, funcionalidade adiada

Os campos `installment_group_id`, `installment_position` e `installment_total` estão modelados em `Entry`. A funcionalidade de **criação** de parcelamentos pode ser adiada para Fase 2 sem necessidade de migration futura. Os campos permanecem nullable e sem impacto em queries que não os referenciam.

---

### 8.8 Transferências recorrentes — fora do MVP

`RecurrenceConfig.template_type` é restrito a `income` e `expense` via CHECK constraint. Se transferências recorrentes forem adicionadas no futuro, será necessário:
1. Remover o CHECK constraint
2. Adicionar `template_destination_wallet_id` em `RecurrenceConfig`
3. Adaptar o gerador de entradas

---

### 8.9 Limpeza de dados efêmeros

Jobs de manutenção recomendados (frequência a definir):

| Tabela | Critério de limpeza | Retenção sugerida |
|---|---|---|
| `OTP` | `used_at IS NOT NULL` OR `expires_at < now() - interval '30 days'` | 30 dias |
| `WalletInviteToken` | `used_at IS NOT NULL` OR `expires_at < now() - interval '30 days'` | 30 dias |
| `RefreshToken` | `expires_at < now() - interval '90 days'` | 90 dias |

---

## 9. Riscos de Inconsistência

### 9.1 Críticos

| ID | Risco | Entidade | Mitigação |
|---|---|---|---|
| RI-01 | **Transferência parcialmente criada** — um lado persiste, o outro falha; saldo da carteira de origem fica incorreto | `Entry` | Ambos os lados em **transação atômica única**; rollback total em falha; `transfer_group_id` identifica o par |
| RI-02 | **Parcelamento parcialmente criado** — N de 12 parcelas persistidas; usuário recria e duplica lançamentos | `Entry` | Criação de todas as parcelas em transação única; rollback total em falha |
| RI-03 | **Gerador de recorrência duplica entradas** — job executa duas vezes em paralelo ou após restart | `Entry` + `RecurrenceConfig` | `UNIQUE (recurrence_id, competence_date) WHERE deleted_at IS NULL` + lock distribuído no job |
| RI-04 | **`amount` negativo ou zero aceito** — cálculo de saldo inverte ou zera valores | `Entry` | `CHECK (amount > 0)` no banco + validação no backend |
| RI-05 | **Status incompatível com tipo** — `expense` com `status = received` | `Entry` | CHECK constraint de status por tipo + validação no backend |
| RI-06 | **`payment_date` ausente em status finalizado** — `status = paid` sem `payment_date` | `Entry` | CHECK constraint de payment_date por status |
| RI-07 | **`category_id` de outra carteira** — violação de isolamento de dados | `Entry` | Validar `category.wallet_id = entry.wallet_id` no backend antes de persistir |
| RI-08 | **`subcategory_id` não pertence à `category_id` informada** | `Entry` | Validar `subcategory.category_id = entry.category_id` no backend |

### 9.2 Altos

| ID | Risco | Entidade | Mitigação |
|---|---|---|---|
| RI-09 | **Dois owners na mesma Wallet** — transferência de ownership cria dois registros com `role = owner` | `WalletMember` | Operação atômica: alterar role do antigo para `admin` e do novo para `owner` na mesma transação |
| RI-10 | **`wallet.type` alterado após criação** — categorias e templates ficam inconsistentes com o tipo real | `Wallet` | Trigger de banco + validação de aplicação; dupla proteção |
| RI-11 | **Carteira arquivada com recorrências ativas gerando entradas** | `RecurrenceConfig` + `Entry` | Ao arquivar: encerrar RecurrenceConfigs ativas atomicamente com o arquivamento na mesma transação |
| RI-12 | **Wallet sem owner** — owner exclui conta sem transferir | `Wallet` + `Account` | Bloquear exclusão de Account enquanto `EXISTS (SELECT 1 FROM wallet WHERE owner_id = account.id)` |
| RI-13 | **Status `late` desatualizado se armazenado** — entries permanecem `planned` após a data passar | `Entry` | Preferir computed na query; se armazenado, job com garantia de execução antes de qualquer leitura de saldo |
| RI-14 | **`Subcategory.wallet_id` diverge da Category-pai** | `Subcategory` | Validar no backend ao criar/editar; trigger opcional no banco |

### 9.3 Médios

| ID | Risco | Entidade | Mitigação |
|---|---|---|---|
| RI-15 | **RefreshToken reutilizado com janela de tolerância** — risco de sequestro de sessão | `RefreshToken` | Revogar todos os tokens do `account_id` imediatamente ao detectar reuso; sem janela de tolerância |
| RI-16 | **Dois convites pending para o mesmo email na mesma wallet** — race condition em envios simultâneos | `WalletMember` | Partial unique index: `UNIQUE (wallet_id, invited_email) WHERE invite_status = 'pending'` |
| RI-17 | **Entry soft-deletada ainda computada no saldo** — cache desatualizado | `Entry` | Invalidar cache de saldo imediatamente após soft delete; TTL curto em qualquer cache de saldo |
| RI-18 | **Parcelas com `competence_date` na ordem errada** — geração não determinística | `Entry` | Gerar `competence_date` de cada parcela deterministicamente: `start_date + (position - 1) meses` |
| RI-19 | **Recorrência gerando além do `end_date`** — job não respeita data de encerramento | `RecurrenceConfig` + `Entry` | Job de geração sempre filtra `end_date IS NULL OR next_date <= end_date` antes de criar entrada |
