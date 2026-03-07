# Stoqlab — Guia do Projeto para Claude Code

Sistema SaaS B2B de gestão para lojas de moda.
Controle de estoque por grade (tamanho × cor), compras, vendas e múltiplas lojas.

---

## Stack

| Camada        | Tecnologia                          |
|---------------|-------------------------------------|
| Frontend      | Next.js 14 (App Router), TypeScript |
| Estilização   | Tailwind CSS + shadcn/ui            |
| Backend       | Next.js API Routes + Server Actions |
| Banco         | Supabase (PostgreSQL + RLS)         |
| ORM           | Drizzle ORM                         |
| Auth          | Supabase Auth (JWT + OAuth)         |
| Storage       | Supabase Storage                    |
| Mobile        | React Native + Expo                 |
| Monorepo      | Turborepo                           |
| CI/CD         | GitHub Actions + Vercel             |
| Pagamentos    | Stripe                              |
| Jobs          | Trigger.dev                         |
| Cache         | Upstash Redis                       |
| Erros         | Sentry                              |
| Email         | Resend                              |

---

## Estrutura de pastas

```
stoqlab/
├── apps/
│   ├── web/              # Next.js — deploy no Vercel
│   └── mobile/           # React Native + Expo
├── packages/
│   ├── ui/               # Componentes compartilhados (shadcn/ui)
│   ├── database/         # Drizzle ORM: schemas, migrations, queries
│   ├── validators/        # Schemas Zod compartilhados (web + mobile)
│   └── utils/            # Helpers, constantes, formatadores
├── .github/
│   └── workflows/        # CI: lint, typecheck, test, deploy preview
├── CLAUDE.md
└── turbo.json
```

---

## Comandos principais

```bash
# Desenvolvimento
npm run dev              # Inicia web + packages em paralelo (Turborepo)
npm run dev --filter=web # Apenas o Next.js

# Banco de dados (Drizzle)
npm run db:generate      # Gera migration a partir dos schemas
npm run db:push          # Aplica migration no Supabase (dev)
npm run db:studio        # Abre Drizzle Studio (visualizador do banco)

# Qualidade
npm run lint             # ESLint em todos os packages
npm run typecheck        # tsc --noEmit em todos os packages
npm run test             # Vitest

# Build
npm run build            # Build de todos os apps
```

---

## Convenções de código

### TypeScript
- `strict: true` em todos os tsconfig — nunca usar `any`
- Tipos explícitos em funções públicas e retornos de Server Actions
- Usar `type` para tipos simples, `interface` para objetos extensíveis

### Next.js
- Server Components por padrão
- Usar `"use client"` somente quando necessário (interatividade, hooks)
- Acesso ao banco SOMENTE via Server Components ou Server Actions
- Nunca expor dados de outros tenants — sempre filtrar por `tenant_id`
- Validar todo input com Zod antes de qualquer operação no banco

### Nomenclatura
- Arquivos: `kebab-case` (ex: `product-variants.ts`)
- Componentes React: `PascalCase` (ex: `ProductCard.tsx`)
- Funções e variáveis: `camelCase`
- Tabelas do banco: `snake_case` (ex: `product_variants`)
- Constantes globais: `UPPER_SNAKE_CASE`
- Português nos nomes de domínio de negócio é aceito quando mais claro

### Commits (Conventional Commits)
```
feat: adiciona cadastro de variações de produto
fix: corrige cálculo de custo real na compra
chore: atualiza dependências do Drizzle
refactor: extrai lógica de movimentação de estoque
```

---

## Banco de dados

### Convenções globais (todas as tabelas)
- `id` — UUID, `DEFAULT gen_random_uuid()`
- `tenant_id` — UUID, FK para `tenants`, protegido por RLS
- `created_at` — `TIMESTAMPTZ DEFAULT now()`
- `updated_at` — `TIMESTAMPTZ`, atualizado por trigger automático
- `deleted_at` — `TIMESTAMPTZ NULL` — soft delete, NUNCA deletar fisicamente

### Multi-tenancy via RLS
Toda tabela com `tenant_id` deve ter RLS ativado.
Política padrão:
```sql
USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
```
Nunca confiar apenas em filtros no backend — RLS é a última barreira.

