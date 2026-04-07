# Stoqlab — Próximos Passos

> Documento gerado em 04/04/2026 com base em análise completa do codebase.
> Organizado por prioridade real, não por módulo.

---

## SEMANA 1 — Não colocar em produção sem isso

Estas correções são pré-requisito para qualquer cliente real. São rápidas de implementar mas o impacto de não ter é crítico.

### 1. Corrigir verificação de JWT (Segurança crítica)
**Problema:** `getTenantId()` em `lib/auth.ts` apenas decodifica o JWT em base64 sem verificar a assinatura. Qualquer pessoa pode forjar o campo `tenant_id` e acessar dados de outros clientes.
**Fix:** Substituir a decodificação manual por `supabaseAdmin.auth.getUser(token)`, que valida a assinatura no servidor do Supabase.
**Arquivo:** `apps/web/src/lib/auth.ts`

---

### 2. Auditar todos os server actions — tenant_id obrigatório
**Problema:** Todas as actions usam `supabaseAdmin` (service role), que bypassa o RLS do PostgreSQL. Se uma query esquecer o `.eq("tenant_id", tenantId)`, dados de todos os clientes ficam expostos.
**Fix:** Revisar os 165+ server actions e garantir que toda query tem o filtro de tenant. Criar um wrapper tipado que injete o filtro automaticamente.
**Arquivos:** Todos os `actions.ts` em `apps/web/src/app/(dashboard)/`

---

### 3. Verificação de role nos server actions
**Problema:** O controle por role (seller, manager, owner) existe apenas no frontend. Qualquer usuário autenticado pode chamar server actions restritas diretamente.
**Fix:** Adicionar verificação de role nas actions sensíveis (configurações, ajustes de estoque, compras).
**Exemplo:**
```typescript
const user = await getUserWithRole();
if (!["owner", "manager"].includes(user.role)) {
  return { error: "Sem permissão." };
}
```

---

### 4. Corrigir race condition no ajuste de estoque
**Problema:** Em `estoque/actions.ts`, a action lê o estoque, calcula o delta e então salva. Entre a leitura e a escrita, outra request pode alterar o valor, resultando em estoque incorreto.
**Fix:** Operação atômica com UPDATE direto em vez de read → calculate → write.
**Arquivo:** `apps/web/src/app/(dashboard)/estoque/actions.ts`

---

### 5. Ativar Sentry
**Problema:** `SENTRY_DSN` está no `.env` mas o Sentry nunca foi importado/inicializado. Erros em produção são invisíveis.
**Fix:** Configurar `sentry.client.config.ts`, `sentry.server.config.ts` e `sentry.edge.config.ts`.
**Ref:** `next.config.js` precisa do `withSentryConfig` wrapper.

---

## SEMANA 2 — Qualidade e corretude

### 6. Trocar `.single()` por `.maybeSingle()` onde aplicável
**Problema:** `supabase.from("tabela").single()` lança exceção se retornar 0 linhas. Vários lugares no código podem crashar com dados ausentes.
**Fix:** Usar `.maybeSingle()` e tratar o `null` explicitamente.
**Buscar em:** Todos os `actions.ts` — grep por `.single()` e avaliar cada caso.

---

### 7. Validação de CPF e CNPJ com dígito verificador
**Problema:** CPF e CNPJ são aceitos como qualquer string de até 20 caracteres. Não há validação de formato nem de dígito verificador.
**Fix:** Implementar validação em `packages/validators/` e aplicar nos formulários de clientes e fornecedores.
**Arquivo:** `packages/validators/src/customer.ts` (a criar)

---

### 8. Transações no banco para operações multi-step
**Problema:** Criação de compra (produto + itens + movimentação de estoque) não é atômica. Se uma etapa falhar, o banco fica em estado inconsistente.
**Fix:** Usar funções RPC no Supabase (PostgreSQL functions) para operações que precisam ser atômicas.
**Afeta:** `compras/actions.ts`, `vendas/actions.ts`, `transferencias/actions.ts`

---

