import Link from "next/link";
import { Plus, ShoppingBag } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { SearchInput } from "@/components/ui/search-input";
import { StatusFilter } from "./status-filter";
import { PurchasesTable } from "./purchases-table";
import { Suspense } from "react";


export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const tenantId = await getTenantId();
  const { q, status } = await searchParams;

  let query = supabaseAdmin
    .from("purchases")
    .select("id, status, invoice_number, invoice_url, purchased_at, total_items, products_cost, freight_cost, other_costs, suppliers(name)")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("purchased_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (q) {
    query = query.or(`invoice_number.ilike.%${q}%`);
  }

  const { data: purchases } = await query;
  const total = purchases?.length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Compras</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} compra{total !== 1 ? "s" : ""} registrada{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/compras/nova"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={16} />
          Nova compra
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Suspense fallback={null}>
          <SearchInput placeholder="Buscar por número de NF…" className="flex-1" />
        </Suspense>
        <Suspense fallback={null}>
          <StatusFilter />
        </Suspense>
      </div>

      {!purchases?.length ? (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag size={40} className="text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">
            {q || status ? "Nenhuma compra encontrada com esses filtros" : "Nenhuma compra registrada"}
          </p>
          {!q && !status && (
            <>
              <p className="text-slate-400 text-sm mt-1">Comece registrando sua primeira entrada de mercadoria</p>
              <Link
                href="/compras/nova"
                className="mt-4 flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                <Plus size={16} />
                Nova compra
              </Link>
            </>
          )}
        </div>
      ) : (
        <PurchasesTable purchases={purchases as Parameters<typeof PurchasesTable>[0]["purchases"]} />
      )}
    </div>
  );
}

