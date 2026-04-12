# Relatório de Auditoria de Segurança — Stoqlab

**Data:** 2026-04-12  
**Escopo:** `C:\Users\Romeu\Stoqlab` — 293 arquivos TypeScript auditados  

---

## BLOQUEADORES DE DEPLOY — CRÍTICOS

---

### CRITICO-1 — Credenciais de produção expostas no sistema de arquivos

**Localização:** `apps/web/.env.local` e `Backup/apps/web/.env.local`

**Descrição:** Credenciais reais de produção estão armazenadas em texto plano em dois locais do repositório local. Embora o `.env.local` esteja no `.gitignore` e não esteja rastreado pelo git, a pasta `Backup/` inteira pode não ter a mesma proteção e pode ser acidentalmente versionada. As credenciais expostas incluem:

- `SUPABASE_SERVICE_ROLE_KEY` — chave que bypassa todo o RLS, concede acesso admin irrestrito ao banco de dados
- `DATABASE_URL` com senha em texto claro conectando diretamente ao PostgreSQL
- `RESEND_API_KEY` — chave real de produção

**Remediação:**
1. **Revogar imediatamente** todas as credenciais expostas no painel do Supabase e Resend
2. Gerar novas chaves e atualizar o ambiente de produção (Vercel)
3. Adicionar `Backup/` ao `.gitignore` global ou deletar a pasta do sistema de arquivos
4. Nunca armazenar `.env.local` na pasta de backup — usar um gerenciador de segredos (Doppler, 1Password Secrets, AWS Secrets Manager)
5. Verificar histórico git: `git log --all --full-history -- "**/.env*"` para confirmar que nenhum commit anterior incluiu o arquivo

---

### CRITICO-2 — Server Actions sensíveis sem verificação de role (Escalada de Privilégio)

**Localização:** `apps/web/src/app/(dashboard)/configuracoes/actions.ts`

**Funções afetadas:**
- `updateInformacoesAction` (linha 44) — altera configurações do tenant e permissões de módulos
- `saveActionPermissionsAction` (linha 88) — altera a matriz granular de permissões
- `inviteUserAction` (linha 282) — cria novos usuários com qualquer role
- `resendInviteAction` (linha 320) — deleta e re-cria usuários
- `updateUserRoleAction` (linha 365) — eleva ou rebaixa o role de qualquer usuário
- `toggleUserActiveAction` (linha 394) — desativa/ativa qualquer usuário
- `deleteUserAction` (linha 414) — exclui usuários

**Descrição:** Todas essas funções verificam apenas que o chamador é um usuário autenticado do tenant (via `getTenantId()`), mas **não verificam se o role do chamador é `owner`**. Um `seller` ou `stock_operator` autenticado pode chamar `inviteUserAction` diretamente e criar um usuário com role `owner`, ou chamar `saveActionPermissionsAction` e se atribuir todas as permissões. O sistema de permissões visível na UI é puramente cosmético — não existe enforcement no servidor para essas actions.

**Remediação:** Adicionar verificação de role logo após `getTenantId()` em todas as funções listadas:

```typescript
async function assertOwner(tenantId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .eq("tenant_id", tenantId)
    .single();

  if (profile?.role !== "owner") throw new Error("Acesso negado");
}
```

---

### CRITICO-3 — Usuários desativados (`is_active = false`) continuam com acesso total

**Localização:** `apps/web/src/app/(auth)/login/actions.ts`, `apps/web/src/middleware.ts`, `apps/web/src/lib/auth.ts`

**Descrição:** A função `toggleUserActiveAction` permite desativar usuários setando `is_active = false` na tabela `users`, mas **nenhuma parte do sistema de autenticação consulta esse campo**. Um usuário desativado mantém sua sessão JWT ativa e pode continuar operando normalmente. O login também não verifica `is_active` antes de criar a sessão. O proprietário acredita ter bloqueado o acesso, mas o usuário continua ativo.

**Remediação:**
1. No `loginAction`, após autenticar, verificar `is_active` e retornar erro se `false`
2. No middleware ou no layout do dashboard, verificar `is_active` e fazer signOut se `false`
3. Alternativamente, usar a API admin do Supabase para banir o usuário no Auth ao desativar:
   ```typescript
   await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '876000h' });
   ```

---

## ALTO

---

### ALTO-1 — `getSession()` usado para extrair `tenant_id` em contexto crítico (A07)

**Localização:** `apps/web/src/lib/auth.ts:9`

**Descrição:** `getTenantId()` usa `supabase.auth.getSession()` para obter o JWT e extrai `tenant_id` manualmente decodificando o token com `atob()`. O Supabase recomenda explicitamente usar `getUser()` em vez de `getSession()` em contexto de servidor, pois `getSession()` não valida a assinatura do JWT contra o servidor. Um token manipulado no cookie poderia potencialmente falsificar o `tenant_id`.

