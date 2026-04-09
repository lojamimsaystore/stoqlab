-- ============================================================
--  STOQLAB — Função RPC: adjust_inventory (atômico)
--
--  Resolve race condition: SELECT qty → calcular → UPDATE qty
--  substituído por uma única operação atômica no banco.
--
--  Delta positivo  (+N) = entrada de estoque (compras, devoluções)
--  Delta negativo  (-N) = saída de estoque   (vendas, transferências)
--
--  Retorna: { "id": "...", "quantity": N }
--    ou NULL se estoque insuficiente / registro não encontrado.
--
--  Aplicar no SQL Editor do Supabase (uma vez).
-- ============================================================

CREATE OR REPLACE FUNCTION public.adjust_inventory(
  p_tenant_id   UUID,
  p_variant_id  UUID,
  p_location_id UUID,
  p_delta       INTEGER       -- positivo = entrada, negativo = saída
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_delta > 0 THEN
    -- ── Entrada: upsert atômico (INSERT ou soma ao existente) ──────────
    INSERT INTO inventory (tenant_id, variant_id, location_id, quantity)
    VALUES (p_tenant_id, p_variant_id, p_location_id, p_delta)
    ON CONFLICT (tenant_id, variant_id, location_id)
    DO UPDATE SET
      quantity   = inventory.quantity + p_delta,
      updated_at = NOW()
    RETURNING jsonb_build_object('id', inventory.id, 'quantity', inventory.quantity)
    INTO v_result;

  ELSE
    -- ── Saída: só atualiza se tiver saldo suficiente ────────────────────
    UPDATE inventory
    SET
      quantity   = quantity + p_delta,   -- p_delta é negativo
      updated_at = NOW()
    WHERE tenant_id  = p_tenant_id
      AND variant_id  = p_variant_id
      AND location_id = p_location_id
      AND quantity + p_delta >= 0        -- evita estoque negativo
    RETURNING jsonb_build_object('id', id, 'quantity', quantity)
    INTO v_result;
    -- Se v_result é NULL: estoque insuficiente ou registro não existe
  END IF;

  RETURN v_result;
END;
$$;

-- Permissão: service_role pode chamar a função
GRANT EXECUTE ON FUNCTION public.adjust_inventory TO service_role;

-- ============================================================
--  Teste rápido (opcional):
-- ============================================================
-- SELECT public.adjust_inventory(
--   'SEU-TENANT-ID'::uuid,
--   'SEU-VARIANT-ID'::uuid,
--   'SEU-LOCATION-ID'::uuid,
--   10   -- adiciona 10 unidades
-- );
