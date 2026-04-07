import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { EditSaleForm } from "./edit-sale-form";

export default async function EditarVendaPage({ params }: { params: { id: string } }) {
  const tenantId = await getTenantId();

  const { data: sale } = await supabaseAdmin
    .from("sales")
    .select("id, status, payment_method, channel, notes, location_id, customer_id")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .single();

  if (!sale || sale.status !== "completed") notFound();

  const { data: saleItems } = await supabaseAdmin
    .from("sale_items")
    .select("variant_id, quantity, sale_price, discount, product_variants(color, size, sku, sale_price, products(name, cover_image_url))")
    .eq("sale_id", params.id);

  const variantIds = (saleItems ?? []).map((i) => i.variant_id);

  const { data: inventoryData } = await supabaseAdmin
    .from("inventory")
    .select("variant_id, quantity")
    .in("variant_id", variantIds)
    .eq("location_id", sale.location_id);

  const inventoryMap = new Map(
    (inventoryData ?? []).map((inv) => [inv.variant_id, inv.quantity as number])
  );

  let customer: { id: string; name: string; phone: string | null; email: string | null } | null = null;
  if (sale.customer_id) {
    const { data } = await supabaseAdmin
      .from("customers")
      .select("id, name, phone, email")
      .eq("id", sale.customer_id)
      .is("deleted_at", null)
      .single();
    customer = data as typeof customer;
  }

  const items = (saleItems ?? []).map((item) => {
    const v = item.product_variants as unknown as {
      color: string; size: string; sku: string; sale_price: string;
      products: { name: string; cover_image_url: string | null } | null;
    } | null;
    const currentStock = inventoryMap.get(item.variant_id) ?? 0;
    return {
      variantId: item.variant_id,
      productName: v?.products?.name ?? "—",
      color: v?.color ?? "",
      size: v?.size ?? "",
      sku: v?.sku ?? "",
      coverImageUrl: v?.products?.cover_image_url ?? null,
      quantity: item.quantity,
      salePrice: Number(item.sale_price),
      discount: Number(item.discount),
      // Estoque disponível = atual + quantidade já vendida (será liberada ao salvar)
      maxQuantity: currentStock + item.quantity,
    };
  });

  return (
    <EditSaleForm
      saleId={params.id}
      items={items}
      paymentMethod={sale.payment_method}
      channel={sale.channel}
      notes={sale.notes ?? ""}
      customer={customer}
    />
  );
}