**Remediação:**
```typescript
export async function getTenantId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); // Valida contra servidor
  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) redirect("/login");
  return profile.tenant_id;
}
```

---

### ALTO-2 — Ausência de verificação de tipo MIME em upload de fotos de produtos (A04)

**Localização:** `apps/web/src/app/(dashboard)/produtos/actions.ts:34-73` (`uploadPhoto`) e `uploadTempPhotoAction` (linha 484)

**Descrição:** O upload de fotos de produtos **não valida o tipo do arquivo** — apenas usa `file.type` (controlado pelo cliente). Um atacante pode fazer upload de um arquivo `.html`, `.svg` com JavaScript, ou um executável com MIME type forjado. O bucket `products` é público, tornando o arquivo acessível a qualquer pessoa. O `uploadInvoice` em `compras/actions.ts` tem allowlist explícita, mas `uploadPhoto` não tem nenhuma.

**Remediação:**
```typescript
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return null;
if (file.size > MAX_IMAGE_SIZE) return null;
```

---

### ALTO-3 — Next.js desatualizado com múltiplas CVEs de alta severidade (A06)

**Localização:** `apps/web/package.json`

**Descrição:** O `npm audit` reporta 7 vulnerabilidades HIGH no Next.js em uso:
- `GHSA-9g9p-9gw9-jx7f` — DoS via Image Optimizer `remotePatterns`
- `GHSA-h25m-26qc-wcjf` — DoS via desserialização de HTTP Request em RSC
- `GHSA-ggv3-7p47-pfv8` — HTTP request smuggling em rewrites
- `GHSA-3x4c-7xq6-9pq8` — crescimento ilimitado do cache de imagens
- `GHSA-q4gf-8mx6-v5v3` — DoS com Server Components

**Remediação:** Atualizar Next.js para a versão mais recente estável, avaliando breaking changes antes de `npm audit fix --force`.

---

### ALTO-4 — `[DEBUG]` em mensagem de erro exposta ao frontend

**Localização:** `apps/web/src/app/(dashboard)/compras/actions.ts:261`

**Descrição:**
```typescript
return { error: `[DEBUG] ${purchaseError.message} (${purchaseError.code})` };
```
Mensagens de erro internas do banco (schema, nomes de tabelas, códigos PostgreSQL) são expostas ao cliente.

**Remediação:**
```typescript
console.error("[createPurchase] purchaseError:", purchaseError);
return { error: "Erro ao criar compra. Tente novamente." };
```

---

### ALTO-5 — `inviteUserAction` cria usuário com senha definida pelo proprietário (A07)

**Localização:** `apps/web/src/app/(dashboard)/configuracoes/actions.ts:282-318`

**Descrição:** A função cria usuários com `email_confirm: true` e senha definida pelo proprietário — o usuário convidado nunca confirma sua identidade por e-mail. O proprietário conhece a senha do usuário. Em combinação com CRITICO-2, qualquer `seller` pode criar um `owner` com senha conhecida.

**Remediação:** Usar o fluxo de convite por e-mail (`inviteUserByEmail`) ou forçar troca de senha no primeiro login.

---

## MÉDIO

---

### MEDIO-1 — `ignoreBuildErrors: true` e `ignoreDuringBuilds: true` em produção (A05)

**Localização:** `apps/web/next.config.mjs:5-11`

**Descrição:** O build de produção ignora erros de TypeScript e warnings de ESLint. Erros de tipo que poderiam indicar bugs de segurança passam silenciosamente para produção.

**Remediação:** Remover ambos os flags e corrigir os erros de build existentes.

---

### MEDIO-2 — Ausência de HTTP security headers e Content Security Policy (A05)

**Localização:** `apps/web/next.config.mjs`

**Descrição:** Ausentes: `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`.

**Remediação:**
```javascript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];
```

---

### MEDIO-3 — `document.write()` com dados de usuário sem sanitização (XSS latente, A03)

**Localização:** `apps/web/src/app/(dashboard)/produtos/[id]/variacoes/code-modal.tsx:64-73`

**Descrição:** `handlePrint()` usa `win.document.write()` injetando `${label}` (SKU da variação) diretamente no HTML sem escapar. O `labels-print-modal.tsx` usa corretamente `escapeHtml()`, mas `code-modal.tsx` não.

**Remediação:** Aplicar `escapeHtml()` em `label` antes da interpolação.

---

### MEDIO-4 — Rota pública `/q/[id]` expõe estoque em tempo real sem autenticação (A01)

**Localização:** `apps/web/src/app/q/[id]/page.tsx:10-44`

**Descrição:** A rota `/q/{variantId}` é acessível publicamente e expõe SKU, preço de venda e estoque por loja. Qualquer pessoa com um UUID de variante pode ver o estoque em tempo real de qualquer loja.