### Tabelas principais
- `tenants` — empresas/lojas cadastradas
- `users` — estende `auth.users` do Supabase
- `locations` — lojas e depósitos (type: store | warehouse)
- `products` — produtos (sem estoque, apenas cadastro)
- `product_variants` — combinações tamanho × cor, com SKU e barcode
- `inventory` — estoque por variação × localização (UNIQUE constraint)
- `inventory_movements` — log imutável de todas as movimentações
- `purchases` + `purchase_items` — compras com custo real calculado
- `sales` + `sale_items` — vendas com snapshot de custo e margem
- `stock_transfers` + `transfer_items` — transferências entre lojas
- `suppliers` — fornecedores
- `customers` — clientes (CRM básico)
- `categories` — categorias de produto
- `notifications` — alertas de estoque baixo, metas, etc.
- `audit_log` — registro de ações críticas (quem, o quê, quando, IP)

### Cálculos automáticos
```
# Custo real de compra
real_unit_cost = (products_cost + freight_cost + other_costs) / total_items

# Margem de lucro
gross_margin = ((total_value - total_cost) / total_value) * 100
```

---

## Autenticação & Autorização

### Roles
| Role            | Permissões                                      |
|-----------------|-------------------------------------------------|
| `owner`         | Acesso total, configurações do tenant, billing  |
| `manager`       | Compras, vendas, estoque, relatórios            |
| `seller`        | PDV (vendas), consulta de estoque               |
| `stock_operator`| Entrada de mercadoria, transferências, ajustes  |

### Fluxo de autenticação
1. Login via Supabase Auth (email+senha, Magic Link ou OAuth Google)
2. JWT inclui `tenant_id` e `role` nos claims customizados
3. RLS no banco usa `auth.jwt()` para isolar dados por tenant
4. Middleware Next.js verifica role antes de renderizar rotas protegidas

---

## Estrutura de rotas (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/
│   └── registro/
├── (dashboard)/
│   ├── layout.tsx        # Sidebar + verificação de auth
│   ├── page.tsx          # Dashboard principal
│   ├── produtos/
│   ├── estoque/
│   ├── compras/
│   ├── vendas/
│   ├── transferencias/
│   ├── fornecedores/
│   ├── clientes/
│   ├── relatorios/
│   └── configuracoes/
└── api/
    ├── webhooks/
    │   └── stripe/       # Eventos de billing
    └── public/           # Endpoints públicos (futuro)
```

---

## Variáveis de ambiente

```bash
# .env.local (nunca commitar)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # Apenas no servidor

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

TRIGGER_SECRET_KEY=

RESEND_API_KEY=

SENTRY_DSN=
```

---

## Segurança — regras críticas

- Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no cliente
- Nunca retornar dados de um tenant para outro — verificar `tenant_id` em todo Server Action
- Validar TODOS os inputs com Zod antes de qualquer query
- Usar `prepared statements` do Drizzle — nunca concatenar SQL manualmente
- Log de auditoria obrigatório para: criação/edição de compras, ajustes de estoque, exclusões (soft delete)
- Rate limiting em todas as rotas de API via Upstash

---

## Roadmap

### Fase 1 — MVP (atualmente em desenvolvimento)
- [ ] Setup monorepo + CI/CD + ambientes
- [ ] Auth multi-tenant com RLS
- [ ] Cadastro de produtos e variações
- [ ] Gestão de estoque por localização
- [ ] Registro de compras com custo real
- [ ] PDV (ponto de venda) simplificado
- [ ] Dashboard de faturamento e estoque

### Fase 2 — App Mobile & Automações
- [ ] React Native + Expo (PDV mobile, câmera para barcode)
- [ ] Sugestão automática de reposição (Trigger.dev)
- [ ] Relatórios avançados (curva ABC, grade de vendas)
- [ ] CRM básico de clientes
- [ ] Notificações push e email

### Fase 3 — Integrações
- [ ] Mercado Livre
- [ ] Shopee
- [ ] Shopify
- [ ] API pública documentada

---

## Planos SaaS

| Plano       | Lojas | Usuários | Produtos   | Preço/mês   |
|-------------|-------|----------|------------|-------------|
| Free Trial  | 1     | 2        | 50         | Grátis 14d  |
| Starter     | 1     | 3        | 500        | R$ 97       |
| Pro         | até 5 | 15       | Ilimitados | R$ 247      |
| Enterprise  | ∞     | ∞        | Ilimitados | Sob consulta|

---

## Contexto de negócio

O Stoqlab resolve problemas reais do varejo de moda:
- Dificuldade de controlar estoque por tamanho e cor (grade)
- Não saber onde cada peça está (loja A vs loja B vs depósito)
- Custo real da mercadoria (produto + frete + outros custos)
- Controle manual e sujeito a erros
- Falta de visibilidade de margem por produto

O público-alvo são donos de lojas de roupas pequenas e médias, com 1 a 5 pontos de venda.
Linguagem da interface: português brasileiro.
