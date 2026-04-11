-- ============================================================
--  STOQLAB — Garante constraint única na tabela inventory
--
--  Necessário para o ON CONFLICT (tenant_id, variant_id, location_id)
--  do RPC adjust_inventory funcionar corretamente.
--
--  O Drizzle cria este constraint via db:push, mas se o banco foi
--  configurado manualmente pode estar ausente.
--
--  Safe to run multiple times (idempotente).
--  Aplicar no SQL Editor do Supabase (uma vez).
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'inventory_tenant_variant_location_unique'
      AND conrelid = 'inventory'::regclass
  ) THEN
    ALTER TABLE inventory
      ADD CONSTRAINT inventory_tenant_variant_location_unique
      UNIQUE (tenant_id, variant_id, location_id);
  END IF;
END $$;