### 9. Paginação nas listagens principais
**Problema:** Produtos, clientes, fornecedores e vendas carregam todos os registros de uma vez. Com volume real de dados, isso vai travar a aplicação.
**Fix:** Implementar paginação cursor-based ou offset nas queries e nos componentes de listagem.
**Afeta:** Todas as páginas de lista em `(dashboard)/`

---

### 10. Conectar módulo de Devedores ao fluxo de vendas
**Problema:** O módulo de devedores existe mas não é criado automaticamente quando uma venda é registrada como "fiado" ou parcelada.
**Fix:** No final do fluxo de venda, se a forma de pagamento for fiado, criar automaticamente o registro de devedor.
**Arquivo:** `apps/web/src/app/(dashboard)/vendas/actions.ts`

---

## SEMANA 3-4 — Experiência do usuário

### 11. Validação inline nos formulários (sem precisar de submit)
**Problema:** Toda validação acontece no servidor. O usuário preenche o formulário, clica em salvar, e só então vê os erros.
**Fix:** Duplicar as validações Zod no cliente usando `react-hook-form` + `zodResolver`, ou validar campos ao perder o foco (`onBlur`).

---

### 12. Feedback visual adequado no PDV (vendas)
**Problema:** O formulário de venda não tem feedback de "processando" adequado. O usuário pode clicar várias vezes e gerar vendas duplicadas.
**Fix:** Desabilitar o botão de submit durante o processamento e mostrar estado de loading claro.

---

### 13. Busca por código de barras no PDV
**Problema:** O PDV não tem campo de busca por código de barras. Para varejo físico com leitor de barcode, isso é essencial.
**Fix:** Adicionar input de barcode na tela de vendas que busca a variação automaticamente ao pressionar Enter.
**Arquivo:** `apps/web/src/app/(dashboard)/vendas/`

---

### 14. Suporte a desconto por item na venda
**Problema:** O PDV só permite desconto global. Lojas precisam dar desconto por peça individualmente.
**Fix:** Adicionar campo de desconto em cada linha do carrinho de vendas.

---

### 15. Campo de troco no PDV
**Problema:** Não há campo para informar valor pago em dinheiro e calcular o troco.
**Fix:** Quando forma de pagamento = dinheiro, mostrar campo "valor recebido" e calcular troco automaticamente.

---

### 16. Ordenação e filtros avançados nas tabelas
**Problema:** Nenhuma tabela permite ordenar por coluna ou filtrar por múltiplos critérios.
**Fix:** Adicionar cabeçalhos de tabela clicáveis para ordenação e painel de filtros em produtos e vendas.

---

### 17. Lazy loading dos modais pesados
**Problema:** Os modais de venda, compra e edição de produto carregam junto com a página, mesmo quando não são abertos.
**Fix:** Usar `dynamic(() => import("./modal"), { ssr: false })` nos modais grandes.

---

### 18. Exportação CSV nas listagens
**Problema:** Donos de loja precisam exportar dados para Excel. Não há nenhuma opção de exportação.
**Fix:** Adicionar botão "Exportar CSV" nas páginas de produtos, vendas, clientes e estoque.

---

## MÊS 2 — Features estratégicas

### 19. Notificações de estoque baixo (Trigger.dev)
**Problema:** A tabela `notifications` e o campo `min_stock` existem, mas nenhum job verifica e dispara alertas.
**Fix:** Criar um job no Trigger.dev que roda diariamente, verifica variações abaixo do `min_stock` e cria notificações + envia email via Resend.

---

### 20. Rate limiting com Upstash Redis
**Problema:** Não há rate limiting em nenhuma rota. Upstash está configurado no `.env` mas nunca utilizado.
**Fix:** Implementar rate limiting nas server actions de auth e nas buscas de clientes/fornecedores.

---

### 21. Relatórios básicos
**Problema:** A página de relatórios existe mas está vazia.
**Fix:** Implementar ao menos:
- Vendas por período (gráfico de linha)
- Produtos mais vendidos (ranking)
- Margem por produto
- Estoque atual por localização

---

