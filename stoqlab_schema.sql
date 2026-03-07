-- ============================================================
--  STOQLAB — Schema SQL Completo — Fase 1 (MVP)
--  Banco: Supabase (PostgreSQL 15+)
--  Como usar: Cole no SQL Editor do Supabase e execute
-- ============================================================

-- ─────────────────────────────────────────────────────────────
--  EXTENSÕES
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- busca sem acentos

-- ─────────────────────────────────────────────────────────────
--  TRIGGER: atualiza updated_at automaticamente
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
--  ENUMS
-- ─────────────────────────────────────────────────────────────
CREATE TYPE plan_type AS ENUM ('trial', 'starter', 'pro', 'enterprise');
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'seller', 'stock_operator');
CREATE TYPE location_type AS ENUM ('store', 'warehouse');
CREATE TYPE product_status AS ENUM ('active', 'archived', 'draft');
CREATE TYPE movement_type AS ENUM ('purchase', 'sale', 'transfer', 'adjustment', 'return', 'loss');
CREATE TYPE purchase_status AS ENUM ('draft', 'confirmed', 'received', 'cancelled');
CREATE TYPE sale_status AS ENUM ('pending', 'completed', 'cancelled', 'refunded');
CREATE TYPE sale_channel AS ENUM ('store', 'ecommerce', 'marketplace', 'whatsapp');
CREATE TYPE payment_method AS ENUM ('cash', 'credit', 'debit', 'pix', 'installment');
CREATE TYPE transfer_status AS ENUM ('pending', 'in_transit', 'received', 'cancelled');
CREATE TYPE notification_type AS ENUM ('low_stock', 'purchase_received', 'goal_reached', 'transfer_arrived');

-- ─────────────────────────────────────────────────────────────
--  1. TENANTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(150) NOT NULL,
  slug                VARCHAR(80)  NOT NULL UNIQUE,  -- subdomínio: stoqlab.com/[slug]
  plan                plan_type    NOT NULL DEFAULT 'trial',
  stripe_customer_id  VARCHAR(100) UNIQUE,
  stripe_subscription_id VARCHAR(100) UNIQUE,
  settings            JSONB        NOT NULL DEFAULT '{}',
  trial_ends_at       TIMESTAMPTZ,
  is_active           BOOLEAN      NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
--  2. USERS (extends auth.users do Supabase)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id         UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              VARCHAR(150) NOT NULL,
  role              user_role    NOT NULL DEFAULT 'seller',
  avatar_url        TEXT,
  last_location_id  UUID,        -- FK adicionada depois (locations ainda não existe)
  is_active         BOOLEAN      NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_users_tenant ON users(tenant_id);

-- ─────────────────────────────────────────────────────────────
--  3. LOCATIONS (lojas e depósitos)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(150)  NOT NULL,
  type        location_type NOT NULL DEFAULT 'store',
  address     TEXT,
  phone       VARCHAR(30),
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_locations_tenant ON locations(tenant_id);

-- Agora que locations existe, adicionamos a FK em users
ALTER TABLE users
  ADD CONSTRAINT fk_users_last_location
  FOREIGN KEY (last_location_id) REFERENCES locations(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────
--  4. CATEGORIES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  color_hex   CHAR(7),     -- cor visual na interface
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  UNIQUE (tenant_id, name)
);

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────
--  5. SUPPLIERS (fornecedores)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE suppliers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  cnpj        VARCHAR(20),
  phone       VARCHAR(30),
  email       VARCHAR(150),
  address     TEXT,
  notes       TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_suppliers_tenant ON suppliers(tenant_id);

-- ─────────────────────────────────────────────────────────────
--  6. PRODUCTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id     UUID           REFERENCES categories(id) ON DELETE SET NULL,
  name            VARCHAR(200)   NOT NULL,
  brand           VARCHAR(100),
  description     TEXT,
  cover_image_url TEXT,          -- Supabase Storage URL
  status          product_status NOT NULL DEFAULT 'active',
  tags            TEXT[]         NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_products_tenant   ON products(tenant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status   ON products(tenant_id, status) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────
--  7. PRODUCT VARIANTS (grade: tamanho × cor)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE product_variants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id  UUID          NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size        VARCHAR(20)   NOT NULL,   -- PP | P | M | G | GG | GGG | 34..54 | Único
  color       VARCHAR(60)   NOT NULL,
  color_hex   CHAR(7),                  -- ex: #FF5733
  sku         VARCHAR(80)   NOT NULL,
  barcode     VARCHAR(80),              -- EAN-13 ou código interno
  sale_price  NUMERIC(10,2),            -- preço de venda sugerido
  min_stock   INT           NOT NULL DEFAULT 0,  -- gatilho de alerta
  images      TEXT[]        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  UNIQUE (tenant_id, sku),
  UNIQUE (tenant_id, barcode)
);

