# Ledger — Documento de Arquitetura

**Versão:** 1.1  
**Data:** 2026-04-07  
**Responsáveis:** Tech Lead, backend-nestjs-lead, frontend-nextjs-lead, data-architect, design-lead  
**Status:** Aprovado — pronto para setup do projeto

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estratégia de Repositório](#3-estratégia-de-repositório)
4. [Estrutura de Pastas](#4-estrutura-de-pastas)
5. [Onde o Prisma Vive](#5-onde-o-prisma-vive)
6. [Estratégia de Contratos](#6-estratégia-de-contratos)
7. [Organização do Backend (NestJS)](#7-organização-do-backend-nestjs)
8. [Organização do Frontend (Next.js)](#8-organização-do-frontend-nextjs)
9. [Design System e Linguagem Visual](#9-design-system-e-linguagem-visual)
10. [Gerenciamento de Estado e Sincronização](#10-gerenciamento-de-estado-e-sincronização)
11. [Estratégia de Cache e Invalidação](#11-estratégia-de-cache-e-invalidação)
12. [Ordem de Implementação](#12-ordem-de-implementação)
13. [Setup do Projeto](#13-setup-do-projeto)

---

## 1. Visão Geral

O Ledger é uma plataforma de gestão financeira pessoal e para pequenos negócios. A arquitetura reflete três princípios centrais derivados do discovery:

1. **Wallet como unidade de isolamento:** Todo dado financeiro é escopado por `wallet_id`. A arquitetura em todos os layers deve respeitar esse limite.
2. **Saldo nunca armazenado:** Toda lógica de agregação financeira (saldo, totais de período) acontece em SQL — a arquitetura não deve introduzir cache de valores calculados que possam divergir.
3. **Contratos como verdade única:** O frontend não deve conhecer a estrutura interna do banco. O contrato da API (DTOs/schemas) é a fronteira.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Frontend | Next.js 14+ (App Router) | SSR/SSG nativo, Server Components reduzem bundle e roundtrips iniciais |
| Backend | NestJS | Módulos tipados, pipes de validação, guards — alinhado à complexidade de auth e permissões do Ledger |
| Banco de dados | PostgreSQL 15+ | Suporte a UUID nativo, CTEs para agregações de saldo, triggers para imutabilidade de `wallet.type` |
| ORM | Prisma | Type-safety end-to-end, migrations versionadas, `prisma.$queryRaw` para agregações complexas |
| Validação | Zod | Schemas compartilhados entre FE e BE; runtime safety no boundary da API |
| Autenticação | JWT (Access) + Opaque token (Refresh) | Conforme discovery auth: 15 min access, 7 dias refresh com rotation |
| Package manager | pnpm | Workspaces nativos, eficiência de disco, lockfile determinístico |
| Linguagem | TypeScript 5+ | Strict mode em todos os pacotes |
| **Componentes UI** | **shadcn/ui + Radix UI** | **Headless primitivos acessíveis (Radix) + componentes prontos customizáveis (shadcn/ui); componentes são owned — fundamentais para sobrescrever shadows com neumorphism sem brigar com biblioteca** |
| **Animações** | **Framer Motion + GSAP** | **Framer Motion para animações de componentes e page transitions (React-first); GSAP para timelines complexas e scroll-driven animations de alta performance** |
| **Scroll suave** | **Lenis** | **Smooth scroll usado por agências premiadas (Awwwards); integra nativamente com GSAP ScrollTrigger** |
| **Micro-animações** | **Lottie (react-lottie-player)** | **Animações After Effects exportadas como JSON; used para estados de loading, empty states, success/error feedback** |
| **Data viz** | **Recharts** | **Biblioteca React-native para gráficos; totalmente customizável via props — compatível com neumorphism (sem estilos impostos)** |
| **Formulários** | **React Hook Form** | **Performance: re-render apenas no campo alterado; integração nativa com Zod via zodResolver** |
| **Tipografia** | **Geist (next/font)** | **Fonte da Vercel — clean, moderna, legível em dados financeiros; zero layout shift via next/font** |
| **Ícones** | **Lucide React** | **Padrão do shadcn/ui; consistência visual, tree-shakeable** |
| **Datas** | **date-fns** | **Modular, tree-shakeable, sem globals; suporte a locale pt-BR para competence_date** |
| **Design language** | **Neumorphism** | **Soft UI extrudido via box-shadow duplo (dark + light); aplicado via Tailwind plugin com tokens de sombra centralizados** |

---

## 3. Estratégia de Repositório

**Decisão: Monorepo com pnpm workspaces**

### Justificativa

- **Compartilhamento de contratos:** O pacote `packages/shared` expõe schemas Zod e tipos TypeScript usados tanto pelo NestJS (validação de DTOs) quanto pelo Next.js (tipagem de respostas). Sem monorepo, isso exigiria publicação de pacote ou cópia manual — ambos problemáticos em MVP.
- **Refatorações atômicas:** Mudanças no contrato de uma entidade (ex: adicionar campo `transfer_group_id` em Entry) atualizam FE e BE em um único commit, com CI validando a compatibilidade.
- **Complexidade baixa no MVP:** Dois apps + um pacote compartilhado não justificam a sobrecarga de multirepo (pipelines separados, versionamento de pacote, coordenação de releases).

### Estrutura raiz

```
ledger/
├── apps/
│   ├── api/          # NestJS
│   └── web/          # Next.js
├── packages/
│   └── shared/       # Zod schemas + tipos TypeScript compartilhados
├── package.json      # root (pnpm workspaces)
├── pnpm-workspace.yaml
├── turbo.json        # Turborepo para builds incrementais
└── tsconfig.base.json
```

**Turborepo** é adicionado para cache de builds e execução paralela de tasks (`dev`, `build`, `test`, `lint`) sem overhead de configuração.

---

## 4. Estrutura de Pastas

### 4.1 `apps/api` — Backend NestJS

```
apps/api/
├── src/
│   ├── main.ts                    # bootstrap, global pipes, CORS
│   ├── app.module.ts              # raiz: importa todos os módulos de feature
│   │
│   ├── config/                    # ConfigModule (env vars tipadas)
│   │   └── env.validation.ts
│   │
│   ├── common/                    # Guards, interceptors, decorators globais
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── wallet-member.guard.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── wallet-roles.decorator.ts
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts   # envelope { data, meta }
│   │   └── pipes/
│   │       └── zod-validation.pipe.ts
│   │
│   ├── prisma/                    # PrismaModule (singleton service)
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── modules/                   # Módulos de feature (ver seção 7)
│   │   ├── auth/
│   │   ├── users/
│   │   ├── wallets/
│   │   ├── members/
│   │   ├── categories/
│   │   ├── entries/
│   │   ├── recurrence/
│   │   └── dashboard/
│   │
│   └── database/                  # Migrations e seed (via Prisma)
│       └── seed.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── test/                          # e2e tests
├── .env.example
└── package.json
```

### 4.2 `apps/web` — Frontend Next.js

```
apps/web/
├── src/
│   ├── app/                       # App Router (Next.js 14)
│   │   ├── layout.tsx             # root layout (providers + Lenis)
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── onboarding/
│   │   │       └── page.tsx
│   │   └── (app)/                 # layout com sidebar, requer auth
│   │       ├── layout.tsx
│   │       ├── dashboard/
│   │       │   └── page.tsx       # Server Component (dados iniciais via fetch)
│   │       ├── wallets/
│   │       │   ├── page.tsx
│   │       │   └── [walletId]/
│   │       │       └── settings/
│   │       │           └── page.tsx
│   │       ├── entries/
│   │       │   └── page.tsx
│   │       ├── categories/
│   │       │   └── page.tsx
│   │       └── settings/
│   │           └── page.tsx
│   │
│   ├── features/                  # Lógica de UI por domínio
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── wallets/
│   │   ├── categories/
│   │   ├── entries/
│   │   └── dashboard/
│   │
│   ├── components/                # Componentes UI genéricos (design system)
│   │   ├── ui/                    # shadcn/ui primitivos (Button, Input, Modal…)
│   │   ├── neu/                   # Wrappers neumórficos (NeuCard, NeuButton…)
│   │   └── layout/                # Sidebar, Header, AppShell
│   │
│   ├── animations/                # Variants e utilitários de animação
│   │   ├── variants.ts            # Framer Motion variants reutilizáveis
│   │   ├── transitions.ts         # Configs de spring/ease globais
│   │   └── gsap.ts                # Registro de plugins GSAP + ScrollTrigger
│   │
│   ├── styles/
│   │   ├── globals.css            # CSS custom properties + reset
│   │   └── neu-tokens.css         # Tokens de sombra neumórficos (CSS vars)
│   │
│   ├── lib/
│   │   ├── api-client.ts          # fetch wrapper com auth headers
│   │   ├── query-client.ts        # TanStack Query client config
│   │   ├── format.ts              # formatCurrency, formatDate
│   │   └── utils.ts               # cn() (clsx + tailwind-merge)
│   │
│   ├── hooks/                     # Hooks genéricos (useLocalStorage, etc.)
│   │
│   └── providers/
│       ├── query-provider.tsx     # TanStack QueryClientProvider
│       ├── auth-provider.tsx      # contexto de sessão
│       └── lenis-provider.tsx     # Lenis smooth scroll (wraps app inteiro)
│
├── public/
│   └── animations/                # Arquivos .json do Lottie
│       ├── loading.json
│       ├── empty-state.json
│       └── success.json
├── tailwind.config.ts             # inclui plugin neumórfico
├── next.config.ts
└── package.json
```

### 4.3 `packages/shared` — Contratos Compartilhados

```
packages/shared/
├── src/
│   ├── index.ts                   # re-exports de tudo
│   │
│   ├── schemas/                   # Zod schemas (validação + inferência de tipos)
│   │   ├── auth.schema.ts
│   │   ├── wallet.schema.ts
│   │   ├── category.schema.ts
│   │   ├── entry.schema.ts
│   │   └── dashboard.schema.ts
│   │
│   └── types/                     # Tipos derivados dos schemas + enums
│       ├── enums.ts               # WalletType, EntryType, etc.
│       └── api.types.ts           # ApiResponse<T>, PaginatedResponse<T>
│
├── tsconfig.json
└── package.json
```

---

## 5. Onde o Prisma Vive

**Decisão: Prisma exclusivamente em `apps/api`**

### Justificativa

- O Prisma é um detalhe de implementação do backend. O frontend nunca deve importar o Prisma Client — isso exporia a estrutura do banco e introduziria acoplamento direto.
- O `prisma/schema.prisma` e as migrations vivem em `apps/api/prisma/`.
- O `PrismaService` é um módulo NestJS registrado como global singleton via `PrismaModule`.
- O frontend consome apenas os contratos definidos em `packages/shared` — nunca tipos gerados pelo Prisma.

### Anti-padrão a evitar

```typescript
// ❌ NUNCA no frontend
import { Entry } from '@prisma/client'

// ✅ Correto: tipo derivado do schema Zod compartilhado
import { EntryResponse } from '@ledger/shared'
```

---

## 6. Estratégia de Contratos

**Decisão: Zod schemas em `packages/shared` como source of truth**

### Fluxo de contrato

```
packages/shared/schemas/entry.schema.ts
        │
        ├── apps/api/  → ZodValidationPipe valida body/params
        │                  → tipos inferidos usados nos Services
        │
        └── apps/web/  → tipagem dos fetches
                           → validação opcional de resposta (runtime safety)
```

### Estrutura de um schema compartilhado

```typescript
// packages/shared/src/schemas/entry.schema.ts

import { z } from 'zod'

// Request schemas (body de criação/atualização)
export const CreateEntrySchema = z.object({
  wallet_id: z.string().uuid(),
  category_id: z.string().uuid(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().int().positive(),          // centavos, sempre positivo
  competence_date: z.string().date(),
  description: z.string().max(255).optional(),
  payment_date: z.string().date().optional(),
  status: z.enum(['pending', 'confirmed', 'late']).default('pending'),
})

export type CreateEntryDto = z.infer<typeof CreateEntrySchema>

// Response schemas (o que a API retorna)
export const EntryResponseSchema = z.object({
  id: z.string().uuid(),
  wallet_id: z.string().uuid(),
  category_id: z.string().uuid(),
  type: z.enum(['income', 'expense', 'transfer']),
  amount: z.number().int(),
  competence_date: z.string(),
  description: z.string().nullable(),
  payment_date: z.string().nullable(),
  status: z.enum(['pending', 'confirmed', 'late']),
  transfer_group_id: z.string().uuid().nullable(),
  deleted_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type EntryResponse = z.infer<typeof EntryResponseSchema>
```

### Envelope de resposta padrão da API

Todas as respostas da API seguem um envelope uniforme:

```typescript
// packages/shared/src/types/api.types.ts

export type ApiResponse<T> = {
  data: T
  meta?: {
    page?: number
    per_page?: number
    total?: number
  }
}

export type ApiError = {
  statusCode: number
  error: string
  message: string | string[]
}
```

---

## 7. Organização do Backend (NestJS)

**Decisão: Feature modules com responsabilidade única**

### Estrutura padrão de um módulo

Cada módulo de feature segue a mesma estrutura interna:

```
modules/entries/
├── entries.module.ts
├── entries.controller.ts        # HTTP: rotas, guards, parse params
├── entries.service.ts           # Regras de negócio, orquestra repositório
├── entries.repository.ts        # Acesso ao Prisma, queries SQL
├── dto/
│   ├── create-entry.dto.ts      # re-export + adapt do schema shared
│   └── update-entry.dto.ts
└── entries.types.ts             # tipos internos ao módulo (se necessário)
```

### Separação de responsabilidades

| Layer | Responsabilidade |
|-------|-----------------|
| Controller | Receber HTTP, aplicar guards/pipes, delegar ao Service, retornar resposta |
| Service | Regras de negócio, validações de domínio, orquestração entre repositórios |
| Repository | Queries Prisma/SQL puras, sem lógica de negócio |

O Controller **nunca** acessa o Prisma diretamente. O Service **nunca** monta queries SQL — delega ao Repository.

### Módulos do MVP

| Módulo | Responsabilidade principal |
|--------|--------------------------|
| `auth` | OTP, emissão e rotação de tokens, revogação |
| `users` | Perfil do usuário, `monthly_income` em onboarding |
| `wallets` | CRUD de wallets, archive/unarchive, validação de tipo |
| `members` | Convites, roles, transferência de ownership |
| `categories` | Categorias e subcategorias por wallet |
| `entries` | CRUD de entries, transfers, soft delete |
| `recurrence` | Geração de entries a partir de templates de recorrência |
| `dashboard` | Agregação única: `GET /wallets/:id/dashboard` |

### Guards e seu escopo

```typescript
// Guard de autenticação: aplicado globalmente via APP_GUARD
// Exceto rotas marcadas com @Public()
@Injectable()
export class JwtAuthGuard implements CanActivate { ... }

// Guard de permissão de wallet: aplicado por rota que recebe :walletId
// Lê o role do usuário na wallet e expõe via request
@Injectable()
export class WalletMemberGuard implements CanActivate { ... }

// Decorator para exigir role mínimo
@WalletRoles('editor', 'admin', 'owner')
@Get(':walletId/entries')
findAll() { ... }
```

### Tratamento de valores monetários

```typescript
// ✅ Todos os valores são INTEGER (centavos) no banco e nos DTOs
// A conversão para exibição acontece APENAS no frontend
// Nunca fazer aritmética em floats no backend

// Correto no Service:
const total = entries.reduce((sum, e) => sum + e.amount, 0)  // integers

// Errado:
const total = entries.reduce((sum, e) => sum + e.amount / 100, 0)  // float
```

---

## 8. Organização do Frontend (Next.js)

**Decisão: App Router + Server Components para carga inicial, Client Components para interatividade**

### Regra de ouro: onde cada tipo de componente vive

| Tipo | Onde | Responsabilidade |
|------|------|-----------------|
| Server Component | `app/` (pages e layouts) | Fetch inicial, SEO, sem JS no cliente |
| Client Component | `features/*/components/` | Formulários, modais, interatividade |
| Hook de dados | `features/*/hooks/` | TanStack Query (useQuery, useMutation) |
| Server Action | `features/*/actions/` | Mutations via Server Actions (alternativa ao fetch direto) |

### Estrutura de uma feature

```
features/entries/
├── components/
│   ├── EntryList.tsx              # Client Component
│   ├── EntryForm.tsx              # Client Component (form)
│   ├── EntryCard.tsx
│   └── TransferForm.tsx
├── hooks/
│   ├── use-entries.ts             # useQuery: lista de entries
│   ├── use-create-entry.ts        # useMutation: criar entry
│   └── use-delete-entry.ts        # useMutation: soft delete
├── schemas/                       # re-exports do shared, validação de form
│   └── entry-form.schema.ts
└── types.ts
```

### Dashboard: padrão de carga híbrida

O dashboard é o caso mais sensível — dados pesados, múltiplos blocos, invalidação seletiva.

```
app/(app)/dashboard/page.tsx       # Server Component
  └── fetch inicial: GET /wallets/:id/dashboard (com cookies de sessão)
      └── passa data como props para DashboardShell

features/dashboard/components/
  └── DashboardShell.tsx            # Client Component
        └── hidrata TanStack Query com initialData do Server Component
        └── cada bloco tem sua própria query key para invalidação seletiva
```

### Formatação de valores monetários

```typescript
// lib/format.ts — única fonte de verdade para formatação
export function formatCurrency(centavos: number, locale = 'pt-BR', currency = 'BRL') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(centavos / 100)
}

// Nunca fazer centavos / 100 fora deste utilitário
```

### Persistência do wallet ativo

```typescript
// hooks/use-active-wallet.ts
// localStorage key: 'ledger:active_wallet_id'
// Fallback: primeira wallet ativa do usuário (retornada pela API)
// PeriodFilter é mantido ao trocar de wallet (conforme discovery dashboard D-04)
```

---

## 9. Design System e Linguagem Visual

**Decisão: Neumorphism como linguagem visual; Framer Motion + GSAP como stack de animação; shadcn/ui como base de componentes**

### 9.1 Neumorphism — O que é e a restrição central

Neumorphism (Soft UI) cria profundidade visual simulando superfícies extrudidas via pares de sombras: uma sombra escura (direção sudeste) e uma sombra clara (direção noroeste) sobre um fundo de cor única. O resultado é o efeito de "plástico soft".

**Restrição crítica:** Neumorphism só funciona quando `background-color` do elemento é **idêntico** ao background do container pai. Qualquer variação de cor quebra o efeito. Toda a paleta deve derivar de um único token `--neu-bg`.

```css
/* styles/neu-tokens.css */
:root {
  /* Base — única cor de fundo do app inteiro */
  --neu-bg: #e8edf2;

  /* Sombras — derivadas da base */
  --neu-shadow-dark:  #c5ccd6;   /* ~15% mais escura que --neu-bg */
  --neu-shadow-light: #ffffff;   /* branco puro (highlight) */

  /* Raios padrão */
  --neu-radius-sm:  8px;
  --neu-radius-md: 16px;
  --neu-radius-lg: 24px;

  /* Intensidades */
  --neu-distance-sm:  4px;
  --neu-distance-md:  8px;
  --neu-distance-lg: 12px;
  --neu-blur-sm:     8px;
  --neu-blur-md:    16px;
  --neu-blur-lg:    24px;
}
```

### 9.2 Tailwind — Plugin neumórfico

Os tokens CSS são expostos como utilitários Tailwind via plugin customizado, evitando classes arbitrárias espalhadas:

```typescript
// tailwind.config.ts
import plugin from 'tailwindcss/plugin'

const neuPlugin = plugin(({ addUtilities }) => {
  addUtilities({
    // Elemento elevado (card, botão em repouso)
    '.neu-raised': {
      background: 'var(--neu-bg)',
      boxShadow: [
        '8px 8px 16px var(--neu-shadow-dark)',
        '-8px -8px 16px var(--neu-shadow-light)',
      ].join(', '),
    },
    // Elemento afundado (input focus, botão pressionado)
    '.neu-pressed': {
      background: 'var(--neu-bg)',
      boxShadow: [
        'inset 6px 6px 12px var(--neu-shadow-dark)',
        'inset -6px -6px 12px var(--neu-shadow-light)',
      ].join(', '),
    },
    // Flat (sem profundidade — usado em elementos secundários)
    '.neu-flat': {
      background: 'var(--neu-bg)',
      boxShadow: [
        '3px 3px 6px var(--neu-shadow-dark)',
        '-3px -3px 6px var(--neu-shadow-light)',
      ].join(', '),
    },
    // Variantes pequenas (para chips, badges)
    '.neu-raised-sm': {
      background: 'var(--neu-bg)',
      boxShadow: [
        '4px 4px 8px var(--neu-shadow-dark)',
        '-4px -4px 8px var(--neu-shadow-light)',
      ].join(', '),
    },
  })
})

export default {
  theme: {
    extend: {
      colors: {
        neu: { bg: 'var(--neu-bg)' },
      },
      borderRadius: {
        neu: 'var(--neu-radius-md)',
      },
    },
  },
  plugins: [neuPlugin],
}
```

### 9.3 Componentes neumórficos base (`components/neu/`)

Wrappers sobre shadcn/ui que aplicam o estilo sem duplicar lógica de acessibilidade:

```tsx
// components/neu/NeuCard.tsx
import { cn } from '@/lib/utils'

interface NeuCardProps extends React.HTMLAttributes<HTMLDivElement> {
  depth?: 'raised' | 'pressed' | 'flat'
}

export function NeuCard({ depth = 'raised', className, children, ...props }: NeuCardProps) {
  return (
    <div
      className={cn(
        'rounded-neu bg-neu-bg',
        {
          'neu-raised': depth === 'raised',
          'neu-pressed': depth === 'pressed',
          'neu-flat':    depth === 'flat',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
```

```tsx
// components/neu/NeuInput.tsx
// Input com estado rest (flat) → focus (pressed)
// Usa Radix UI Input primitive internamente via shadcn/ui
```

**Regra:** componentes em `components/neu/` apenas aplicam estilo visual. Nunca contêm lógica de negócio ou estado.

### 9.4 Acessibilidade com Neumorphism

Neumorphism tem risco inerente de baixo contraste. Regras obrigatórias:

| Elemento | Mínimo WCAG AA |
|----------|---------------|
| Texto sobre `--neu-bg` | Contraste ≥ 4.5:1 |
| Ícones interativos | Contraste ≥ 3:1 |
| Estados de foco | Ring de cor sólida (não apenas sombra) |
| Dados financeiros (saldo, valores) | Sempre `font-weight: 600+`, tamanho ≥ 16px |

```tsx
// Foco acessível: não depende apenas de sombra
<button className="neu-raised rounded-neu focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
```

### 9.5 Framer Motion — Estratégia de animação

**Usado para:** animações de componentes, page transitions, animações declarativas baseadas em estado.

```typescript
// animations/variants.ts — variants globais reutilizáveis

export const fadeInUp = {
  initial:  { opacity: 0, y: 16 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -8 },
}

export const scaleIn = {
  initial:  { opacity: 0, scale: 0.95 },
  animate:  { opacity: 1, scale: 1 },
  exit:     { opacity: 0, scale: 0.95 },
}

export const staggerChildren = {
  animate: { transition: { staggerChildren: 0.07 } },
}

export const slideInRight = {
  initial:  { opacity: 0, x: 24 },
  animate:  { opacity: 1, x: 0 },
  exit:     { opacity: 0, x: 24 },
}
```

```typescript
// animations/transitions.ts — spring configs globais

export const springSmooth = { type: 'spring', stiffness: 300, damping: 30 }
export const springBouncy  = { type: 'spring', stiffness: 400, damping: 20 }
export const easeFast      = { duration: 0.18, ease: [0.4, 0, 0.2, 1] }  // Material easing
```

**Padrões de uso:**

```tsx
// Page transition — em cada page.tsx
<motion.div variants={fadeInUp} initial="initial" animate="animate" exit="exit" transition={easeFast}>
  {children}
</motion.div>

// Lista com stagger (entry list, category list)
<motion.ul variants={staggerChildren} initial="initial" animate="animate">
  {entries.map(entry => (
    <motion.li key={entry.id} variants={fadeInUp}>
      <EntryCard entry={entry} />
    </motion.li>
  ))}
</motion.ul>

// Modal/drawer
<AnimatePresence>
  {isOpen && (
    <motion.div variants={scaleIn} initial="initial" animate="animate" exit="exit">
      <EntryForm />
    </motion.div>
  )}
</AnimatePresence>
```

### 9.6 GSAP — Animações complexas e scroll-driven

**Usado para:** scroll-driven animations, timelines com múltiplos stages, animações que não se encaixam no modelo declarativo do Framer Motion (contadores de valores monetários, progress bars animadas do dashboard).

```typescript
// animations/gsap.ts — registro centralizado (client-only)
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export { gsap, ScrollTrigger }
```

**Casos de uso no Ledger:**

```tsx
// Contador animado de saldo (dashboard)
// Ao carregar o bloco de saldo, anima de 0 até o valor real
useEffect(() => {
  const counter = { val: 0 }
  gsap.to(counter, {
    val: balanceCentavos,
    duration: 1.2,
    ease: 'power2.out',
    onUpdate: () => setDisplayValue(Math.round(counter.val)),
  })
}, [balanceCentavos])

// Progress bar de budget (anima width ao montar)
useEffect(() => {
  gsap.fromTo(barRef.current,
    { width: '0%' },
    { width: `${percentage}%`, duration: 0.8, ease: 'power2.out' }
  )
}, [percentage])

// Cards do dashboard entram com scroll (ScrollTrigger)
useEffect(() => {
  gsap.fromTo('.dashboard-card',
    { opacity: 0, y: 24 },
    {
      opacity: 1, y: 0, duration: 0.5, stagger: 0.08,
      scrollTrigger: { trigger: '.dashboard-grid', start: 'top 80%' },
    }
  )
}, [])
```

**Regra GSAP vs Framer Motion:**

| Situação | Use |
|----------|-----|
| Animação baseada em estado React (modal, toast, list) | Framer Motion |
| Timeline com múltiplos passos, contadores numéricos | GSAP |
| Scroll-driven (revelar ao scrollar) | GSAP + ScrollTrigger |
| Page transitions | Framer Motion |
| Micro-interação em hover/focus | Framer Motion (whileHover, whileFocus) |

### 9.7 Lenis — Smooth scroll

```tsx
// providers/lenis-provider.tsx
'use client'
import Lenis from 'lenis'
import { useEffect } from 'react'
import { gsap } from '@/animations/gsap'
import { ScrollTrigger } from '@/animations/gsap'

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true })

    // Conecta Lenis ao ticker do GSAP (necessário para ScrollTrigger funcionar corretamente)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.destroy()
      gsap.ticker.remove((time) => lenis.raf(time * 1000))
    }
  }, [])

  return <>{children}</>
}
```

### 9.8 Lottie — Micro-animações e estados especiais

```tsx
// Uso em empty states, loading, feedback de sucesso
import Lottie from 'react-lottie-player'
import loadingAnimation from '@/public/animations/loading.json'

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Lottie
        loop
        animationData={loadingAnimation}
        play
        style={{ width: 80, height: 80 }}
      />
      <p className="text-sm text-muted-foreground">Carregando...</p>
    </div>
  )
}
```

**Animações Lottie planejadas:**

| Estado | Arquivo | Onde aparece |
|--------|---------|-------------|
| Loading geral | `loading.json` | Skeleton do dashboard, listas |
| Empty state | `empty-state.json` | Lista de entries vazia, sem categorias |
| Sucesso | `success.json` | Após criar entry, confirmar transfer |
| OTP enviado | `email-sent.json` | Tela de login após enviar OTP |

### 9.9 Recharts — Gráficos do dashboard

O `IncomeByCategoryChart` (condicional: ≥ 3 categorias com entries no período) usa Recharts com estilo neumórfico:

```tsx
// features/dashboard/components/IncomeByCategoryChart.tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

// Paleta de cores compatível com o fundo neumórfico
const CHART_COLORS = ['#6c8ebf', '#82c5be', '#f5a623', '#e07b7b', '#9b8bc4']

export function IncomeByCategoryChart({ data }: { data: IncomeCategory[] }) {
  return (
    <NeuCard className="p-6">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Receitas por Categoria</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="name"
            innerRadius={60}    // donut chart
            outerRadius={90}
            strokeWidth={0}     // sem stroke — mantém visual limpo no neumorphism
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
        </PieChart>
      </ResponsiveContainer>
    </NeuCard>
  )
}
```

### 9.10 Referências de agências e produtos que usam esse stack

| Empresa / Produto | O que usa |
|-------------------|----------|
| Linear | Framer Motion + design system próprio |
| Vercel | Next.js App Router + Geist Font + Framer Motion |
| Stripe | GSAP para animações de marketing, Framer para produto |
| Locomotive Studio | GSAP + Lenis (criadores do Lenis) |
| Active Theory | GSAP + WebGL para projetos de alto impacto |
| Resn | GSAP + ScrollTrigger em todos os projetos |
| Awwwards winners (2024-25) | GSAP + Lenis como padrão de mercado |

---

## 10. Gerenciamento de Estado e Sincronização

**Decisão: TanStack Query como única fonte de estado de servidor; sem Redux ou Zustand para dados remotos**


### Query keys — convenção

As query keys seguem uma hierarquia que espelha a estrutura da API:

```typescript
// lib/query-keys.ts
export const queryKeys = {
  wallets: {
    all: () => ['wallets'] as const,
    byId: (id: string) => ['wallets', id] as const,
    members: (id: string) => ['wallets', id, 'members'] as const,
  },
  categories: {
    byWallet: (walletId: string) => ['categories', walletId] as const,
  },
  entries: {
    byWallet: (walletId: string, filters?: object) =>
      ['entries', walletId, filters] as const,
  },
  dashboard: {
    byWallet: (walletId: string, period: string) =>
      ['dashboard', walletId, period] as const,
  },
}
```

### Invalidação seletiva após mutations

Conforme discovery dashboard (D-08): após ações do QuickActionBar, invalidação seletiva — sem reload da página.

```typescript
// Exemplo: criar entry de despesa
const { mutate } = useMutation({
  mutationFn: createEntry,
  onSuccess: (data) => {
    // Invalida apenas os blocos afetados pela nova entry
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.byWallet(walletId, period) })
    queryClient.invalidateQueries({ queryKey: queryKeys.entries.byWallet(walletId) })
    // NÃO invalida: categories, members, wallets
  },
})
```

### Estado de UI local

Para estado efêmero de UI (modal aberto, filtro de período local, step de form), usar `useState` ou `useReducer` — não TanStack Query nem contexto global.

```
Estado servidor  → TanStack Query
Estado UI local  → useState / useReducer
Estado de sessão → AuthProvider (contexto React, carregado 1x)
Wallet ativa     → localStorage (hook use-active-wallet)
```

---

## 11. Estratégia de Cache e Invalidação

**Decisão: TanStack Query com staleTime configurado por tipo de dado; sem cache de saldo**

### Configuração por tipo de dado

| Dado | staleTime | gcTime | Justificativa |
|------|-----------|--------|---------------|
| Dashboard | 30s | 5min | Dados financeiros — staleness curto |
| Entries | 30s | 5min | Podem mudar frequentemente |
| Categories | 5min | 30min | Mudam raramente |
| Wallets | 5min | 30min | Mudam raramente |
| Members | 2min | 10min | Convites têm TTL de 7 dias |

### Regra crítica: saldo nunca em cache separado

O saldo é sempre parte do payload do dashboard (`balance`, `balance_period`). Não existe query key `['balance', walletId]` — isso quebraria a consistência.

```typescript
// ❌ Errado: cache de saldo isolado
useQuery({ queryKey: ['balance', walletId], ... })

// ✅ Correto: saldo vem junto com o dashboard e é invalidado junto
useQuery({ queryKey: queryKeys.dashboard.byWallet(walletId, period), ... })
```

### Cache no servidor (Next.js)

O fetch inicial do Server Component usa o cache padrão do Next.js com `revalidate`:

```typescript
// app/(app)/dashboard/page.tsx
async function getDashboard(walletId: string, period: string) {
  const res = await fetch(`${API_URL}/wallets/${walletId}/dashboard?period=${period}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 }, // sem cache de SSR — dados financeiros devem ser frescos
  })
  return res.json()
}
```

O `revalidate: 0` garante que o SSR sempre busca dados frescos. O cache vive apenas no cliente via TanStack Query.

---

## 12. Ordem de Implementação

**Decisão: Slices verticais por funcionalidade, da fundação ao diferenciador**

A ordem respeita dependências entre entidades (wallet antes de entries, auth antes de tudo) e entrega valor progressivo.

### Slice 0 — Fundação (sem feature)

- Setup do monorepo (pnpm workspaces + Turborepo)
- `packages/shared`: estrutura base, enums, tipos de API
- `apps/api`: NestJS bootstrap, PrismaModule, ConfigModule, pipes globais, guard JWT global
- `apps/web`: Next.js com App Router, TanStack Query provider, api-client.ts
- **Design system:** tokens neumórficos (`neu-tokens.css`), Tailwind plugin, componentes `NeuCard` e `NeuButton`, LenisProvider, variants do Framer Motion, registro do GSAP
- **shadcn/ui:** init e instalação dos primitivos base (Button, Input, Dialog, Select, Badge)
- CI básico: lint + typecheck em todos os workspaces

**Entregável:** Projeto rodando, CI verde, design system neumórfico funcional — sem nenhuma feature de produto.

### Slice 1 — Auth

- Backend: módulo `auth` completo (OTP send/verify, AccessToken, RefreshToken com rotation)
- Backend: módulo `users` (perfil básico)
- Frontend: fluxo `/login` (email → OTP → redirect)
- `packages/shared`: `auth.schema.ts`

**Entregável:** Usuário consegue logar com OTP. Sessão persistida com refresh automático.

### Slice 2 — Wallets + Onboarding

- Backend: módulo `wallets` (CRUD, archive/unarchive, validação de tipo imutável)
- Backend: módulo `members` (roles, convites, transferência de ownership)
- Frontend: fluxo `/onboarding` (criar primeira wallet, definir `monthly_income`)
- Frontend: listagem e gestão de wallets

**Entregável:** Usuário completa onboarding, vê suas wallets, pode arquivar/convidar.

### Slice 3 — Categories

- Backend: módulo `categories` (CRUD, hierarquia pai/filho, escopo por wallet)
- Frontend: tela `/categories` (listagem, criar categoria/subcategoria)
- `packages/shared`: `category.schema.ts`

**Entregável:** Usuário consegue criar e organizar categorias dentro de uma wallet.

### Slice 4 — Entries

- Backend: módulo `entries` (CRUD, soft delete, transfers com `transfer_group_id`, status machine)
- Backend: módulo `recurrence` (templates, geração de entries futuras)
- Frontend: tela `/entries` (listagem com filtros, criar/editar entry, form de transfer)
- `packages/shared`: `entry.schema.ts`

**Entregável:** Usuário registra receitas, despesas, e transferências. Base completa do sistema financeiro.

### Slice 5 — Dashboard

- Backend: módulo `dashboard` (endpoint único `GET /wallets/:id/dashboard` com todos os blocos)
- Frontend: tela `/dashboard` (todos os blocos: saldo, período, budget, upcoming bills, gráfico de categorias)
- Frontend: QuickActionBar com invalidação seletiva

**Entregável:** Dashboard completo com dados reais do usuário.

### Slice 6 — Hardening

- Validação de permissões completa (editor vs. own entries)
- Rate limiting no endpoint de OTP
- Testes e2e dos fluxos críticos (auth, criar entry, dashboard)
- Review de segurança: auth, exposição de dados, permissões por role

**Entregável:** MVP pronto para produção.

---

## 13. Setup do Projeto

### Pré-requisitos

```
Node.js >= 20.x
pnpm >= 9.x
PostgreSQL >= 15.x
```

### Inicialização do monorepo

```bash
# Criar estrutura raiz
mkdir ledger && cd ledger
pnpm init

# Configurar workspaces
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Criar apps e pacotes
mkdir -p apps/api apps/web packages/shared
```

### `tsconfig.base.json` raiz

```json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

### `package.json` raiz

```json
{
  "name": "ledger",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
```

### Setup do `apps/api` (NestJS)

```bash
cd apps/api
pnpm dlx @nestjs/cli new . --skip-git --package-manager pnpm

# Dependências principais
pnpm add @prisma/client @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add zod @ledger/shared

# Dependências de dev
pnpm add -D prisma @types/passport-jwt

# Inicializar Prisma
pnpm prisma init --datasource-provider postgresql
```

### Setup do `apps/web` (Next.js)

```bash
cd apps/web
pnpm dlx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --skip-install

# Core
pnpm add @tanstack/react-query @tanstack/react-query-devtools zod
pnpm add @ledger/shared

# UI base — shadcn/ui (headless components + Radix UI)
pnpm dlx shadcn@latest init         # configura tailwind.config, globals.css, utils.ts
pnpm dlx shadcn@latest add button input dialog select badge toast

# Animações
pnpm add framer-motion              # page transitions, component animations
pnpm add gsap                       # timelines, contadores, scroll-driven
pnpm add lenis                      # smooth scroll (integra com GSAP ScrollTrigger)

# Micro-animações
pnpm add react-lottie-player        # Lottie JSON animations (loading, empty states)

# Gráficos
pnpm add recharts                   # data viz do dashboard

# Formulários
pnpm add react-hook-form @hookform/resolvers   # form state + zod integration

# Datas
pnpm add date-fns                   # manipulação de datas, locale pt-BR

# Utilitários
pnpm add clsx tailwind-merge        # cn() helper (já incluso no shadcn/ui init)
pnpm add lucide-react               # ícones (padrão shadcn/ui)
```

### Setup do `packages/shared`

```bash
cd packages/shared
pnpm init
# Editar package.json: name = "@ledger/shared", main = "dist/index.js", types = "dist/index.d.ts"

pnpm add zod
pnpm add -D typescript tsup

# tsup.config.ts para build do pacote
```

### Variáveis de ambiente (`apps/api/.env.example`)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ledger"

# JWT
JWT_ACCESS_SECRET="<secret>"
JWT_ACCESS_EXPIRES_IN="15m"

# Refresh token
REFRESH_TOKEN_EXPIRES_DAYS=7

# OTP
OTP_TTL_MINUTES=10
OTP_MAX_ATTEMPTS=5

# Email (provider de OTP)
SMTP_HOST=""
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""

# App
PORT=3001
NODE_ENV="development"
```

### Comandos de desenvolvimento

```bash
# Da raiz do monorepo:
pnpm dev          # roda api + web em paralelo (Turborepo)

# Prisma (dentro de apps/api)
pnpm prisma migrate dev --name <nome>
pnpm prisma studio
pnpm prisma db seed

# Typechecking de tudo
pnpm typecheck
```

---

## Apêndice: Decisões Chave e Trade-offs

| Decisão | Alternativa considerada | Por que esta |
|---------|------------------------|-------------|
| Monorepo pnpm | Multirepo | Compartilhamento de schemas sem publicação de pacote; refactors atômicos |
| Zod em shared | OpenAPI/Swagger gerado | Runtime safety + inferência TypeScript nativa; sem geração de código |
| Prisma apenas no backend | Shared Prisma Client | Isola detalhe de impl; FE nunca acopla à estrutura do banco |
| TanStack Query | SWR, Redux Toolkit Query | Melhor DX para invalidação seletiva; `initialData` do SSR trivial |
| Server Components para carga inicial | SPA pura | Dados financeiros frescos na primeira renderização; sem loading flash |
| Saldo nunca em cache isolado | Cache de saldo por wallet | Consistência garantida; saldo vem do mesmo payload que o período |
| `revalidate: 0` no SSR do dashboard | `revalidate: 30` | Dados financeiros devem ser sempre frescos no primeiro load |
| Slices verticais | Layer-by-layer (todos controllers primeiro, etc.) | Entregável testável ao fim de cada slice; reduz risco de integração |
| **shadcn/ui (owned components)** | **Chakra UI, MUI, Mantine** | **Componentes owned (copiados, não importados) permitem sobrescrever box-shadow sem brigar com a biblioteca — indispensável para neumorphism** |
| **Framer Motion + GSAP (dual)** | **Apenas Framer Motion** | **Framer Motion é declarativo e React-first; GSAP é imperativo e mais poderoso para timelines, contadores e ScrollTrigger. Os dois coexistem sem conflito** |
| **Lenis** | **scroll-behavior: smooth (CSS)** | **CSS smooth scroll não integra com GSAP ScrollTrigger; Lenis expõe RAF hook que o GSAP consome nativamente** |
| **Neumorphism** | **Glassmorphism, Flat design** | **Adequado para produto financeiro: transmite solidez e estabilidade; distingue o Ledger visualmente; implementável via Tailwind plugin sem framework externo** |
| **Recharts** | **Tremor, Chart.js** | **Recharts é completamente customizável via props React (sem CSS impostos); Tremor tem design system próprio que conflitaria com neumorphism** |
| **react-lottie-player** | **SVG animado manual, CSS animations** | **Lottie permite micro-animações complexas sem impacto no bundle de JS (JSON, não código); designer entrega .json e o dev não mexe** |
