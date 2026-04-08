-- ============================================================
--  STOQLAB — Indexes de performance (busca por nome)
--
--  Problema: buscas ILIKE '%query%' fazem full-table scan.
--  Solução: extensão pg_trgm + índices GIN por trigrama.
--  Um trigrama divide o texto em grupos de 3 chars, permitindo
--  que o PostgreSQL use o índice mesmo com leading wildcard (%).
--
--  Aplicar no SQL Editor do Supabase (uma vez).
-- ============================================================

-- 1. Habilita extensão trigrama (necessária para GIN com ILIKE)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Índices GIN em products.name (busca de produtos por nome)
--    Usado em: produtos/page.tsx, compras/actions.ts, vendas
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING GIN (lower(name) gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- 3. Índices GIN em product_variants.color (busca/filtro por cor)
CREATE INDEX IF NOT EXISTS idx_variants_color_trgm
  ON product_variants USING GIN (lower(color) gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- 4. Índices GIN em suppliers.name (busca de fornecedores)
CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm
  ON suppliers USING GIN (lower(name) gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- 5. Índices GIN em customers.name (busca de clientes)
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
  ON customers USING GIN (lower(name) gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- 6. Índice composto em purchases para filtros por data + tenant
--    Usado em: compras/page.tsx com dateFrom/dateTo
CREATE INDEX IF NOT EXISTS idx_purchases_tenant_date
  ON purchases (tenant_id, purchased_at DESC)
  WHERE deleted_at IS NULL;

-- 7. Índice em sales para filtros por data + tenant
CREATE INDEX IF NOT EXISTS idx_sales_tenant_date
  ON sales (tenant_id, sold_at DESC)
  WHERE deleted_at IS NULL;

-- 8. Índice para purchases.invoice_number (busca por NF)
CREATE INDEX IF NOT EXISTS idx_purchases_invoice_number_trgm
  ON purchases USING GIN (lower(invoice_number) gin_trgm_ops)
  WHERE deleted_at IS NULL;

-- ============================================================
--  Verificação (opcional): confirma que os índices existem
-- ============================================================
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename IN ('products','product_variants','suppliers','customers','purchases','sales')
--   AND indexname LIKE 'idx_%trgm%' OR indexname LIKE 'idx_%date%';