CREATE TRIGGER product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_variants_tenant  ON product_variants(tenant_id);
CREATE INDEX idx_variants_barcode ON product_variants(tenant_id, barcode) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────
--  8. INVENTORY (estoque por variação × localização)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE inventory (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  variant_id   UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  location_id  UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  quantity     INT  NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_qty INT  NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),  -- reservado para e-commerce
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, variant_id, location_id)  -- um registro por variação × local
);

CREATE INDEX idx_inventory_tenant   ON inventory(tenant_id);
CREATE INDEX idx_inventory_variant  ON inventory(variant_id);
CREATE INDEX idx_inventory_location ON inventory(location_id);

-- View auxiliar: estoque consolidado por variação (todas as lojas)
CREATE VIEW inventory_totals AS
  SELECT
    tenant_id,
    variant_id,
    SUM(quantity)     AS total_quantity,
    SUM(reserved_qty) AS total_reserved,
    SUM(quantity - reserved_qty) AS available_quantity
  FROM inventory
  GROUP BY tenant_id, variant_id;

-- ─────────────────────────────────────────────────────────────
--  9. INVENTORY MOVEMENTS (log imutável — append only)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE inventory_movements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  variant_id       UUID          NOT NULL REFERENCES product_variants(id),
  location_id      UUID          REFERENCES locations(id),
  from_location_id UUID          REFERENCES locations(id),
  to_location_id   UUID          REFERENCES locations(id),
  quantity_delta   INT           NOT NULL,   -- positivo = entrada, negativo = saída
  movement_type    movement_type NOT NULL,
  reference_type   VARCHAR(40),              -- 'purchase' | 'sale' | 'transfer'
  reference_id     UUID,                     -- FK dinâmica para a tabela de origem
  user_id          UUID          REFERENCES users(id) ON DELETE SET NULL,
  note             TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
  -- Sem updated_at — este log é imutável
);

