/**
 * Ajuste atômico de inventário via RPC PostgreSQL.
 *
 * Evita race condition do padrão: SELECT qty → calcular → UPDATE qty
 * substituindo por uma única operação atômica no banco.
 *
 * ANTES de usar, aplique packages/database/migrations/atomic-inventory-rpc.sql
 * no SQL Editor do Supabase.
 */
import { supabaseAdmin } from "@/lib/supabase/service";

export type InventoryAdjustResult =
  | { ok: true; id: string; quantity: number }
  | { ok: false; reason: "insufficient_stock" | "db_error"; message: string };

/**
 * Ajusta o estoque de forma atômica.
 * @param delta  Positivo = entrada (compra/devolução). Negativo = saída (venda/transferência).
 */
export async function adjustInventory(
  tenantId: string,
  variantId: string,
  locationId: string,
  delta: number,
): Promise<InventoryAdjustResult> {
  const { data, error } = await supabaseAdmin.rpc("adjust_inventory", {
    p_tenant_id: tenantId,
    p_variant_id: variantId,
    p_location_id: locationId,
    p_delta: delta,
  });

  if (error) {
    console.error("[adjustInventory] RPC error:", error);
    return { ok: false, reason: "db_error", message: error.message };
  }

  if (!data) {
    // RPC retornou NULL → estoque insuficiente (delta negativo sem saldo)
    return {
      ok: false,
      reason: "insufficient_stock",
      message: `Estoque insuficiente para variant ${variantId}`,
    };
  }

  const result = data as { id: string; quantity: number };
  return { ok: true, id: result.id, quantity: result.quantity };
}