**Remediação:** Adicionar campo `public_visible` ao produto e filtrar antes de retornar dados, ou documentar explicitamente como decisão intencional de negócio.

---

### MEDIO-5 — Rate limiting ausente em Server Actions críticas (A04)

**Localização:** `apps/web/src/middleware.ts:11-37`

**Descrição:** Rate limiting implementado apenas para `/login` e `/registro`. Server Actions como `createSaleAction`, `adjustInventoryAction`, `createPurchaseAction` podem ser chamadas em volume ilimitado por um usuário autenticado malicioso.

**Remediação:** Aplicar rate limiting nas Server Actions críticas via Upstash. Garantir que `UPSTASH_REDIS_REST_URL` é obrigatório em produção.

---

### MEDIO-6 — Tabelas `debts` e `debt_payments` podem estar sem RLS ativo (A01)

**Localização:** `stoqlab_schema.sql` + `apps/web/src/app/(dashboard)/devedores/actions.ts`

**Descrição:** As tabelas `debts` e `debt_payments` não aparecem na lista de `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` no schema SQL.

**Remediação:**
```sql
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON debts USING (tenant_id = auth_tenant_id());
CREATE POLICY tenant_isolation ON debt_payments USING (tenant_id = auth_tenant_id());
```

---

### MEDIO-7 — Senha mínima de 6 caracteres é insuficiente para SaaS B2B (A07)

**Localização:** `apps/web/src/app/(dashboard)/configuracoes/actions.ts:152,293`

**Descrição:** Validação aceita mínimo de 6 caracteres sem exigir complexidade.

**Remediação:**
```typescript
z.string().min(10).regex(/[A-Z]/, "Precisa de maiúscula").regex(/[0-9]/, "Precisa de número")
```

---

## BAIXO

---

### BAIXO-1 — Rate limiting em login é permissivo (10 tentativas/minuto por IP)

**Localização:** `apps/web/src/lib/rate-limit.ts:25`

**Remediação:** Reduzir para 5 tentativas por 10 minutos com lockout progressivo.

---

### BAIXO-2 — `inventory_movements` é deletado em edições de compras (viola imutabilidade)

**Localização:** `apps/web/src/app/(dashboard)/compras/actions.ts:415`

**Descrição:**
```typescript
await supabaseAdmin.from("inventory_movements").delete().eq("reference_id", id);
```
O CLAUDE.md define `inventory_movements` como "log imutável". A edição de compras deleta e re-cria movimentos, destruindo a trilha de auditoria.

**Remediação:** Criar movimentos de estorno (delta negativo) com `movement_type: "adjustment"` em vez de deletar.

---

### BAIXO-3 — SKU gerado com sufixo de 3 dígitos tem alta taxa de colisão

**Localização:** `apps/web/src/app/(dashboard)/compras/actions.ts:36-38`

**Remediação:** Usar `crypto.randomUUID().slice(0, 6).toUpperCase()` para o sufixo.

---

### BAIXO-4 — Ausência de audit log na criação de compras e vendas

**Localização:** `apps/web/src/app/(dashboard)/compras/actions.ts` e `vendas/actions.ts`

**Descrição:** O CLAUDE.md define como regra crítica: "Log de auditoria obrigatório para criação/edição de compras". `_createPurchase` e `createSaleAction` não chamam `writeAuditLog`.

**Remediação:** Adicionar `writeAuditLog` com `action: "purchase.created"` e `action: "sale.created"`.

---

### BAIXO-5 — `Backup/` contém cópia completa do codebase com credenciais

**Localização:** `C:\Users\Romeu\Stoqlab\Backup\`

**Remediação:** Excluir `Backup/apps/web/.env.local`. Adicionar `Backup/` ao `.gitignore` raiz.

---

## Resumo Executivo

| Severidade | Qtd | Status |
|------------|-----|--------|
| CRÍTICO    | 3   | BLOQUEIA DEPLOY |
| ALTO       | 5   | Corrigir nesta sprint |
| MÉDIO      | 7   | Backlog P2 |
| BAIXO      | 5   | Backlog P3 |

**Resultado: DEPLOY BLOQUEADO até resolução dos 3 CRÍTICOs.**

### Pontos Positivos

- RLS ativo em todas as 19 tabelas mapeadas no schema, com função `auth_tenant_id()` correta
- `supabaseAdmin` usado exclusivamente em Server Components e Server Actions (nunca em client components)
- Todas as Server Actions usam Zod para validação de input antes de queries
- Isolamento de tenant verificado com `.eq("tenant_id", tenantId)` em praticamente todas as queries
- Rate limiting implementado para login/registro via Upstash com degradação graciosa
- Audit log implementado e funcional para as operações mais críticas
