import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { SaleForm } from "./sale-form";

export default async function NovaVendaPage({
  searchParams,
}: {
  searchParams: { variantId?: string };
}) {
  const tenantId = await getTenantId();

  const [{ data: variantRows }, { data: locationRows }] = await Promise.all([
    supabaseAdmin
      .from("product_variants")
      .select(`
        id, color, size, sku, sale_price, color_hex,
        products!inner(name, deleted_at, cover_image_url),
        inventory(quantity, location_id)
      `)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
    supabaseAdmin
      .from("locations")
      .select("id, name, type")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const locations = (locationRows ?? []) as { id: string; name: string; type: string }[];

  const variants = (variantRows ?? [])
    .map((v) => {
      const product = v.products as unknown as {
        name: string;
        deleted_at: string | null;
        cover_image_url: string | null;
      } | null;
      if (!product || product.deleted_at) return null;

      const invList = v.inventory as { quantity: number; location_id: string }[] | null;
      const locationStock: Record<string, number> = {};
      for (const inv of (invList ?? [])) {
        locationStock[inv.location_id] = inv.quantity;
      }
      const totalStock = Object.values(locationStock).reduce((s, q) => s + q, 0);
      if (totalStock <= 0) return null;

      return {
        id: v.id,
        color: v.color as string,
        colorHex: v.color_hex as string | null,
        size: v.size as string,
        sku: (v.sku as string) ?? "",
        salePrice: Number(v.sale_price ?? 0),
        locationStock,
        productName: product.name as string,
        coverImageUrl: product.cover_image_url,
      };
    })
    .filter(Boolean) as unknown as {
      id: string;
      color: string;
      colorHex: string | null;
      size: string;
      sku: string;
      salePrice: number;
      locationStock: Record<string, number>;
      productName: string;
      coverImageUrl: string | null;
    }[];

  variants.sort((a, b) => a.productName.localeCompare(b.productName));

  return (
    // Full-screen: cancela o padding do main e ocupa toda a altura disponível
    <div className="-m-4 lg:-m-6 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      <SaleForm variants={variants} locations={locations} initialVariantId={searchParams.variantId} />
    </div>
  );
}
