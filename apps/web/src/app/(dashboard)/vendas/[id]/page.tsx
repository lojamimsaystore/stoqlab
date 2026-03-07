import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { formatCurrency, formatDate } from "@stoqlab/utils";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro", pix: "Pix", debit: "Cartão de débito",
  credit: "Cartão de crédito", installment: "Parcelado",
};

export default async function VendaDetailPage({ params }: { params: { id: string } }) {
  const tenantId = await getTenantId();

  const { data: sale } = await supabaseAdmin
    .from("sales")
    .select("id, status, payment_method, channel, total_value, discount_value, gross_margin, notes, sold_at")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .single();

  if (!sale) notFound();

  const { data: items } = await supabaseAdmin
    .from("sale_items")
    .select("id, quantity, sale_price, discount, final_price, product_variants(color, size, sku, products(name))")
    .eq("sale_id", params.id);

  return (
    <div className="space-y-6 max-w-2xl">
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/vendas" className="hover:text-slate-700">Vendas</Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">{formatDate(sale.sold_at)}</span>
      </nav>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Data</p>
            <p className="font-medium text-slate-900 mt-0.5">{formatDate(sale.sold_at)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Pagamento</p>
            <p className="font-medium text-slate-900 mt-0.5">{PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total</p>
            <p className="font-bold text-emerald-700 mt-0.5">{formatCurrency(Number(sale.total_value))}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Margem</p>
            <p className="font-medium text-slate-900 mt-0.5">{sale.gross_margin ? `${sale.gross_margin}%` : "—"}</p>
          </div>
        </div>
        {Number(sale.discount_value) > 0 && (
          <p className="mt-3 text-sm text-red-600">Desconto: {formatCurrency(Number(sale.discount_value))}</p>
        )}
        {sale.notes && (
          <p className="mt-3 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{sale.notes}</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Itens ({items?.length ?? 0})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left border-b border-slate-100">
              <th className="px-4 py-3 font-medium text-slate-600">Produto</th>
              <th className="px-4 py-3 font-medium text-slate-600 text-center">Qtd.</th>
              <th className="px-4 py-3 font-medium text-slate-600 text-right">Preço unit.</th>
              <th className="px-4 py-3 font-medium text-slate-600 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(items ?? []).map((item) => {
              const v = item.product_variants as { color: string; size: string; sku: string; products: { name: string } | null } | null;
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{v?.products?.name ?? "—"}</p>
                    <p className="text-xs text-slate-500">{v?.color} · {v?.size}</p>
                  </td>
                  <td className="px-4 py-3 text-center">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(Number(item.sale_price))}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(Number(item.final_price) * item.quantity)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
