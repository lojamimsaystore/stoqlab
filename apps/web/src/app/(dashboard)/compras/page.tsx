import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { formatCurrency, formatDate } from "@stoqlab/utils";
import { DeletePurchaseButton } from "./delete-purchase-button";

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

export default async function ComprasPage() {
  const tenantId = await getTenantId();

  const { data: purchases } = await supabaseAdmin
    .from("purchases")
    .select("id, status, invoice_number, purchased_at, total_items, products_cost, freight_cost, other_costs, suppliers(name)")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("purchased_at", { ascending: false });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Compras</h1>
          <p className="text-sm text-slate-500 mt-1">Registro de entradas de mercadoria.</p>
        </div>
        <Link
          href="/compras/nova"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={16} />
          Nova compra
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {!purchases?.length ? (
          <div className="py-16 flex flex-col items-center gap-2 text-slate-400">
            <ShoppingCart size={36} className="text-slate-300" />
            <p className="text-sm">Nenhuma compra registrada</p>
            <Link href="/compras/nova" className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1">
              Registrar primeira compra
            </Link>
          </div>
        ) : (
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
                const supplier = p.suppliers as { name: string } | null;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(p.purchased_at)}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-700">
                      {supplier?.name ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500 font-mono text-xs">
                      {p.invoice_number ?? "—"}
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
                        <Link href={`/compras/${p.id}`} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                          Ver
                        </Link>
                        <DeletePurchaseButton id={p.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
