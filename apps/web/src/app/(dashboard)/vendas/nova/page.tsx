import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { SaleForm } from "./sale-form";

export default async function NovaVendaPage() {
  const tenantId = await getTenantId();

  const { data: variantRows } = await supabaseAdmin
    .from("product_variants")
    .select(`
      id, color, size, sku, sale_price, color_hex,
      products!inner(name, deleted_at, cover_image_url),
      inventory(quantity)
    `)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  const variants = (variantRows ?? [])
    .map((v) => {
      const product = v.products as {
        name: string;
        deleted_at: string | null;
        cover_image_url: string | null;
      } | null;
      const invList = v.inventory as { quantity: number }[] | null;
      const stock = (invList ?? []).reduce((s, i) => s + i.quantity, 0);
      if (!product || product.deleted_at || stock <= 0) return null;
      return {
        id: v.id,
        color: v.color as string,
        colorHex: v.color_hex as string | null,
        size: v.size as string,
        sku: (v.sku as string) ?? "",
        salePrice: Number(v.sale_price ?? 0),
        stock,
        productName: product.name as string,
        coverImageUrl: product.cover_image_url,
      };
    })
    .filter(Boolean) as {
      id: string;
      color: string;
      colorHex: string | null;
      size: string;
      sku: string;
      salePrice: number;
      stock: number;
      productName: string;
      coverImageUrl: string | null;
    }[];

  variants.sort((a, b) => a.productName.localeCompare(b.productName));

  return (
    // Full-screen: cancela o padding do main e ocupa toda a altura disponível
    <div className="-m-4 lg:-m-6 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      <SaleForm variants={variants} />
    </div>
  );
}
