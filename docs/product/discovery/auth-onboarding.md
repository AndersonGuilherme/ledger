# Discovery — `/auth/login` + `/onboarding`

**Produto:** Ledger — Gestão Financeira Pessoal e para Pequenas Empresas
**Escopo:** Autenticação via OTP e fluxo de primeiro acesso
**Data:** 2026-04-07
**Atualizado em:** 2026-04-07 — decisões abertas encerradas
**Status:** Aprovado — pronto para desenvolvimento

---

## Índice

1. [Fluxo](#1-fluxo)
2. [Entidades Envolvidas](#2-entidades-envolvidas)
3. [Regras de Negócio](#3-regras-de-negócio)
4. [Estados de Interface](#4-estados-de-interface)
5. [Riscos](#5-riscos)
6. [Critérios de Aceite](#6-critérios-de-aceite)
7. [Backlog Inicial Priorizado](#7-backlog-inicial-priorizado)
8. [Decisões Encerradas](#8-decisões-encerradas)

---

## 1. Fluxo

### 1.1 `/auth/login`

```
[Usuário acessa /auth/login]
        │
        ▼
[Informa e-mail]
        │
        ├─► [E-mail inválido] → feedback inline → retorna ao input
        │
        ▼
[Solicita envio de OTP]
        │
        ├─► [E-mail não existe] → conta criada automaticamente (silent signup) → OTP enviado
        │
        ▼
[Sistema envia OTP via e-mail — expira em 10 minutos]
        │
        ▼
[Usuário informa OTP]
        │
        ├─► [OTP inválido] → tentativas restantes exibidas
        │         │
        │         └─► [5ª tentativa incorreta] → OTP invalidado → exige novo envio
        ├─► [OTP expirado] → feedback + botão de reenvio
        │
        ▼
[Sessão criada — access token 15min + refresh token 7 dias]
        │
        ├─► [Primeiro acesso / onboarding_completed = false] → redireciona para /onboarding
        └─► [Acesso recorrente / onboarding_completed = true] → redireciona para /dashboard
```

### 1.2 `/onboarding`

```
[Usuário chega em /onboarding]
        │
        ▼
[Etapa 1 — Tipo de carteira]
   personal / família / empresa
        │
        ▼
[Etapa 2 — Nome da carteira]
        │
        ▼
[Etapa 3 — Categorias sugeridas]
   Templates pré-definidos por tipo de carteira
        │
        ▼
[Etapa 4 — Renda mensal base]
   Opcional — skip disponível
   Se não preenchida: dashboard exibe estado de dados incompletos
        │
        ▼
[Etapa 5 — Convidar membros]
   Opcional — skip disponível
        │
        ▼
[Finaliza onboarding → /dashboard]
   onboarding_completed = true
   Carteira ativa = carteira recém-criada
   Dados da etapa 4 editáveis posteriormente em /settings (configurações da carteira)
```

---

## 2. Entidades Envolvidas

### 2.1 Account (Conta do usuário)

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| email | string | único, identificador de login |
| onboarding_completed | boolean | controla redirecionamento pós-login; default `false` |
| created_at | timestamp | |

> **Silent signup:** conta criada automaticamente no primeiro envio de OTP para e-mail desconhecido. `onboarding_completed` inicia como `false`.

---

### 2.2 OTP

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| account_id | UUID | FK → Account |
| token | string | armazenar apenas o hash (bcrypt ou SHA-256) |
| expires_at | timestamp | `created_at + 10 minutos` |
| attempt_count | integer | contador de tentativas inválidas; default `0` |
| used_at | timestamp | nullable; preenchido ao validar com sucesso |
| created_at | timestamp | |

> **Invalidação por tentativas:** quando `attempt_count = 5`, o OTP é marcado como inválido (`used_at = now()`) mesmo sem validação bem-sucedida. Novo envio obrigatório.

---

### 2.3 AccessToken (Token de acesso — curta duração)

| Campo | Tipo | Notas |
|---|---|---|
| — | JWT assinado | Não armazenado no banco — stateless |
| `sub` (claim) | UUID | account_id |
| `exp` (claim) | timestamp | `iat + 15 minutos` |
| `jti` (claim) | UUID | identificador único do token |

> AccessToken é um JWT de curta duração (15 min). Não requer consulta ao banco em cada request — validado pela assinatura.

---

### 2.4 RefreshToken (Token de renovação — longa duração)

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| account_id | UUID | FK → Account |
| token | string | hash do token opaque enviado ao cliente |
| expires_at | timestamp | `created_at + 7 dias` |
| rotated_at | timestamp | nullable; preenchido ao ser trocado por novo token |
| revoked_at | timestamp | nullable; revogação manual |
| created_at | timestamp | |

> **Rotação:** ao usar um RefreshToken válido, ele é imediatamente marcado com `rotated_at = now()` e um novo RefreshToken é emitido. Uso de token já rotacionado indica possível sequestro de sessão — revogar todos os tokens do usuário.

---

### 2.5 Wallet (Carteira — criada no onboarding)

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| name | string | definido pelo usuário |
| type | enum | `personal` / `family` / `business` |
| owner_id | UUID | FK → Account |
| monthly_income | integer | centavos; nullable — preenchido na etapa 4 do onboarding |
| created_at | timestamp | |

> `monthly_income` pode ser `null` quando o usuário pula a etapa 4. O dashboard trata `null` como estado de dados incompletos e exibe CTA para preenchimento.

---

### 2.6 WalletMember (Membro da carteira — step 5 do onboarding)

| Campo | Tipo | Notas |
|---|---|---|
| wallet_id | UUID | FK → Wallet |
| account_id | UUID | FK → Account |
| role | enum | `owner` / `admin` / `editor` / `viewer` |
| invite_status | enum | `pending` / `accepted` / `rejected` |
| invited_at | timestamp | |

---

### 2.7 Category (Categoria — selecionada no onboarding)

| Campo | Tipo | Notas |
|---|---|---|
| id | UUID | PK |
| wallet_id | UUID | FK → Wallet |
| name | string | |
| type | enum | `income` / `expense` |
| is_default | boolean | template vs customizada |
| active | boolean | |

---

## 3. Regras de Negócio

### 3.1 Autenticação

| ID | Regra |
|---|---|
| RN-01 | O e-mail é o único identificador de login — não há senha |
| RN-02 | O OTP expira em **10 minutos** a partir da criação (`expires_at = created_at + 10min`) |
| RN-03 | O OTP é de uso único — após validação bem-sucedida, `used_at` é preenchido e o token torna-se inválido |
| RN-04 | Reenvio de OTP invalida o token anterior imediatamente (`used_at = now()` no token anterior) antes de criar o novo |
| RN-05 | Se o e-mail não existir no sistema, uma conta é criada automaticamente (silent signup) antes do envio do OTP |
| RN-06 | A resposta do endpoint de envio de OTP é sempre a mesma, independentemente de o e-mail existir ou não (anti-enumeração) |
| RN-07 | Rate-limiting obrigatório no envio de OTP: máximo de 3 envios por e-mail por hora e máximo de 10 envios por IP por hora |
| RN-08 | O OTP permite no máximo **5 tentativas de validação incorretas**; na 5ª tentativa inválida, o token é imediatamente invalidado e o usuário deve solicitar novo envio |
| RN-09 | Após validação bem-sucedida do OTP, o sistema emite um **AccessToken JWT (15 min)** e um **RefreshToken opaque (7 dias)** |
| RN-10 | Ao usar um RefreshToken válido para renovar sessão, o token usado é rotacionado: marcado com `rotated_at` e um novo RefreshToken é emitido |
| RN-11 | Uso de RefreshToken já rotacionado (`rotated_at IS NOT NULL`) indica possível sequestro — todos os RefreshTokens do usuário devem ser revogados imediatamente |
| RN-12 | Após login bem-sucedido, verificar `onboarding_completed` para determinar redirecionamento (`/onboarding` ou `/dashboard`) |

---

### 3.2 Onboarding

| ID | Regra |
|---|---|
| RN-13 | Onboarding é obrigatório no primeiro acesso (`onboarding_completed = false`) — não pode ser pulado inteiramente |
| RN-14 | A carteira criada no onboarding deve ter o usuário autenticado como `owner` |
| RN-15 | O tipo da carteira (etapa 1) define o conjunto de categorias sugeridas exibidas na etapa 3 |
| RN-16 | Ao menos uma categoria deve ser selecionada, ou as categorias padrão do template são aplicadas automaticamente |
| RN-17 | A renda mensal (etapa 4) é **opcional** — o usuário pode pular sem bloquear a conclusão do onboarding |
| RN-18 | Quando `Wallet.monthly_income` é `null`, o dashboard exibe estado de dados incompletos com CTA para preenchimento em `/settings` |
| RN-19 | Convidar membros (etapa 5) é opcional — skip disponível sem bloquear conclusão |
| RN-20 | Convite de membro envia e-mail; se o convidado não tem conta, ela é criada via silent signup no primeiro acesso |
| RN-21 | `onboarding_completed = true` é setado apenas ao concluir a última etapa com sucesso — nunca antes |
| RN-22 | Se o usuário fechar o app durante o onboarding, deve retomar do ponto onde parou no próximo login |
| RN-23 | Após conclusão do onboarding, os dados configurados (nome, renda mensal, categorias) tornam-se editáveis em `/settings` (configurações da carteira) — o onboarding em si não é re-exibido |

---

## 4. Estados de Interface

### 4.1 `/auth/login`

| Estado | Descrição |
|---|---|
| `idle_email` | Campo de e-mail vazio, aguardando input |
| `filling_email` | Usuário digitando e-mail |
| `submitting_email` | Requisição de envio de OTP em andamento (loading) |
| `awaiting_otp` | OTP enviado; campo de token visível; contador de 10 minutos opcional |
| `filling_otp` | Usuário digitando OTP |
| `validating_otp` | Requisição de validação em andamento (loading) |
| `authenticated` | Sucesso — redirecionamento imediato |
| `error_email_invalid` | Formato de e-mail inválido |
| `error_otp_invalid` | Token incorreto — exibir contagem de tentativas restantes (ex: "4 tentativas restantes") |
| `error_otp_exhausted` | 5ª tentativa incorreta — OTP invalidado; exibir botão "Solicitar novo código" |
| `error_otp_expired` | Token expirado — exibir botão de reenvio |
| `error_rate_limit` | Muitas tentativas — cooldown ativo com tempo restante |
| `error_generic` | Falha de rede ou erro inesperado |

### 4.2 `/onboarding`

| Estado | Descrição |
|---|---|
| `step_1_wallet_type` | Seleção do tipo de carteira |
| `step_2_wallet_name` | Input do nome da carteira |
| `step_3_categories` | Seleção de categorias do template |
| `step_4_income` | Input de renda mensal com opção de pular |
| `step_5_invite` | Formulário de convite de membros com opção de pular |
| `submitting` | Criação da carteira em andamento (loading) |
| `completed` | Onboarding finalizado — redirect para /dashboard |
| `resuming` | Usuário retornou ao onboarding incompleto; retoma na etapa correta |
| `error_create_wallet` | Falha ao criar carteira — exibir mensagem e permitir retry |
| `error_send_invite` | Falha ao enviar convite — não deve bloquear conclusão do onboarding |

---

## 5. Riscos

| ID | Risco | Severidade | Mitigação |
|---|---|---|---|
| R-01 | **Entregabilidade de e-mail** — provedores como Gmail podem spam-foldar ou bloquear | Alta | Usar serviço transacional dedicado (Resend, SendGrid ou SES). Monitorar bounce rate. |
| R-02 | **Enumeração de usuários** — resposta diferente para e-mail existente vs. inexistente vaza a base | Alta | Endpoint retorna sempre a mesma mensagem genérica (RN-06). Silent signup elimina a distinção. |
| R-03 | **Abuso de OTP por bot** — endpoint público pode ser usado para disparar e-mails em massa | Alta | Rate-limit por IP e por e-mail (RN-07). CAPTCHA opcional em caso de abuso detectado. |
| R-04 | **Sequestro de RefreshToken** — token de longa duração interceptado | Alta | Rotação obrigatória (RN-10). Uso de token rotacionado revoga toda a sessão do usuário (RN-11). |
| R-05 | **Silent signup indesejado** — e-mail com typo cria conta fantasma para endereço inexistente | Alta | Conta criada no silent signup só é utilizável após validar um OTP — nunca cria sessão sem validação. |
| R-06 | **Onboarding incompleto** — usuário fecha o app no meio e perde progresso | Média | Persistir etapa atual no backend; retomar na etapa correta no próximo login (RN-22). |
| R-07 | **Renda mensal null sem tratamento** — dashboard quebra ou exibe zero enganoso | Média | Dashboard trata `null` como estado distinto de `0` — exibe aviso e CTA (RN-18). |
| R-08 | **Convite não aceito** — membro convidado nunca aceita; carteira fica com pendência indefinida | Média | Expiração de convite com prazo definido + UI de pendências em `/members`. |
| R-09 | **Templates de categoria inadequados** — categorias sugeridas não refletem o perfil do usuário | Baixa | Templates curados por tipo de carteira com edição disponível no pós-onboarding. |
| R-10 | **Falta de orientação sobre spam** — usuário não encontra o e-mail de OTP | Baixa | Mensagem clara na UI: "verifique a pasta de spam caso não receba em 1 minuto". |

---

## 6. Critérios de Aceite

### 6.1 `/auth/login`

- [ ] **CA-01** — Ao submeter e-mail válido, o usuário recebe feedback visual de "OTP enviado" em até 3s
- [ ] **CA-02** — O campo de OTP só aparece após envio bem-sucedido do e-mail
- [ ] **CA-03** — OTP válido autentica o usuário e redireciona em até 1s
- [ ] **CA-04** — OTP expirado exibe mensagem clara e habilita botão de reenvio
- [ ] **CA-05** — OTP inválido exibe a contagem de tentativas restantes ("4 tentativas restantes", "3 tentativas restantes", etc.)
- [ ] **CA-06** — Na 5ª tentativa incorreta, o OTP é invalidado e a tela exibe mensagem "Código inválido. Solicite um novo código." com botão de reenvio
- [ ] **CA-07** — Após autenticação, usuário com `onboarding_completed = false` é redirecionado para `/onboarding`
- [ ] **CA-08** — Após autenticação, usuário com `onboarding_completed = true` é redirecionado para `/dashboard`
- [ ] **CA-09** — Reenvio de OTP invalida imediatamente o token anterior antes de emitir o novo
- [ ] **CA-10** — Rate-limit ativo exibe mensagem de tempo de espera ao usuário
- [ ] **CA-11** — A resposta do endpoint de envio de OTP é idêntica para e-mail existente e e-mail novo (anti-enumeração)
- [ ] **CA-12** — E-mail novo resulta em criação de conta (silent signup) e envio de OTP sem tela intermediária
- [ ] **CA-13** — AccessToken tem validade de 15 minutos; requisições com AccessToken expirado retornam 401
- [ ] **CA-14** — Uso de RefreshToken válido emite novo AccessToken e novo RefreshToken (rotação), invalidando o token anterior
- [ ] **CA-15** — Uso de RefreshToken já rotacionado revoga todos os RefreshTokens ativos do usuário e retorna 401

### 6.2 `/onboarding`

- [ ] **CA-16** — Usuário com `onboarding_completed = false` não consegue acessar `/dashboard` — é redirecionado para `/onboarding`
- [ ] **CA-17** — Cada etapa valida seu input antes de permitir avanço
- [ ] **CA-18** — A seleção de tipo de carteira (etapa 1) altera as categorias sugeridas (etapa 3)
- [ ] **CA-19** — Ao finalizar, a carteira é criada e o usuário autenticado é `owner`
- [ ] **CA-20** — As categorias selecionadas são vinculadas à nova carteira
- [ ] **CA-21** — A etapa 4 (renda mensal) exibe opção clara de pular sem bloquear avanço
- [ ] **CA-22** — Quando a etapa 4 é pulada, `Wallet.monthly_income` é salvo como `null`
- [ ] **CA-23** — A etapa de convite (etapa 5) pode ser pulada sem bloquear a conclusão
- [ ] **CA-24** — Se o usuário retorna ao onboarding incompleto, é posicionado na última etapa pendente
- [ ] **CA-25** — Falha no envio de convite não impede a conclusão do onboarding
- [ ] **CA-26** — `onboarding_completed` é marcado como `true` somente ao concluir a última etapa
- [ ] **CA-27** — Ao finalizar o onboarding, o usuário é redirecionado para `/dashboard` com a carteira criada já ativa
- [ ] **CA-28** — Após conclusão do onboarding, os dados da carteira são editáveis em `/settings` — o fluxo de onboarding não é re-exibido

---

## 7. Backlog Inicial Priorizado

### P0 — Crítico (bloqueante para MVP)

| ID | Item | Camada | Observação |
|---|---|---|---|
| B-01 | Endpoint de solicitação de OTP com silent signup | Backend | Cria conta se e-mail não existe; mesma resposta em ambos os casos |
| B-02 | Endpoint de validação de OTP com contagem de tentativas | Backend | Incrementa `attempt_count`; invalida ao atingir 5 |
| B-03 | Emissão de AccessToken (JWT 15min) + RefreshToken (opaque 7 dias) | Backend | Na validação bem-sucedida do OTP |
| B-04 | Endpoint de renovação de sessão com rotação de RefreshToken | Backend | Detecta e revoga toda a sessão se token já rotacionado |
| B-05 | Rate-limiting no envio de OTP (por e-mail e por IP) | Backend / Infra | 3/hora por e-mail; 10/hora por IP |
| B-06 | Tela de login com fluxo completo e-mail → OTP → sessão | Frontend | Inclui estado `error_otp_exhausted` com botão de reenvio |
| B-07 | Redirecionamento pós-login baseado em `onboarding_completed` | Backend / Frontend | |
| B-08 | Fluxo de onboarding multi-etapa (steps 1 a 5) com persistência de progresso | Frontend | |
| B-09 | Endpoint de criação de carteira com categorias e `monthly_income` nullable | Backend | |
| B-10 | Templates de categorias por tipo de carteira | Backend / Dados | |
| B-11 | Marcar `onboarding_completed = true` ao concluir etapa final | Backend | |

### P1 — Alta (importante para experiência)

| ID | Item | Camada | Observação |
|---|---|---|---|
| B-12 | Persistência de etapa do onboarding no backend (retomada após fechar app) | Backend / Frontend | |
| B-13 | Etapa de convite de membros no onboarding (step 5) | Frontend / Backend | |
| B-14 | Endpoint de convite de membro por e-mail | Backend | |
| B-15 | UX de reenvio de OTP com invalidação imediata do token anterior | Frontend | |
| B-16 | Middleware de autenticação validando AccessToken em todas as rotas protegidas | Backend | |

### P2 — Média (qualidade e segurança)

| ID | Item | Camada | Observação |
|---|---|---|---|
| B-17 | Instrução sobre spam na UI de aguardo de OTP | Frontend | |
| B-18 | Expiração automática de convite pendente de membro | Backend | |
| B-19 | Logs de auditoria de autenticação sem dados sensíveis | Backend / Infra | Nunca logar o valor do OTP ou do token |
| B-20 | CTA de dados incompletos no dashboard quando `monthly_income = null` | Frontend | Link para `/settings` da carteira |
| B-21 | Endpoint de revogação manual de sessão (logout) | Backend | Marca RefreshToken com `revoked_at` |

---

## 8. Decisões Encerradas

Todas as decisões abaixo foram definidas e incorporadas nas seções anteriores deste documento. Não há questões abertas.

| ID | Questão | Decisão |
|---|---|---|
| D-01 | Se o e-mail não existe: criar conta silenciosamente ou exibir tela de cadastro separada? | **Silent signup automático.** Conta criada antes do envio do OTP. Mesma resposta na UI independentemente de ser conta nova ou existente. |
| D-02 | TTL do OTP: 5 ou 10 minutos? | **10 minutos.** Conforme RN-02. |
| D-03 | TTL da sessão: quanto tempo o usuário permanece autenticado? | **AccessToken: 15 minutos. RefreshToken: 7 dias com rotação obrigatória.** Conforme RN-09 e RN-10. |
| D-04 | Renda mensal no onboarding é obrigatória ou opcional? | **Opcional.** Quando não preenchida, `monthly_income = null` e o dashboard exibe estado de dados incompletos com CTA. Conforme RN-17 e RN-18. |
| D-05 | Quantas tentativas erradas de OTP antes de expirar o token? | **5 tentativas.** Na 5ª tentativa inválida, o OTP é imediatamente invalidado e novo envio é exigido. Conforme RN-08. |
| D-06 | O onboarding deve ser re-visitável ou é one-time? | **One-time obrigatório.** Após conclusão, os dados tornam-se editáveis em `/settings` da carteira. O fluxo de onboarding não é re-exibido. Conforme RN-23. |
