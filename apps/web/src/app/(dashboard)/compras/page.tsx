import Link from "next/link";
import { Plus, ShoppingBag, Download, Eye } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { formatCurrency, formatDate } from "@stoqlab/utils";
import { DeletePurchaseButton } from "./delete-purchase-button";
import { SearchInput } from "@/components/ui/search-input";
import { StatusFilter } from "./status-filter";
import { Suspense } from "react";

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  confirmed: "Confirmada",
  received: "Recebida",
  cancelled: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  confirmed: "bg-blue-100 text-blue-700",
  received: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-3 font-medium text-slate-600">Data</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Fornecedor</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">NF</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-center">Peças</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Total</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((p) => {
                const total =
                  Number(p.products_cost) + Number(p.freight_cost) + Number(p.other_costs);
                const supplier = (p.suppliers as unknown as Array<{ name: string }> | null)?.[0] ?? null;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-700">{formatDate(p.purchased_at)}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-700">
                      {supplier?.name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-mono text-xs">{p.invoice_number ?? "—"}</span>
                        {p.invoice_url && (
                          <a
                            href={p.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Baixar nota fiscal"
                            aria-label="Baixar nota fiscal"
                            className="text-slate-400 hover:text-blue-600 transition"
                          >
                            <Download size={12} />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">{p.total_items}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatCurrency(total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[p.status] ?? ""}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/compras/${p.id}`}
                          title="Ver compra"
                          aria-label="Ver detalhes da compra"
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded"
                        >
                          <Eye size={15} />
                        </Link>
                        <DeletePurchaseButton id={p.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

