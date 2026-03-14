import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { PurchaseForm } from "./purchase-form";

export default async function NovaCompraPage() {
  const tenantId = await getTenantId();

  const [{ data: suppliers }, { data: variants }, { data: categories }] = await Promise.all([
    supabaseAdmin
      .from("suppliers")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("name"),
    supabaseAdmin
      .from("product_variants")
      .select("id, color, size, sku, products(id, name, cover_image_url, category_id)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("created_at"),
    supabaseAdmin
      .from("categories")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  // Agrupa variantes por produto
  type ProductGroup = { id: string; name: string; imageUrl?: string | null; categoryId?: string | null; variants: { id: string; color: string; size: string; sku: string }[] };
  const productMap = new Map<string, ProductGroup>();

  for (const v of variants ?? []) {
    const product = v.products as { id: string; name: string; cover_image_url?: string | null; category_id?: string | null } | null;
    if (!product) continue;
    if (!productMap.has(product.id)) {
      productMap.set(product.id, { id: product.id, name: product.name, imageUrl: product.cover_image_url, categoryId: product.category_id, variants: [] });
    }
    productMap.get(product.id)!.variants.push({
      id: v.id,
      color: v.color,
      size: v.size,
      sku: v.sku ?? "",
    });
  }

  const products = Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <Link href="/compras" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
            <ArrowLeft size={15} />
            Voltar
          </Link>
          <h1 className="text-xl font-semibold text-slate-900">Nova compra</h1>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <PurchaseForm suppliers={suppliers ?? []} products={products} categories={categories ?? []} />
      </div>
    </div>
  );
}