### 22. App mobile (React Native + Expo)
**Problema:** O público-alvo (donos de loja física) usa tablet no caixa e celular para consultas.
**Fix:** Iniciar com PDV mobile — câmera para barcode, carrinho, finalização de venda.
**Pasta:** `apps/mobile/` (já existe, estrutura vazia)

---

### 23. Dashboard com gráficos
**Problema:** O dashboard atual mostra apenas KPIs estáticos (números). Não há visualização de tendências.
**Fix:** Adicionar gráfico de vendas dos últimos 30 dias e comparativo com mês anterior. Biblioteca sugerida: `recharts` (já usada no Next.js ecosystem).

---

### 24. Histórico de preços funcionando
**Problema:** A tabela `price_history` existe no schema mas nunca é alimentada.
**Fix:** Registrar na tabela sempre que o preço de venda de uma variação for alterado.

---

## DÍVIDAS TÉCNICAS (paralelo com features)

| # | Problema | Impacto | Esforço |
|---|----------|---------|---------|
| A | Zero testes automatizados | Refatorações quebram sem perceber | Alto |
| B | `noUncheckedIndexedAccess: false` no tsconfig | Bugs de array em runtime | Baixo |
| C | Audit log com `catch {}` silencioso | Falhas de auditoria invisíveis | Baixo |
| D | SKU com sufixo aleatório (colisão possível) | Erro no cadastro de variações | Médio |
| E | Sem modo escuro | UX ruim em ambientes de loja | Médio |
| F | PII (CPF, CNPJ) em plaintext no banco | Exposição em caso de breach | Alto |
| G | Sem particionamento em tabelas grandes | Performance degrada com tempo | Alto (futuro) |

---

## ESTIMATIVA DE TOKENS

> Baseado no modelo **Claude Sonnet** (uso diário) e **Claude Opus** (tarefas complexas).
> 1 sessão = uma conversa com contexto carregado.

### Por fase

| Fase | Descrição | Sessões estimadas | Tokens estimados (Sonnet) |
|------|-----------|-------------------|---------------------------|
| **Semana 1** | Segurança crítica (JWT, audit, roles, race condition, Sentry) | 5-7 sessões | ~150.000–250.000 |
| **Semana 2** | Corretude (paginação, validações, transações, devedores) | 6-8 sessões | ~200.000–350.000 |
| **Semana 3-4** | UX (PDV, filtros, export CSV, modais, lazy loading) | 8-10 sessões | ~250.000–400.000 |
| **Mês 2** | Features estratégicas (notificações, relatórios, mobile básico) | 15-20 sessões | ~500.000–900.000 |
| **Dívidas técnicas** | Testes, tsconfig, refatorações | 5-8 sessões | ~150.000–250.000 |

### Total estimado para MVP completo (Fases 1)
**~700.000 a 1.200.000 tokens** (Sonnet)

### Total para Fase 2 incluída (com mobile básico)
**~1.500.000 a 2.500.000 tokens** (Sonnet)

### Estratégia de uso de modelos para economizar
- **Sonnet** → implementação de features, correções de bug, componentes UI
- **Opus** → arquitetura de novas features complexas, debugging difícil, revisão de segurança
- Tarefas do tipo "adicionar campo no formulário" ou "criar endpoint" → sempre Sonnet
- Tarefas do tipo "desenhar a lógica de transações atômicas" ou "revisar a segurança multi-tenant" → Opus vale o custo

### Variáveis que aumentam o consumo
- Bugs inesperados durante implementação (comum em integrações: Trigger.dev, Stripe, Sentry)
- Refatorações necessárias descobertas durante o desenvolvimento
- Mobile (React Native tem curva de depuração maior que web)
- Relatórios com lógica de negócio complexa

---

## ORDEM DE ATAQUE RECOMENDADA

```
1. Semana 1: segurança (obrigatório antes de qualquer usuário real)
2. Semana 2: paginação + transações (base para escala)
3. Semana 3: PDV completo (barcode, troco, desconto por item)
4. Semana 4: relatórios básicos + exportação CSV
5. Mês 2: notificações + mobile
```

---

*Documento gerado pelo Claude Code — Stoqlab, abril 2026*