CREATE INDEX idx_movements_tenant    ON inventory_movements(tenant_id);
CREATE INDEX idx_movements_variant   ON inventory_movements(variant_id);
CREATE INDEX idx_movements_reference ON inventory_movements(reference_type, reference_id);
CREATE INDEX idx_movements_date      ON inventory_movements(tenant_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
--  10. CUSTOMERS (CRM básico)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  phone       VARCHAR(30),
  email       VARCHAR(150),
  cpf         VARCHAR(20),
  birthdate   DATE,
  address     TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_customers_tenant ON customers(tenant_id);

-- ─────────────────────────────────────────────────────────────
--  11. PURCHASES (compras)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE purchases (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id         UUID            REFERENCES suppliers(id) ON DELETE SET NULL,
  location_id         UUID            NOT NULL REFERENCES locations(id),  -- destino da mercadoria
  status              purchase_status NOT NULL DEFAULT 'draft',
  invoice_number      VARCHAR(60),
  invoice_url         TEXT,           -- PDF da NF no Supabase Storage
  products_cost       NUMERIC(12,2)   NOT NULL DEFAULT 0 CHECK (products_cost >= 0),
  freight_cost        NUMERIC(10,2)   NOT NULL DEFAULT 0 CHECK (freight_cost >= 0),
  other_costs         NUMERIC(10,2)   NOT NULL DEFAULT 0 CHECK (other_costs >= 0),
  total_cost          NUMERIC(12,2) GENERATED ALWAYS AS (products_cost + freight_cost + other_costs) STORED,
  total_items         INT             NOT NULL DEFAULT 0 CHECK (total_items >= 0),
  avg_unit_cost       NUMERIC(12,4) GENERATED ALWAYS AS (
    CASE WHEN total_items > 0
      THEN (products_cost + freight_cost + other_costs) / total_items
      ELSE 0
    END
  ) STORED,
  notes               TEXT,
  purchased_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
  received_at         TIMESTAMPTZ,
  created_by          UUID            REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);

CREATE TRIGGER purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_purchases_tenant   ON purchases(tenant_id);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_status   ON purchases(tenant_id, status);

-- ─────────────────────────────────────────────────────────────
--  12. PURCHASE ITEMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE purchase_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id    UUID          NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  variant_id     UUID          NOT NULL REFERENCES product_variants(id),
  quantity       INT           NOT NULL CHECK (quantity > 0),
  unit_cost      NUMERIC(10,4) NOT NULL CHECK (unit_cost >= 0),  -- custo unitário do produto
  real_unit_cost NUMERIC(10,4),  -- calculado após confirmar a compra (rateio de frete)
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_variant  ON purchase_items(variant_id);

-- ─────────────────────────────────────────────────────────────
--  13. SALES (vendas)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE sales (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id     UUID           NOT NULL REFERENCES locations(id),
  customer_id     UUID           REFERENCES customers(id) ON DELETE SET NULL,
  sold_by         UUID           REFERENCES users(id) ON DELETE SET NULL,
  status          sale_status    NOT NULL DEFAULT 'completed',
  channel         sale_channel   NOT NULL DEFAULT 'store',
  payment_method  payment_method NOT NULL,
  total_value     NUMERIC(12,2)  NOT NULL CHECK (total_value >= 0),
  total_cost      NUMERIC(12,2)  NOT NULL DEFAULT 0,   -- soma dos custos para cálculo de margem
  discount_value  NUMERIC(10,2)  NOT NULL DEFAULT 0,
  gross_margin    NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_value > 0
      THEN ROUND(((total_value - total_cost) / total_value) * 100, 2)
      ELSE 0
    END
  ) STORED,
  notes           TEXT,
  sold_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TRIGGER sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_sales_tenant   ON sales(tenant_id);
CREATE INDEX idx_sales_location ON sales(location_id);
CREATE INDEX idx_sales_date     ON sales(tenant_id, sold_at DESC);
CREATE INDEX idx_sales_channel  ON sales(tenant_id, channel);

-- ─────────────────────────────────────────────────────────────
--  14. SALE ITEMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE sale_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       UUID          NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  variant_id    UUID          NOT NULL REFERENCES product_variants(id),
  quantity      INT           NOT NULL CHECK (quantity > 0),
  unit_cost     NUMERIC(10,4) NOT NULL DEFAULT 0,   -- snapshot do custo no momento da venda
  sale_price    NUMERIC(10,2) NOT NULL CHECK (sale_price >= 0),
  discount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  final_price   NUMERIC(10,2) GENERATED ALWAYS AS (sale_price - discount) STORED,
  returned_qty  INT           NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_sale_items_sale    ON sale_items(sale_id);
CREATE INDEX idx_sale_items_variant ON sale_items(variant_id);

-- ─────────────────────────────────────────────────────────────
--  15. STOCK TRANSFERS (transferências entre lojas)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE stock_transfers (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID            NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_location_id UUID            NOT NULL REFERENCES locations(id),
  to_location_id   UUID            NOT NULL REFERENCES locations(id),
  status           transfer_status NOT NULL DEFAULT 'pending',
  requested_by     UUID            REFERENCES users(id) ON DELETE SET NULL,
  confirmed_by     UUID            REFERENCES users(id) ON DELETE SET NULL,
  notes            TEXT,
  requested_at     TIMESTAMPTZ     NOT NULL DEFAULT now(),
  received_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT now(),
  CONSTRAINT different_locations CHECK (from_location_id <> to_location_id)
);

CREATE TRIGGER stock_transfers_updated_at
  BEFORE UPDATE ON stock_transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_transfers_tenant ON stock_transfers(tenant_id);

-- ─────────────────────────────────────────────────────────────
--  16. TRANSFER ITEMS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE transfer_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id  UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  variant_id   UUID NOT NULL REFERENCES product_variants(id),
  quantity     INT  NOT NULL CHECK (quantity > 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transfer_items_transfer ON transfer_items(transfer_id);

-- ─────────────────────────────────────────────────────────────
--  17. PRICE HISTORY (log imutável de alterações de preço)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE price_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID          NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  variant_id  UUID          NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  old_price   NUMERIC(10,2),
  new_price   NUMERIC(10,2) NOT NULL,
  changed_by  UUID          REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_variant ON price_history(variant_id);

-- ─────────────────────────────────────────────────────────────
--  18. NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID              NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID              REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       VARCHAR(200)      NOT NULL,
  body        TEXT,
  data        JSONB             NOT NULL DEFAULT '{}',  -- payload extra (variant_id, etc.)
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user   ON notifications(user_id, read_at);
CREATE INDEX idx_notifications_tenant ON notifications(tenant_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
--  19. AUDIT LOG (registro de ações críticas)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID         REFERENCES users(id) ON DELETE SET NULL,
  action       VARCHAR(60)  NOT NULL,   -- ex: 'purchase.created', 'stock.adjusted'
  table_name   VARCHAR(80),
  record_id    UUID,
  old_data     JSONB,
  new_data     JSONB,
  ip_address   INET,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_record ON audit_log(table_name, record_id);

-- ─────────────────────────────────────────────────────────────
--  ROW LEVEL SECURITY (RLS)
--  Proteção multi-tenant direto no banco
-- ─────────────────────────────────────────────────────────────

-- Helper: extrai tenant_id do JWT
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- Helper: extrai user role do JWT
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'role';
$$ LANGUAGE SQL STABLE;

-- Ativa RLS em todas as tabelas
ALTER TABLE tenants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases          ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_transfers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;

-- Políticas: cada tabela só retorna dados do tenant do usuário logado

CREATE POLICY tenant_isolation ON tenants
  USING (id = auth_tenant_id());

CREATE POLICY tenant_isolation ON users
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON locations
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON categories
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON suppliers
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON products
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON product_variants
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON inventory
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON inventory_movements
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON customers
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON purchases
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON purchase_items
  USING (
    purchase_id IN (
      SELECT id FROM purchases WHERE tenant_id = auth_tenant_id()
    )
  );

CREATE POLICY tenant_isolation ON sales
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON sale_items
  USING (
    sale_id IN (
      SELECT id FROM sales WHERE tenant_id = auth_tenant_id()
    )
  );

CREATE POLICY tenant_isolation ON stock_transfers
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON transfer_items
  USING (
    transfer_id IN (
      SELECT id FROM stock_transfers WHERE tenant_id = auth_tenant_id()
    )
  );

CREATE POLICY tenant_isolation ON price_history
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON notifications
  USING (tenant_id = auth_tenant_id());

CREATE POLICY tenant_isolation ON audit_log
  USING (tenant_id = auth_tenant_id());

-- ─────────────────────────────────────────────────────────────
--  FUNÇÃO: alerta de estoque baixo
--  Disparada automaticamente ao atualizar inventory
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
DECLARE
  v_min_stock INT;
  v_tenant_id UUID;
  v_product_name VARCHAR;
BEGIN
  -- Busca min_stock e tenant da variação
  SELECT pv.min_stock, pv.tenant_id, p.name
  INTO v_min_stock, v_tenant_id, v_product_name
  FROM product_variants pv
  JOIN products p ON p.id = pv.product_id
  WHERE pv.id = NEW.variant_id;

  -- Se quantidade ficou abaixo do mínimo, gera notificação
  IF NEW.quantity <= v_min_stock AND v_min_stock > 0 THEN
    INSERT INTO notifications (tenant_id, type, title, body, data)
    VALUES (
      v_tenant_id,
      'low_stock',
      'Estoque baixo: ' || v_product_name,
      'Quantidade atual: ' || NEW.quantity || ' (mínimo: ' || v_min_stock || ')',
      jsonb_build_object(
        'variant_id', NEW.variant_id,
        'location_id', NEW.location_id,
        'quantity', NEW.quantity,
        'min_stock', v_min_stock
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER inventory_low_stock_alert
  AFTER UPDATE OF quantity ON inventory
  FOR EACH ROW
  WHEN (NEW.quantity < OLD.quantity)  -- só quando quantidade diminuiu
  EXECUTE FUNCTION check_low_stock();

-- ─────────────────────────────────────────────────────────────
--  DADOS INICIAIS: categorias padrão para novos tenants
--  (inserir após criar o tenant no onboarding)
-- ─────────────────────────────────────────────────────────────
-- Exemplo de como inserir para um tenant específico:
-- INSERT INTO categories (tenant_id, name, color_hex) VALUES
--   ('[TENANT_ID]', 'Blusas',      '#EC4899'),
--   ('[TENANT_ID]', 'Calças',      '#3B82F6'),
--   ('[TENANT_ID]', 'Vestidos',    '#8B5CF6'),
--   ('[TENANT_ID]', 'Shorts',      '#F59E0B'),
--   ('[TENANT_ID]', 'Jaquetas',    '#6B7280'),
--   ('[TENANT_ID]', 'Acessórios',  '#10B981');

-- ─────────────────────────────────────────────────────────────
--  FIM DO SCHEMA
--  Próximo passo: configurar o JWT custom claims no Supabase
--  para incluir tenant_id e role no token do usuário.
--  Ver: supabase.com/docs/guides/auth/custom-claims-and-role-based-access-control-rbac
-- ─────────────────────────────────────────────────────────────
