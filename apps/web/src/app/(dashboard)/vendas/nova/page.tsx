import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { SaleForm } from "./sale-form";

export default async function NovaVendaPage() {
  const tenantId = await getTenantId();

  // Busca variantes não deletadas com estoque > 0
  const { data: variantRows } = await supabaseAdmin
    .from("product_variants")
    .select(`
      id, color, size, sku, sale_price,
      products!inner(name, deleted_at),
      inventory(quantity)
    `)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  const variants = (variantRows ?? [])
    .map((v) => {
      const product = v.products as { name: string; deleted_at: string | null } | null;
      const invList = v.inventory as { quantity: number }[] | null;
      const stock = (invList ?? []).reduce((s, i) => s + i.quantity, 0);
      if (!product || product.deleted_at || stock <= 0) return null;
      return {
        id: v.id,
        color: v.color,
        size: v.size,
        sku: v.sku ?? "",
        salePrice: Number(v.sale_price ?? 0),
        stock,
        productName: product.name,
      };
    })
    .filter(Boolean) as {
      id: string; color: string; size: string; sku: string;
      salePrice: number; stock: number; productName: string;
    }[];

  variants.sort((a, b) => a.productName.localeCompare(b.productName));

  return (
    <div className="space-y-6 max-w-3xl">
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/vendas" className="hover:text-slate-700">Vendas</Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">Nova venda</span>
      </nav>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Nova venda</h1>
        <p className="text-sm text-slate-500 mt-1">
          Busque os produtos e finalize a venda. O estoque será baixado automaticamente.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <SaleForm variants={variants} />
      </div>
    </div>
  );
}
