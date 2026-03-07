import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { PurchaseForm } from "./purchase-form";

export default async function NovaCompraPage() {
  const tenantId = await getTenantId();

  const [{ data: suppliers }, { data: variants }] = await Promise.all([
    supabaseAdmin
      .from("suppliers")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("name"),
    supabaseAdmin
      .from("product_variants")
      .select("id, color, size, sku, products(id, name)")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("created_at"),
  ]);

  // Agrupa variantes por produto
  type ProductGroup = { id: string; name: string; variants: { id: string; color: string; size: string; sku: string }[] };
  const productMap = new Map<string, ProductGroup>();

  for (const v of variants ?? []) {
    const product = v.products as { id: string; name: string } | null;
    if (!product) continue;
    if (!productMap.has(product.id)) {
      productMap.set(product.id, { id: product.id, name: product.name, variants: [] });
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
    <div className="space-y-6 max-w-3xl">
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/compras" className="hover:text-slate-700">Compras</Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">Nova compra</span>
      </nav>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Nova compra</h1>
        <p className="text-sm text-slate-500 mt-1">
          Registre a entrada de mercadoria. O estoque será atualizado automaticamente.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <PurchaseForm suppliers={suppliers ?? []} products={products} />
      </div>
    </div>
  );
}
