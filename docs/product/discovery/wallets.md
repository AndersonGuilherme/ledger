# Discovery — `/wallets`

**Produto:** Ledger — Gestão Financeira Pessoal e para Pequenas Empresas
**Escopo:** Carteiras — unidade central de isolamento financeiro
**Data:** 2026-04-07
**Atualizado em:** 2026-04-07 — decisões abertas encerradas
**Status:** Aprovado — pronto para desenvolvimento

---

## Índice

1. [Papel da Carteira no Produto](#1-papel-da-carteira-no-produto)
2. [Tipos de Carteira e Diferenças Práticas](#2-tipos-de-carteira-e-diferenças-práticas)
3. [Ciclo de Vida da Carteira](#3-ciclo-de-vida-da-carteira)
4. [Modelo de Membros](#4-modelo-de-membros)
5. [Matriz de Permissões](#5-matriz-de-permissões)
6. [Entidades Envolvidas](#6-entidades-envolvidas)
7. [Regras de Negócio](#7-regras-de-negócio)
8. [Estados da Interface — `/wallets`](#8-estados-da-interface--wallets)
9. [Riscos](#9-riscos)
10. [Critérios de Aceite](#10-critérios-de-aceite)
11. [Backlog Inicial Priorizado](#11-backlog-inicial-priorizado)
12. [Decisões Encerradas](#12-decisões-encerradas)

---

## 1. Papel da Carteira no Produto

A **carteira é a unidade raiz de isolamento financeiro** do Ledger. Toda entidade de dados do produto está ancorada a ela:

```
Carteira
  ├── Categorias e subcategorias
  ├── Lançamentos (receitas, despesas, transferências)
  ├── Orçamentos
  ├── Metas
  ├── Dívidas
  └── Membros (acessos)
```

### O que a carteira garante

- **Isolamento:** dados de uma carteira não vazam para outra
- **Contexto:** cada carteira tem sua própria estrutura de categorias, orçamentos e metas
- **Colaboração controlada:** o acesso é por carteira, não por conta; o usuário decide o que compartilha
- **Multi-propósito:** um mesmo usuário pode ter carteiras para finalidades completamente distintas sem misturar dados

### O que a carteira não é

- Não é uma conta bancária (não tem saldo próprio gerenciado externamente)
- Não é um usuário — membros existem dentro de uma carteira, não ao contrário
- Não é global — configurações de categoria, orçamento e meta são sempre por carteira

---

## 2. Tipos de Carteira e Diferenças Práticas

### Tipos iniciais

| Tipo | Label sugerido | Propósito |
|---|---|---|
| `personal` | Pessoal | Finanças individuais de uma única pessoa |
| `family` | Família | Gastos compartilhados entre cônjuges, parceiros ou familiares |
| `business` | Empresa | Fluxo de caixa de um pequeno negócio ou freelancer |
| `project` | Projeto | Objetivo específico: viagem, reserva, reforma, etc. |

### Diferenças práticas por tipo

| Aspecto | Personal | Family | Business | Project |
|---|---|---|---|---|
| Membros esperados | 1 | 2+ | 2+ (ou 1) | 1+ |
| Templates de categoria | Pessoal (moradia, alimentação, saúde) | Doméstico (casa, educação, lazer) | Operacional (serviços, impostos, folha) | Objetivo (reserva, custo do projeto) |
| Foco do dashboard | Saldo pessoal, meta de economia | Gastos por membro, orçamento coletivo | Fluxo de caixa, lucro operacional | Progresso da meta, prazo estimado |
| Campo de renda | Renda pessoal | Renda combinada do núcleo | Receita operacional | Meta de valor acumulado |
| Convite de membros | Raramente | Central | Opcional | Opcional |

> **Importante:** O tipo é definido na criação e **não pode ser alterado**. Cada tipo influencia os templates de categoria e os rótulos do dashboard, mas não restringe funcionalidade — qualquer tipo pode ter múltiplos membros e categorias customizadas. Se o usuário precisar de outro tipo, deve criar uma nova carteira.

> **Tipo `project` no MVP:** não possui campos extras obrigatórios (sem prazo, sem valor-alvo). Essas funcionalidades serão implementadas futuramente, vinculadas a Goals, não à entidade Wallet.

---

## 3. Ciclo de Vida da Carteira

### 3.1 Criação

```
[Usuário acessa /wallets ou completa onboarding]
        │
        ▼
[Informa nome e tipo]
        │
        ▼
[Sistema aplica template de categorias sugeridas para o tipo]
        │
        ▼
[Carteira criada — criador vira owner automaticamente]
        │
        ▼
[Usuário pode convidar membros (opcional)]
```

**Restrições na criação:**
- Nome é obrigatório e deve ter entre 2 e 60 caracteres
- Tipo é obrigatório e **imutável após a criação** — não há fluxo de alteração de tipo no MVP
- O criador é sempre o `owner` — não pode ser alterado no ato de criação
- Não há limite de carteiras por usuário no MVP

---

### 3.2 Edição

**O que pode ser editado:**

| Campo | Quem pode editar | Restrições |
|---|---|---|
| Nome | owner, admin | Mínimo 2, máximo 60 caracteres |
| Descrição | owner, admin | Opcional, máximo 200 caracteres |
| Tipo | — | **Imutável após criação — sem exceções no MVP** |

**O que não pode ser editado:**
- Tipo da carteira — definitivo na criação
- Owner — apenas transferível via ação específica de transferência

---

### 3.3 Arquivamento e Desarquivamento

```
[Owner solicita arquivamento]
        │
        ├─► [Única carteira ativa do usuário] → bloqueado
        │   "Você precisa ter ao menos uma carteira ativa.
        │    Crie outra carteira antes de arquivar esta."
        │
        ▼
[Sistema exibe confirmação com impacto]
   "Carteira arquivada. Nenhum novo lançamento
    poderá ser criado. Dados preservados.
    Você pode desarquivar a qualquer momento."
        │
        ▼
[Carteira arquivada]
        ├─► Exibida em seção separada "Arquivadas" em /wallets
        ├─► Não aparece no WalletSwitcher global
        ├─► Dados acessíveis em modo leitura
        └─► Recorrências ativas vinculadas são encerradas automaticamente

[Owner solicita desarquivamento]
        │
        ▼
[Carteira volta ao status active]
        ├─► Reaparece no WalletSwitcher global
        └─► Dados históricos intactos; recorrências não são restauradas automaticamente
```

**Regras do arquivamento:**
- Apenas o `owner` pode arquivar ou desarquivar
- Não é permitido arquivar se for a **única carteira ativa** do usuário
- Carteiras arquivadas não aceitam novos lançamentos, categorias, orçamentos ou metas
- Dados históricos permanecem acessíveis em modo leitura após arquivamento
- Desarquivamento restaura o status `active` imediatamente
- Recorrências ativas são encerradas ao arquivar; **não são restauradas** ao desarquivar — o usuário deve reconfigurar

---

### 3.4 Compartilhamento e Convites

```
[Owner ou admin acessa painel de membros]
        │
        ▼
[Informa e-mail do convidado e seleciona role]
        │
        ├─► [E-mail já é membro ativo] → erro: "já faz parte desta carteira"
        ├─► [E-mail com convite pending] → erro: "convite já enviado — aguardando aceitação"
        │
        ▼
[Sistema envia e-mail de convite com link de aceitação]
[Convite expira em 7 dias]
        │
        ▼
[Convidado aceita dentro do prazo]
        │
        ├─► [Tem conta] → acesso imediato à carteira
        └─► [Não tem conta] → silent signup; acessa após validar OTP

[Convidado não aceita em 7 dias]
        └─► invite_status → expired; pode ser reenviado pelo owner ou admin
```

**Regras do compartilhamento:**
- Convite expira em **7 dias** — prazo fixo, sem configuração por usuário
- Convite pendente pode ser cancelado pelo emissor (owner ou admin que enviou)
- Convite expirado pode ser reenviado, gerando novo token e novo prazo de 7 dias
- O reenvio invalida o token anterior antes de emitir o novo
- O convidado precisa aceitar ativamente — não há adição automática de membro
- Apenas `owner` pode convidar com role `admin`
- `admin` pode convidar com roles `editor` e `viewer` exclusivamente
- `editor` e `viewer` não possuem poder de convite

---

## 4. Modelo de Membros

### Estrutura de participação

```
Carteira
  └── WalletMember[]
        ├── owner      (1 — obrigatório, único)
        ├── admin[]    (0-N)
        ├── editor[]   (0-N)
        └── viewer[]   (0-N)
```

### Ciclo de vida de um membro

```
[Convite enviado] → invite_status: pending (TTL: 7 dias)
        │
        ├─► [Aceita dentro do prazo]  → invite_status: accepted  → membro ativo
        ├─► [Rejeita]                 → invite_status: rejected  → registro mantido para auditoria
        └─► [Expira sem resposta]     → invite_status: expired   → pode ser reenviado
```

### Remoção de membro

- `owner` pode remover qualquer membro (admin, editor, viewer)
- `admin` pode remover apenas `editor` e `viewer`
- Membro pode remover a si mesmo (sair da carteira), **exceto o `owner`**
- `owner` não pode sair sem transferir o ownership antes

### Transferência de ownership

- Exclusiva do `owner` atual — nenhum outro role pode iniciar
- Novo owner deve ser membro ativo da carteira (`invite_status: accepted`)
- **Ao transferir: o owner anterior assume automaticamente o role `admin`** — sem opção de escolher outro role no MVP
- A transferência é irreversível sem uma nova transferência pelo novo owner

### Exclusão de conta

- **Bloqueada** enquanto o usuário for `owner` de qualquer carteira, ativa ou arquivada
- Antes de excluir a conta, o usuário deve transferir o ownership de todas as carteiras em que é owner, ou encerrar essas carteiras por fluxo futuro adequado
- Não há auto-promoção automática de admin ao owner

---

## 5. Matriz de Permissões

### Legenda

| Símbolo | Significado |
|---|---|
| ✅ | Permitido |
| ❌ | Bloqueado |
| ⚠️ | Restrito (ver nota) |

### Gestão da Carteira

| Ação | Owner | Admin | Editor | Viewer |
|---|---|---|---|---|
| Editar nome/descrição da carteira | ✅ | ✅ | ❌ | ❌ |
| Arquivar/desarquivar carteira | ✅ | ❌ | ❌ | ❌ |
| Excluir carteira permanentemente | ✅ | ❌ | ❌ | ❌ |
| Transferir ownership | ✅ | ❌ | ❌ | ❌ |
| Ver configurações da carteira | ✅ | ✅ | ❌ | ❌ |

### Gestão de Membros

| Ação | Owner | Admin | Editor | Viewer |
|---|---|---|---|---|
| Convidar com role owner | ❌ | ❌ | ❌ | ❌ |
| Convidar com role admin | ✅ | ❌ | ❌ | ❌ |
| Convidar com role editor ou viewer | ✅ | ✅ | ❌ | ❌ |
| Remover membro admin | ✅ | ❌ | ❌ | ❌ |
| Remover membro editor/viewer | ✅ | ✅ | ❌ | ❌ |
| Alterar role de qualquer membro | ✅ | ⚠️ editor/viewer apenas | ❌ | ❌ |
| Sair da carteira | ⚠️ somente após transfer | ✅ | ✅ | ✅ |
| Ver lista de membros | ✅ | ✅ | ✅ | ✅ |

### Categorias

| Ação | Owner | Admin | Editor | Viewer |
|---|---|---|---|---|
| Criar/editar/desativar categoria | ✅ | ✅ | ✅ | ❌ |
| Ver categorias | ✅ | ✅ | ✅ | ✅ |

### Lançamentos (Entries)

| Ação | Owner | Admin | Editor | Viewer |
|---|---|---|---|---|
| Criar lançamento | ✅ | ✅ | ✅ | ❌ |
| Editar lançamento próprio | ✅ | ✅ | ✅ | ❌ |
| Editar lançamento de outro membro | ✅ | ✅ | ❌ | ❌ |
| Excluir lançamento próprio | ✅ | ✅ | ✅ | ❌ |
| Excluir lançamento de outro membro | ✅ | ✅ | ❌ | ❌ |
| Ver todos os lançamentos | ✅ | ✅ | ✅ | ✅ |

> **Editor e lançamentos:** Editor cria, edita e exclui **apenas os próprios lançamentos** (`created_by = account_id`). Lançamentos de outros membros são somente leitura para o Editor. Essa regra é validada no backend — não apenas na UI.

### Orçamentos e Metas

| Ação | Owner | Admin | Editor | Viewer |
|---|---|---|---|---|
| Criar/editar orçamento e meta | ✅ | ✅ | ✅ | ❌ |
| Excluir orçamento ou meta | ✅ | ✅ | ❌ | ❌ |
| Ver orçamentos e metas | ✅ | ✅ | ✅ | ✅ |

---

## 6. Entidades Envolvidas

### 6.1 Wallet

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| name | string | 2–60 caracteres; obrigatório |
| description | string | Opcional; máximo 200 caracteres |
| type | enum | `personal` / `family` / `business` / `project`; **imutável após criação** |
| owner_id | UUID | FK → Account; atualizado a cada transferência de ownership |
| status | enum | `active` / `archived` |
| created_at | timestamp | |
| archived_at | timestamp | nullable; preenchido ao arquivar; nullificado ao desarquivar |
| updated_at | timestamp | |

---

### 6.2 WalletMember

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| wallet_id | UUID | FK → Wallet |
| account_id | UUID | FK → Account; nullable enquanto convite pendente |
| role | enum | `owner` / `admin` / `editor` / `viewer` |
| invite_status | enum | `pending` / `accepted` / `rejected` / `expired` |
| invited_by | UUID | FK → Account; quem enviou o convite |
| invited_email | string | E-mail alvo do convite |
| invited_at | timestamp | |
| accepted_at | timestamp | nullable |
| expires_at | timestamp | `invited_at + 7 dias`; fixo |

---

### 6.3 WalletInviteToken

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| wallet_member_id | UUID | FK → WalletMember |
| token | string | Hash do token do link de convite (não armazenar plain) |
| expires_at | timestamp | Consistente com `WalletMember.expires_at` |
| used_at | timestamp | nullable; preenchido ao aceitar o convite |

> **Por que separar WalletInviteToken de WalletMember?** O token é um segredo efêmero de uso único; WalletMember é o registro de longo prazo da participação. Separar simplifica revogação, reenvio e auditoria.

---

### 6.4 Dependências transitivas

Entidades fora do escopo de `/wallets` que dependem diretamente da carteira existir:

| Entidade | Campo de vínculo |
|---|---|
| Category | wallet_id |
| Entry | wallet_id |
| Budget | wallet_id |
| Goal | wallet_id |
| Debt | wallet_id |

---

## 7. Regras de Negócio

### 7.1 Criação

| ID | Regra |
|---|---|
| RN-01 | Qualquer usuário autenticado pode criar carteiras **sem limite de quantidade** no MVP |
| RN-02 | O criador da carteira torna-se automaticamente `owner` |
| RN-03 | O tipo da carteira é definido na criação e **não pode ser alterado depois** — para mudar de tipo, o usuário deve criar uma nova carteira |
| RN-04 | Ao criar, o sistema aplica o template de categorias padrão correspondente ao tipo escolhido |
| RN-05 | Nome da carteira deve ter entre 2 e 60 caracteres; não pode ser vazio |
| RN-06 | Carteiras do tipo `project` não possuem campos extras no MVP — prazo e valor-alvo ficam para evolução futura vinculada a Goals |

---

### 7.2 Edição

| ID | Regra |
|---|---|
| RN-07 | Apenas `owner` e `admin` podem editar nome e descrição da carteira |
| RN-08 | O tipo da carteira não pode ser editado após criação — endpoint de edição deve rejeitar qualquer tentativa de alterar o campo `type` |
| RN-09 | Alterações de configuração ficam registradas em log de auditoria |

---

### 7.3 Arquivamento e Desarquivamento

| ID | Regra |
|---|---|
| RN-10 | Apenas o `owner` pode arquivar ou desarquivar a carteira |
| RN-11 | **Não é permitido arquivar a única carteira ativa do usuário** — o sistema deve bloquear com mensagem clara e orientar a criar outra carteira antes |
| RN-12 | Carteiras arquivadas não aceitam criação de novos lançamentos, categorias, orçamentos ou metas |
| RN-13 | Dados históricos de carteira arquivada permanecem acessíveis em modo leitura |
| RN-14 | O `WalletSwitcher` global não exibe carteiras arquivadas |
| RN-15 | Ao arquivar, todas as `RecurrenceConfig` ativas vinculadas à carteira são encerradas automaticamente (`status = ended`) |
| RN-16 | Ao desarquivar, a carteira volta ao status `active`, `archived_at` é nullificado e a carteira reaparece no `WalletSwitcher` |
| RN-17 | Recorrências encerradas pelo arquivamento **não são restauradas** automaticamente ao desarquivar — o usuário deve reconfigurar se necessário |

---

### 7.4 Membros e Convites

| ID | Regra |
|---|---|
| RN-18 | Convite é pessoal: um e-mail por convite, por carteira, por vez |
| RN-19 | Não pode existir dois convites com `invite_status = pending` para o mesmo e-mail na mesma carteira |
| RN-20 | Convite expira em **7 dias** a partir de `invited_at` |
| RN-21 | Reenvio de convite invalida o token anterior (`used_at = now()` no `WalletInviteToken`) e cria novo token com novo prazo de 7 dias |
| RN-22 | Apenas `owner` pode convidar com role `admin` |
| RN-23 | `admin` pode convidar apenas com roles `editor` ou `viewer` |
| RN-24 | `editor` e `viewer` não possuem poder de convite |
| RN-25 | O `owner` não pode sair da carteira sem antes transferir o ownership |
| RN-26 | Ao transferir ownership, o antigo `owner` assume role **`admin` automaticamente** — sem opção de escolher outro role no MVP |
| RN-27 | O novo `owner` deve ser membro ativo (`invite_status: accepted`) da carteira no momento da transferência |
| RN-28 | `admin` pode remover `editor` e `viewer`, mas não outros `admin` nem o `owner` |
| RN-29 | Membro pode sair da carteira (auto-remoção), exceto o `owner` |
| RN-30 | Convite expirado pode ser reenviado pelo `owner` ou `admin` |

---

### 7.5 Exclusão de Conta

| ID | Regra |
|---|---|
| RN-31 | Exclusão de conta é **bloqueada** enquanto o usuário for `owner` de qualquer carteira — ativa ou arquivada |
| RN-32 | Para desbloquear a exclusão de conta, o usuário deve transferir ownership de todas as carteiras em que é owner, ou encerrar essas carteiras por fluxo futuro adequado |
| RN-33 | Não há auto-promoção automática de admin para owner em nenhuma circunstância |

---

### 7.6 Lançamentos por Role

| ID | Regra |
|---|---|
| RN-34 | `editor` pode criar, editar e excluir apenas lançamentos em que `entry.created_by = account_id do editor` |
| RN-35 | `editor` não pode editar nem excluir lançamentos criados por outros membros — validação obrigatória no backend, não apenas na UI |
| RN-36 | `owner` e `admin` podem editar e excluir qualquer lançamento da carteira, independentemente de quem o criou |

---

### 7.7 Isolamento de Dados

| ID | Regra |
|---|---|
| RN-37 | Toda query de dados financeiros deve ser filtrada por `wallet_id` — nenhum dado cruza carteiras |
| RN-38 | Transferência entre carteiras é um tipo específico de lançamento — não mistura os dados das carteiras |
| RN-39 | Usuário só acessa carteiras em que possui `WalletMember.invite_status = accepted` |

---

## 8. Estados da Interface — `/wallets`

### 8.1 Estados da listagem principal

| Estado | Descrição |
|---|---|
| `loading` | Carregando lista de carteiras do usuário |
| `empty` | Nenhuma carteira ativa — não deve ocorrer em fluxo normal pós-onboarding |
| `list_active` | Lista de carteiras ativas exibida |
| `list_with_archived` | Lista ativa + seção de arquivadas expandida |
| `error_load` | Falha ao carregar carteiras — exibir retry |

### 8.2 Estados do modal de criação

| Estado | Descrição |
|---|---|
| `idle` | Modal fechado |
| `open_step_type` | Seleção de tipo de carteira com descrições dos tipos |
| `open_step_name` | Input de nome (e descrição opcional) |
| `submitting` | Criação em andamento (loading) |
| `success` | Carteira criada — modal fecha, lista atualiza |
| `error_validation` | Campo inválido — feedback inline |
| `error_create` | Falha na criação — mensagem de erro com retry |

### 8.3 Estados do WalletCard

| Estado | Descrição |
|---|---|
| `default` | Exibição normal da carteira ativa |
| `active_wallet` | Carteira atualmente selecionada no contexto global |
| `archived` | Carteira arquivada — exibida em seção separada, modo leitura, com opção de desarquivar |
| `loading_action` | Ação em andamento (arquivar, renomear, desarquivar) |

### 8.4 Estados do modal de configurações (WalletSettingsModal)

| Estado | Descrição |
|---|---|
| `idle` | Modal fechado |
| `open_settings` | Edição de nome/descrição |
| `open_archive_confirm` | Confirmação de arquivamento com aviso de impacto e encerramento de recorrências |
| `open_archive_blocked` | Bloqueio de arquivamento — única carteira ativa; exibe orientação para criar nova carteira |
| `open_unarchive_confirm` | Confirmação de desarquivamento |
| `open_transfer_ownership` | Seleção de novo owner entre membros ativos |
| `submitting` | Ação sendo executada |
| `success` | Mudança aplicada |
| `error` | Falha — mensagem com retry |

### 8.5 Estados do painel de membros (WalletMembersPanel)

| Estado | Descrição |
|---|---|
| `idle` | Painel fechado |
| `open_members_list` | Lista de membros ativos e convites pendentes/expirados |
| `open_invite_form` | Formulário de convite aberto |
| `submitting_invite` | Convite sendo enviado |
| `invite_success` | Convite enviado — formulário limpa, lista atualiza |
| `invite_error_duplicate` | Membro ou convite pending já existente |
| `invite_error_generic` | Falha no envio |
| `confirm_remove_member` | Confirmação antes de remover membro |
| `removing_member` | Remoção em andamento |
| `confirm_leave_wallet` | Confirmação de saída da carteira (auto-remoção) |
| `confirm_transfer_ownership` | Confirmação de transferência de ownership com aviso de role resultante |

---

## 9. Riscos

### 9.1 Riscos de UX

| ID | Risco | Severidade | Mitigação |
|---|---|---|---|
| R-01 | **Carteira ativa não fica clara** — usuário não sabe em qual carteira está operando | Alta | `WalletSwitcher` sempre visível no header global; nome da carteira ativa destacado em todas as páginas |
| R-02 | **Arquivamento acidental** — usuário arquiva carteira com dados por engano | Alta | Confirmação com texto de impacto claro, incluindo aviso de encerramento de recorrências; botão de arquivamento fora do caminho principal |
| R-03 | **Tipo imutável causa frustração** — usuário quer mudar de `personal` para `family` após uso real | Alta | Exibir aviso claro no momento da criação: "O tipo não poderá ser alterado depois. Crie outra carteira se precisar de um tipo diferente." |
| R-04 | **Confusão sobre tipos** — usuário não entende a diferença entre `personal`, `family` e `project` | Média | Descrições curtas com exemplos concretos no seletor de tipo durante a criação |
| R-05 | **Membro convidado sem contexto** — o convidado aceita sem entender o que é a carteira | Baixa | E-mail de convite deve incluir nome da carteira, tipo e nome do convidante |
| R-06 | **Recorrências encerradas ao arquivar surpreendem o usuário** — usuário não sabia que isso ocorreria | Média | Modal de confirmação de arquivamento deve listar explicitamente "X recorrências ativas serão encerradas" |

### 9.2 Riscos de Segurança

| ID | Risco | Severidade | Mitigação |
|---|---|---|---|
| R-07 | **Escalada de privilégio** — editor tenta assumir role admin ou editar lançamentos de outros via API | Alta | Validar role do solicitante e `created_by` do lançamento no backend antes de qualquer ação; nunca confiar apenas na UI |
| R-08 | **Acesso por token de convite vencido** — link expirado reutilizado | Alta | Validar `expires_at` e `used_at` no servidor em toda requisição de aceitação de convite |
| R-09 | **Vazamento de dados entre carteiras** — query sem filtro `wallet_id` expõe dados cruzados | Alta | Toda query de domínio financeiro escopada por `wallet_id`; testes de isolamento obrigatórios |
| R-10 | **Carteira sem owner após exclusão de conta** — conta excluída deixa carteiras órfãs | Alta | Exclusão de conta bloqueada enquanto usuário for owner de qualquer carteira (RN-31) |
| R-11 | **Enumeração de membros** — endpoint de convite retorna erro diferente para "e-mail já membro" vs "e-mail inválido" | Média | Mensagens padronizadas no backend; distinção visível na UI apenas para solicitantes com permissão |

### 9.3 Riscos de Modelagem

| ID | Risco | Severidade | Mitigação |
|---|---|---|---|
| R-12 | **Múltiplos convites para o mesmo e-mail em paralelo** — race condition em envios simultâneos | Média | Constraint de unicidade no banco: `UNIQUE (wallet_id, invited_email) WHERE invite_status = 'pending'` |
| R-13 | **Role indefinido após transferência de ownership** — owner antigo sem role por falha na transação | Média | Transferência e atribuição de role `admin` ao antigo owner em transação atômica única — ou ambos ocorrem ou nenhum |
| R-14 | **Crescimento de carteiras sem controle visual** — usuário cria muitas carteiras e perde gestão | Baixa | UI de listagem com busca e filtros; sem limite técnico no MVP |

---

## 10. Critérios de Aceite

### 10.1 Criação de carteira

- [ ] **CA-01** — Usuário autenticado pode criar uma nova carteira informando nome e tipo, sem limite de quantidade
- [ ] **CA-02** — Nome vazio ou com menos de 2 caracteres é rejeitado com feedback inline
- [ ] **CA-03** — Ao criar, o usuário torna-se automaticamente `owner` da carteira
- [ ] **CA-04** — As categorias padrão do tipo selecionado são aplicadas automaticamente à carteira criada
- [ ] **CA-05** — A carteira recém-criada aparece na lista de carteiras ativas imediatamente
- [ ] **CA-06** — O seletor de tipo exibe aviso claro de que o tipo não poderá ser alterado após a criação

### 10.2 Edição de carteira

- [ ] **CA-07** — `owner` e `admin` podem editar nome e descrição da carteira
- [ ] **CA-08** — `editor` e `viewer` não enxergam opções de edição de configurações
- [ ] **CA-09** — Alteração de nome é refletida imediatamente no `WalletSwitcher` global
- [ ] **CA-10** — Tipo da carteira não pode ser alterado após criação — endpoint retorna erro ao receber campo `type` em PATCH
- [ ] **CA-11** — Tentativa de alterar `type` via API retorna 422 com mensagem "O tipo da carteira não pode ser alterado"

### 10.3 Arquivamento e Desarquivamento

- [ ] **CA-12** — Apenas o `owner` visualiza e aciona a opção de arquivar
- [ ] **CA-13** — Tentativa de arquivar a única carteira ativa é bloqueada com mensagem orientando criar outra carteira antes
- [ ] **CA-14** — Acionamento de arquivamento exibe modal de confirmação com descrição do impacto, incluindo encerramento de recorrências
- [ ] **CA-15** — Carteira arquivada não aparece no `WalletSwitcher` global
- [ ] **CA-16** — Carteira arquivada aparece em seção separada em `/wallets`, em modo leitura
- [ ] **CA-17** — Tentativa de criar lançamento em carteira arquivada retorna erro claro
- [ ] **CA-18** — Dados históricos da carteira arquivada permanecem acessíveis
- [ ] **CA-19** — Ao arquivar, todas as recorrências ativas da carteira são encerradas automaticamente
- [ ] **CA-20** — `owner` pode desarquivar uma carteira arquivada; ela reaparece no `WalletSwitcher`
- [ ] **CA-21** — Recorrências encerradas pelo arquivamento não são restauradas ao desarquivar

### 10.4 Membros e Convites

- [ ] **CA-22** — `owner` pode convidar com roles `admin`, `editor` ou `viewer`; não pode convidar com role `owner`
- [ ] **CA-23** — `admin` pode convidar apenas com roles `editor` ou `viewer`
- [ ] **CA-24** — `editor` e `viewer` não enxergam opção de convidar
- [ ] **CA-25** — Convite duplicado para e-mail com status `pending` na mesma carteira retorna erro
- [ ] **CA-26** — Convidado recebe e-mail com nome da carteira, tipo e nome do convidante
- [ ] **CA-27** — Convite expira após 7 dias; aceitação de convite expirado retorna erro e orienta reenvio
- [ ] **CA-28** — `owner` pode remover qualquer membro exceto si próprio sem transferência
- [ ] **CA-29** — `admin` pode remover apenas `editor` e `viewer`; tentativa de remover `admin` ou `owner` retorna 403
- [ ] **CA-30** — Membro pode sair da carteira; `owner` é bloqueado de sair sem transferência
- [ ] **CA-31** — Após transferência de ownership, o antigo `owner` assume automaticamente role `admin`
- [ ] **CA-32** — Modal de transferência de ownership exibe aviso: "Você passará a ser admin desta carteira"
- [ ] **CA-33** — Transferência e atribuição de role ao antigo owner ocorrem atomicamente — ou ambos ou nenhum

### 10.5 Lançamentos por role

- [ ] **CA-34** — `editor` pode editar e excluir apenas lançamentos em que `created_by` é o próprio account_id
- [ ] **CA-35** — Tentativa de `editor` editar lançamento de outro membro via API retorna 403
- [ ] **CA-36** — `owner` e `admin` podem editar e excluir qualquer lançamento da carteira

### 10.6 Exclusão de conta e isolamento

- [ ] **CA-37** — Tentativa de excluir conta com carteiras ativas ou arquivadas em que o usuário é `owner` é bloqueada com mensagem clara
- [ ] **CA-38** — Usuário sem `WalletMember` aceito não consegue acessar dados da carteira via API
- [ ] **CA-39** — Lançamentos, categorias e orçamentos de uma carteira não aparecem em outra
- [ ] **CA-40** — Tentativa de alterar role via API sem permissão retorna 403

---

## 11. Backlog Inicial Priorizado

### P0 — Crítico (bloqueante para MVP)

| ID | Item | Camada | Observação |
|---|---|---|---|
| B-01 | Endpoint de criação de carteira (nome, tipo, owner automático) | Backend | Sem limite de quantidade por usuário |
| B-02 | Aplicação automática de template de categorias por tipo de carteira | Backend / Dados | |
| B-03 | Endpoint de listagem de carteiras do usuário autenticado | Backend | Separar ativas e arquivadas |
| B-04 | Endpoint de edição de carteira (nome, descrição) com rejeição de `type` | Backend | Retornar 422 ao tentar alterar `type` |
| B-05 | Endpoint de arquivamento com bloqueio de única carteira ativa | Backend | Encerra recorrências ativas atomicamente |
| B-06 | Endpoint de desarquivamento de carteira | Backend | Restaura status `active` e nullifica `archived_at` |
| B-07 | Isolamento de dados por `wallet_id` em todas as queries de domínio | Backend | |
| B-08 | Validação de `created_by` para ações de editor em lançamentos | Backend | Editor só opera sobre próprios lançamentos |
| B-09 | Página `/wallets` com lista ativa, seção de arquivadas e `CreateWalletButton` | Frontend | |
| B-10 | Modal de criação com seletor de tipo e aviso de imutabilidade | Frontend | |
| B-11 | `WalletSettingsModal` com edição, arquivamento, desarquivamento e bloqueio | Frontend | |
| B-12 | `WalletSwitcher` global que exibe apenas carteiras ativas | Frontend | |

### P1 — Alta (colaboração e membros)

| ID | Item | Camada | Observação |
|---|---|---|---|
| B-13 | Endpoint de convite de membro com validação de role do convidante | Backend | TTL fixo de 7 dias |
| B-14 | Endpoint de aceitação de convite via token com validação de expiração | Backend | |
| B-15 | Endpoint de reenvio de convite (invalida token anterior, renova prazo) | Backend | |
| B-16 | Endpoint de remoção de membro com validação de role | Backend | |
| B-17 | Endpoint de auto-saída de carteira com bloqueio para owner | Backend | |
| B-18 | Endpoint de transferência de ownership (atômico: novo owner + antigo vira admin) | Backend | |
| B-19 | Bloqueio de exclusão de conta enquanto usuário for owner de qualquer carteira | Backend | |
| B-20 | `WalletMembersPanel` com lista de membros, convites pendentes e expirados | Frontend | |
| B-21 | `InviteWalletMemberForm` com seleção de role e envio por e-mail | Frontend | |
| B-22 | `WalletPermissionsTable` com roles e ações por membro | Frontend | |
| B-23 | E-mail de convite com nome da carteira, tipo e nome do convidante | Backend / Infra | |

### P2 — Média (completude e segurança)

| ID | Item | Camada | Observação |
|---|---|---|---|
| B-24 | Logs de auditoria de ações de gestão de carteira | Backend | |
| B-25 | Testes de isolamento de dados entre carteiras | QA / Backend | |
| B-26 | UI de confirmação de transferência com aviso de role resultante | Frontend | |
| B-27 | UI de arquivamento listando recorrências que serão encerradas | Frontend | |

---

## 12. Decisões Encerradas

Todas as decisões abaixo foram definidas e incorporadas nas seções anteriores deste documento. Não há questões abertas.

| ID | Questão | Decisão |
|---|---|---|
| D-01 | O tipo da carteira pode ser alterado após criação? | **Não.** Tipo é imutável após criação. Para mudar de tipo, o usuário deve criar uma nova carteira. Sem fluxo de migração no MVP. |
| D-02 | Carteiras arquivadas podem ser desarquivadas? | **Sim.** O `owner` pode desarquivar a qualquer momento. A carteira volta ao status `active` e reaparece no `WalletSwitcher`. |
| D-03 | O sistema deve impedir arquivar a única carteira ativa? | **Sim.** Arquivamento bloqueado quando for a única carteira ativa. Mensagem orienta criar outra carteira antes. |
| D-04 | Qual é o TTL do convite de membro? | **7 dias.** Fixo, sem configuração por usuário. |
| D-05 | Como tratar carteira cujo owner deleta a conta? | **Bloquear exclusão de conta** enquanto o usuário for owner de qualquer carteira, ativa ou arquivada. O usuário deve transferir ownership antes. Sem auto-promoção automática. |
| D-06 | Ao transferir ownership, o antigo owner escolhe seu novo role? | **Não.** Antigo owner assume `admin` automaticamente no MVP, sem escolha de role. |
| D-07 | Editor pode editar/excluir lançamentos de outros membros? | **Não.** Editor opera apenas sobre os próprios lançamentos (`created_by = account_id`). Validação obrigatória no backend. |
| D-08 | Existe limite de carteiras por usuário? | **Não no MVP.** Sem limite técnico. Restrição por plano fica para fase futura. |
| D-09 | Carteiras do tipo `project` terão campos extras? | **Não no MVP.** Sem prazo nem valor-alvo na entidade Wallet. Essas funcionalidades serão vinculadas a Goals futuramente. |
| D-10 | Deve-se bloquear exclusão de conta enquanto o usuário for owner? | **Sim.** Bloqueio total enquanto o usuário for owner de qualquer carteira. Resolve a mesma questão de D-05. |
