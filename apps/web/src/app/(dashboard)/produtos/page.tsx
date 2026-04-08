import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { SearchInput } from "@/components/ui/search-input";
import { ProductStatusFilter } from "./components/product-status-filter";
import { ProductsGrid } from "./components/products-grid";
import { Suspense } from "react";


export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const tenantId = await getTenantId();
  const { q, status } = await searchParams;

  let query = supabaseAdmin
    .from("products")
    .select(`
      id, name, brand, status, cover_image_url,
      categories(name),
      product_variants(id, color, color_hex, inventory(quantity))
    `)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data: products } = await query;
  const total = products?.length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Produtos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} produto{total !== 1 ? "s" : ""}
            {q ? ` encontrado${total !== 1 ? "s" : ""} para "${q}"` : ""}
          </p>
        </div>
        <Link
          href="/compras/nova"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={16} />
          Nova entrada
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Suspense fallback={null}>
          <SearchInput placeholder="Buscar produto por nome…" className="flex-1" />
        </Suspense>
        <Suspense fallback={null}>
          <ProductStatusFilter />
        </Suspense>
      </div>

      {!products?.length ? (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-16 text-center">
          <Package size={40} className="text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">
            {q || status ? "Nenhum produto encontrado com esses filtros" : "Nenhum produto cadastrado"}
          </p>
          {!q && !status && (
            <p className="text-slate-400 text-sm mt-1">
              Cadastre produtos ao registrar uma compra — clique em{" "}
              <span className="font-medium text-slate-500">Nova entrada</span>
            </p>
          )}
        </div>
      ) : (
        <ProductsGrid products={products as Parameters<typeof ProductsGrid>[0]["products"]} />
      )}
    </div>
  );
}

