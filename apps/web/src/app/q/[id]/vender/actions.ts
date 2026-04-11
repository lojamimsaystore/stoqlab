"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { adjustInventory } from "@/lib/inventory";

const SALE_ROLES = ["owner", "manager", "seller"];

const schema = z.object({
  variantId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  paymentMethod: z.enum(["cash", "credit", "debit", "pix"]),
});

export type QrSaleState = { error?: string; success?: boolean; quantity?: number; paymentMethod?: string };

export async function qrSaleAction(
  _prev: QrSaleState,
  formData: FormData
): Promise<QrSaleState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const tenantId = await getTenantId();

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .eq("tenant_id", tenantId)
    .single();

  if (!profile || !SALE_ROLES.includes(profile.role)) {
    return { error: "Sem permissão para realizar vendas." };
  }

  const rawQty = parseInt(formData.get("quantity") as string, 10);
  const parsed = schema.safeParse({
    variantId: formData.get("variantId"),
    locationId: formData.get("locationId"),
    quantity: Number.isFinite(rawQty) ? rawQty : 1,
    paymentMethod: formData.get("paymentMethod"),
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { variantId, locationId, quantity, paymentMethod } = parsed.data;

  // Garante que a variante pertence ao tenant
  const { data: variant } = await supabaseAdmin
    .from("product_variants")
    .select("id, sale_price")
    .eq("id", variantId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .single();

  if (!variant) return { error: "Produto não encontrado." };

  // Garante que a localização pertence ao tenant
  const { data: loc } = await supabaseAdmin
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .single();

  if (!loc) return { error: "Localização inválida." };

  // Valida estoque
  const { data: inv } = await supabaseAdmin
    .from("inventory")
    .select("quantity")
    .eq("variant_id", variantId)
    .eq("location_id", locationId)
    .single();

  if (!inv || inv.quantity < quantity) {
    return { error: "Estoque insuficiente para esta localização." };
  }

  const salePrice = Number(variant.sale_price ?? 0);
  const totalValue = salePrice * quantity;

  // Cria venda
  const { data: sale, error: saleError } = await supabaseAdmin
    .from("sales")
    .insert({
      tenant_id: tenantId,
      location_id: locationId,
      status: "completed",
      channel: "store",
      payment_method: paymentMethod,
      total_value: totalValue.toFixed(2),
      total_cost: "0",
      discount_value: "0",
      sold_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (saleError) return { error: "Erro ao registrar venda." };

  // Cria item
  const { error: itemError } = await supabaseAdmin
    .from("sale_items")
    .insert({
      sale_id: sale.id,
      variant_id: variantId,
      quantity,
      unit_cost: "0",
      sale_price: salePrice.toFixed(2),
      discount: "0",
    });

  if (itemError) {
    await supabaseAdmin.from("sales").delete().eq("id", sale.id);
    return { error: "Erro ao salvar item da venda." };
  }

  // Baixa estoque atomicamente
  const invResult = await adjustInventory(tenantId, variantId, locationId, -quantity);
  if (!invResult.ok) {
    await supabaseAdmin.from("sale_items").delete().eq("sale_id", sale.id);
    await supabaseAdmin.from("sales").delete().eq("id", sale.id);
    return { error: "Erro ao baixar estoque." };
  }

  await supabaseAdmin.from("inventory_movements").insert({
    tenant_id: tenantId,
    variant_id: variantId,
    location_id: locationId,
    quantity_delta: -quantity,
    movement_type: "sale",
    reference_id: sale.id,
    note: `Venda via QR ${sale.id.slice(0, 8)}`,
  });

  return { success: true, quantity, paymentMethod };
}
