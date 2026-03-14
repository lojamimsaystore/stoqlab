"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";

export type CustomerResult = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthdate: string | null;
  address: string | null;
};

const itemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1),
  salePrice: z.number().min(0),
  discount: z.number().min(0).default(0),
});

const saleSchema = z.object({
  paymentMethod: z.enum(["cash", "credit", "debit", "pix", "installment"]),
  channel: z.enum(["store", "ecommerce", "marketplace", "whatsapp"]).default("store"),
  notes: z.string().max(300).optional(),
  items: z.array(itemSchema).min(1, "Adicione ao menos um item"),
});

export type SaleState = { error?: string };

export async function createSaleAction(
  _prev: SaleState,
  formData: FormData
): Promise<SaleState> {
  const tenantId = await getTenantId();

  let items: unknown[];
  try {
    items = JSON.parse(formData.get("items") as string);
  } catch {
    return { error: "Itens inválidos." };
  }

  const parsed = saleSchema.safeParse({
    paymentMethod: formData.get("paymentMethod"),
    channel: formData.get("channel") || "store",
    notes: formData.get("notes") || undefined,
    items,
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // Busca localização padrão
  const { data: loc } = await supabaseAdmin
    .from("locations")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .limit(1)
    .single();

  if (!loc) return { error: "Nenhuma localização cadastrada." };
  const locationId = loc.id;

  // Valida estoque disponível
  for (const item of parsed.data.items) {
    const { data: inv } = await supabaseAdmin
      .from("inventory")
      .select("quantity")
      .eq("variant_id", item.variantId)
      .eq("location_id", locationId)
      .single();

    if (!inv || inv.quantity < item.quantity) {
      return { error: `Estoque insuficiente para um dos itens.` };
    }
  }

  const totalValue = parsed.data.items.reduce(
    (s, i) => s + i.quantity * (i.salePrice - i.discount),
    0
  );
  const discountValue = parsed.data.items.reduce(
    (s, i) => s + i.quantity * i.discount,
    0
  );

  // Resolve cliente (existente ou cria novo)
  const customerId = (formData.get("customerId") as string) || null;
  const customerName = ((formData.get("customerName") as string) || "").trim();
  const customerPhone = ((formData.get("customerPhone") as string) || "").trim() || null;
  const customerEmail = ((formData.get("customerEmail") as string) || "").trim() || null;
  const customerBirthdate = ((formData.get("customerBirthdate") as string) || "").trim() || null;
  const customerAddress = ((formData.get("customerAddress") as string) || "").trim() || null;

  let resolvedCustomerId: string | null = customerId;
  if (!resolvedCustomerId && customerName) {
    const { data: newCustomer } = await supabaseAdmin
      .from("customers")
      .insert({
        tenant_id: tenantId,
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
        birthdate: customerBirthdate,
        address: customerAddress,
      })
      .select("id")
      .single();
    if (newCustomer) resolvedCustomerId = newCustomer.id;
  }

  // Cria venda
  const { data: sale, error: saleError } = await supabaseAdmin
    .from("sales")
    .insert({
      tenant_id: tenantId,
      location_id: locationId,
      customer_id: resolvedCustomerId,
      status: "completed",
      channel: parsed.data.channel,
      payment_method: parsed.data.paymentMethod,
      total_value: totalValue.toFixed(2),
      total_cost: "0",
      discount_value: discountValue.toFixed(2),
      notes: parsed.data.notes ?? null,
      sold_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (saleError) return { error: "Erro ao registrar venda." };

  // Cria itens
  const saleItems = parsed.data.items.map((item) => ({
    sale_id: sale.id,
    variant_id: item.variantId,
    quantity: item.quantity,
    unit_cost: "0",
    sale_price: item.salePrice.toFixed(2),
    discount: item.discount.toFixed(2),
  }));

  const { error: itemsError } = await supabaseAdmin
    .from("sale_items")
    .insert(saleItems);

  if (itemsError) {
    await supabaseAdmin.from("sales").delete().eq("id", sale.id);
    return { error: "Erro ao salvar itens da venda." };
  }

  // Baixa estoque
  for (const item of parsed.data.items) {
    const { data: inv } = await supabaseAdmin
      .from("inventory")
      .select("id, quantity")
      .eq("variant_id", item.variantId)
      .eq("location_id", locationId)
      .single();

    if (inv) {
      await supabaseAdmin
        .from("inventory")
        .update({ quantity: inv.quantity - item.quantity })
        .eq("id", inv.id);
    }

    await supabaseAdmin.from("inventory_movements").insert({
      tenant_id: tenantId,
      variant_id: item.variantId,
      location_id: locationId,
      quantity_delta: -item.quantity,
      movement_type: "sale",
      reference_id: sale.id,
      note: `Venda ${sale.id.slice(0, 8)}`,
    });
  }

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  redirect("/vendas");
}

export async function searchCustomersAction(query: string): Promise<CustomerResult[]> {
  const tenantId = await getTenantId();
  if (!query || query.length < 2) return [];
  const { data } = await supabaseAdmin
    .from("customers")
    .select("id, name, phone, email, birthdate, address")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .order("name")
    .limit(8);
  return (data ?? []) as CustomerResult[];
}

export async function cancelSaleAction(id: string): Promise<void> {
  const tenantId = await getTenantId();
  await supabaseAdmin
    .from("sales")
    .update({ status: "cancelled", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath("/vendas");
}
