import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { EditPurchaseForm } from "./edit-purchase-form";

export default async function EditarCompraPage({ params }: { params: { id: string } }) {
  const tenantId = await getTenantId();

  const { data: purchase } = await supabaseAdmin
    .from("purchases")
    .select("id, status, invoice_number, purchased_at, payment_method, products_cost, freight_cost, other_costs, notes, supplier_id")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .single();

  if (!purchase) notFound();

  const { data: purchaseItems } = await supabaseAdmin
    .from("purchase_items")
    .select("variant_id, quantity, unit_cost, product_variants(color, size, sku, products(name, cover_image_url))")
    .eq("purchase_id", params.id);

  const { data: suppliers } = await supabaseAdmin
    .from("suppliers")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("name");

  const items = (purchaseItems ?? []).map((item) => {
    const v = item.product_variants as unknown as {
      color: string; size: string; sku: string;
      products: { name: string; cover_image_url: string | null } | null;
    } | null;
    return {
      variantId: item.variant_id,
      productName: v?.products?.name ?? "—",
      color: v?.color ?? "",
      size: v?.size ?? "",
      sku: v?.sku ?? "",
      coverImageUrl: v?.products?.cover_image_url ?? null,
      quantity: item.quantity,
      unitCost: Number(item.unit_cost),
    };
  });

  return (
    <EditPurchaseForm
      purchaseId={params.id}
      items={items}
      supplierId={purchase.supplier_id ?? ""}
      invoiceNumber={purchase.invoice_number ?? ""}
      purchasedAt={purchase.purchased_at.slice(0, 10)}
      paymentMethod={purchase.payment_method ?? "cash"}
      freightCost={Number(purchase.freight_cost)}
      otherCosts={Number(purchase.other_costs)}
      notes={purchase.notes ?? ""}
      suppliers={(suppliers ?? []) as { id: string; name: string }[]}
    />
  );
}
