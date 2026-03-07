"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";

const itemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitCost: z.number().min(0),
});

const purchaseSchema = z.object({
  supplierId: z.string().uuid().optional(),
  invoiceNumber: z.string().max(60).optional(),
  purchasedAt: z.string().min(1, "Data obrigatória"),
  freightCost: z.number().min(0).default(0),
  otherCosts: z.number().min(0).default(0),
  notes: z.string().max(500).optional(),
  items: z.array(itemSchema).min(1, "Adicione ao menos um item"),
});

async function getOrCreateDefaultLocation(tenantId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("locations")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .limit(1)
    .single();

  if (data) return data.id;

  const { data: created } = await supabaseAdmin
    .from("locations")
    .insert({ tenant_id: tenantId, name: "Estoque Principal", type: "warehouse" })
    .select("id")
    .single();

  return created!.id;
}

export type PurchaseState = { error?: string };

export async function createPurchaseAction(
  _prev: PurchaseState,
  formData: FormData
): Promise<PurchaseState> {
  const tenantId = await getTenantId();

  let items: unknown[];
  try {
    items = JSON.parse(formData.get("items") as string);
  } catch {
    return { error: "Itens inválidos." };
  }

  const parsed = purchaseSchema.safeParse({
    supplierId: formData.get("supplierId") || undefined,
    invoiceNumber: formData.get("invoiceNumber") || undefined,
    purchasedAt: formData.get("purchasedAt"),
    freightCost: Number(formData.get("freightCost") || 0),
    otherCosts: Number(formData.get("otherCosts") || 0),
    notes: formData.get("notes") || undefined,
    items,
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { supplierId, invoiceNumber, purchasedAt, freightCost, otherCosts, notes } = parsed.data;

  const locationId = await getOrCreateDefaultLocation(tenantId);

  const totalItems = parsed.data.items.reduce((s, i) => s + i.quantity, 0);
  const productsCost = parsed.data.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const totalCost = productsCost + freightCost + otherCosts;
  const avgUnitCost = totalItems > 0 ? totalCost / totalItems : 0;

  // 1. Criar compra
  const { data: purchase, error: purchaseError } = await supabaseAdmin
    .from("purchases")
    .insert({
      tenant_id: tenantId,
      supplier_id: supplierId ?? null,
      location_id: locationId,
      status: "received",
      invoice_number: invoiceNumber ?? null,
      products_cost: productsCost.toFixed(2),
      freight_cost: freightCost.toFixed(2),
      other_costs: otherCosts.toFixed(2),
      total_items: totalItems,
      notes: notes ?? null,
      purchased_at: new Date(purchasedAt).toISOString(),
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (purchaseError) return { error: "Erro ao registrar compra." };

  // 2. Criar itens
  const purchaseItems = parsed.data.items.map((item) => ({
    purchase_id: purchase.id,
    variant_id: item.variantId,
    quantity: item.quantity,
    unit_cost: item.unitCost.toFixed(4),
    real_unit_cost: avgUnitCost.toFixed(4),
  }));

  const { error: itemsError } = await supabaseAdmin
    .from("purchase_items")
    .insert(purchaseItems);

  if (itemsError) {
    await supabaseAdmin.from("purchases").delete().eq("id", purchase.id);
    return { error: "Erro ao salvar itens da compra." };
  }

  // 3. Atualizar estoque e registrar movimentações
  for (const item of parsed.data.items) {
    // Upsert inventory
    const { data: inv } = await supabaseAdmin
      .from("inventory")
      .select("id, quantity")
      .eq("variant_id", item.variantId)
      .eq("location_id", locationId)
      .single();

    if (inv) {
      await supabaseAdmin
        .from("inventory")
        .update({ quantity: inv.quantity + item.quantity })
        .eq("id", inv.id);
    } else {
      await supabaseAdmin.from("inventory").insert({
        tenant_id: tenantId,
        variant_id: item.variantId,
        location_id: locationId,
        quantity: item.quantity,
      });
    }

    // Movimento
    await supabaseAdmin.from("inventory_movements").insert({
      tenant_id: tenantId,
      variant_id: item.variantId,
      location_id: locationId,
      quantity_delta: item.quantity,
      movement_type: "purchase",
      reference_id: purchase.id,
      note: `Compra ${invoiceNumber ?? purchase.id.slice(0, 8)}`,
    });
  }

  revalidatePath("/compras");
  revalidatePath("/estoque");
  redirect("/compras");
}

export async function deletePurchaseAction(id: string): Promise<void> {
  const tenantId = await getTenantId();
  await supabaseAdmin
    .from("purchases")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath("/compras");
}
