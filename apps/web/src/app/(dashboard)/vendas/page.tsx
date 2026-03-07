import Link from "next/link";
import { Plus, ShoppingBag } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { formatCurrency, formatDate } from "@stoqlab/utils";
import { CancelSaleButton } from "./cancel-sale-button";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  debit: "Débito",
  credit: "Crédito",
  installment: "Parcelado",
};

const STATUS_COLOR: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-600",
  refunded: "bg-slate-100 text-slate-600",
};

const STATUS_LABEL: Record<string, string> = {
  completed: "Concluída",
  pending: "Pendente",
  cancelled: "Cancelada",
  refunded: "Estornada",
};

export default async function VendasPage() {
  const tenantId = await getTenantId();

  const { data: sales } = await supabaseAdmin
    .from("sales")
    .select("id, status, payment_method, channel, total_value, discount_value, gross_margin, sold_at")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("sold_at", { ascending: false });

  const totalMes = (sales ?? [])
    .filter((s) => {
      const d = new Date(s.sold_at);
      const now = new Date();
      return s.status === "completed" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, s) => sum + Number(s.total_value), 0);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vendas</h1>
          <p className="text-sm text-slate-500 mt-1">Histórico de vendas realizadas.</p>
        </div>
        <Link
          href="/vendas/nova"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={16} />
          Nova venda
        </Link>
      </div>

      {/* Card resumo do mês */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Vendas no mês</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalMes)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total de vendas</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {(sales ?? []).filter((s) => s.status === "completed").length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {!sales?.length ? (
          <div className="py-16 flex flex-col items-center gap-2 text-slate-400">
            <ShoppingBag size={36} className="text-slate-300" />
            <p className="text-sm">Nenhuma venda registrada</p>
            <Link href="/vendas/nova" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-1">
              Registrar primeira venda
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-3 font-medium text-slate-600">Data</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Pagamento</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Desconto</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Total</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell text-right">Margem</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{formatDate(s.sold_at)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-600">
                    {PAYMENT_LABELS[s.payment_method] ?? s.payment_method}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                    {Number(s.discount_value) > 0 ? formatCurrency(Number(s.discount_value)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(Number(s.total_value))}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-right text-slate-500">
                    {s.gross_margin ? `${s.gross_margin}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status] ?? ""}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/vendas/${s.id}`} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        Ver
                      </Link>
                      {s.status === "completed" && <CancelSaleButton id={s.id} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
