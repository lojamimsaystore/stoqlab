"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";

const adjustSchema = z.object({
  variantId: z.string().uuid(),
  locationId: z.string().uuid(),
  newQuantity: z.number().int().min(0, "Quantidade não pode ser negativa"),
  note: z.string().max(200).optional(),
});

export type AdjustState = { error?: string; success?: boolean };

export async function adjustInventoryAction(
  _prev: AdjustState,
  formData: FormData
): Promise<AdjustState> {
  const tenantId = await getTenantId();

  const parsed = adjustSchema.safeParse({
    variantId: formData.get("variantId"),
    locationId: formData.get("locationId"),
    newQuantity: Number(formData.get("newQuantity")),
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { variantId, locationId, newQuantity, note } = parsed.data;

  // Busca quantidade atual
  const { data: inv } = await supabaseAdmin
    .from("inventory")
    .select("id, quantity")
    .eq("variant_id", variantId)
    .eq("location_id", locationId)
    .eq("tenant_id", tenantId)
    .single();

  const currentQty = inv?.quantity ?? 0;
  const delta = newQuantity - currentQty;

  if (delta === 0) return { success: true };

  // Upsert inventory
  if (inv) {
    await supabaseAdmin
      .from("inventory")
      .update({ quantity: newQuantity })
      .eq("id", inv.id);
  } else {
    await supabaseAdmin.from("inventory").insert({
      tenant_id: tenantId,
      variant_id: variantId,
      location_id: locationId,
      quantity: newQuantity,
    });
  }

  // Registrar movimentação
  await supabaseAdmin.from("inventory_movements").insert({
    tenant_id: tenantId,
    variant_id: variantId,
    location_id: locationId,
    quantity_delta: delta,
    movement_type: "adjustment",
    note: note ?? `Ajuste manual: ${currentQty} → ${newQuantity}`,
  });

  revalidatePath("/estoque");
  revalidatePath("/produtos");
  return { success: true };
}
