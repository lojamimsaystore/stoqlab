import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { formatCurrency, formatDate } from "@stoqlab/utils";
import { UploadInvoiceButton } from "./upload-invoice-button";

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

export default async function CompraDetailPage({ params }: { params: { id: string } }) {
  const tenantId = await getTenantId();

  const { data: purchase } = await supabaseAdmin
    .from("purchases")
    .select(`
      id, status, invoice_number, invoice_url, purchased_at, received_at,
      products_cost, freight_cost, other_costs, total_items, notes,
      suppliers(name, phone, email)
    `)
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .single();

  if (!purchase) notFound();

  const { data: items } = await supabaseAdmin
    .from("purchase_items")
    .select("id, quantity, unit_cost, real_unit_cost, product_variants(color, size, sku, products(name, categories(name)))")
    .eq("purchase_id", params.id);

  const total = Number(purchase.products_cost) + Number(purchase.freight_cost) + Number(purchase.other_costs);
  const supplier = purchase.suppliers as unknown as { name: string; phone?: string; email?: string } | null;

  return (
    <div className="space-y-6">
      <Link href="/compras" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} />
        Voltar
      </Link>

      {/* Cabeçalho */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {purchase.invoice_number ? `NF ${purchase.invoice_number}` : "Compra sem NF"}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">{formatDate(purchase.purchased_at)}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <UploadInvoiceButton purchaseId={purchase.id} hasInvoice={!!purchase.invoice_url} />
            {purchase.invoice_url && (
              <a
                href={purchase.invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                title="Ver nota fiscal"
              >
                <Eye size={13} />
                NF
              </a>
            )}
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[purchase.status] ?? ""}`}>
              {STATUS_LABEL[purchase.status]}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Fornecedor</p>
            <p className="font-medium text-slate-900 mt-0.5">{supplier?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Peças</p>
            <p className="font-medium text-slate-900 mt-0.5">{purchase.total_items}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total pago</p>
            <p className="font-semibold text-slate-900 mt-0.5">{formatCurrency(total)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Custo médio / peça</p>
            <p className="font-medium text-slate-900 mt-0.5">
              {purchase.total_items > 0 ? formatCurrency(total / purchase.total_items) : "—"}
            </p>
          </div>
        </div>

        {(Number(purchase.freight_cost) > 0 || Number(purchase.other_costs) > 0) && (
          <div className="mt-4 flex gap-6 text-xs text-slate-500">
            <span>Produtos: {formatCurrency(Number(purchase.products_cost))}</span>
            {Number(purchase.freight_cost) > 0 && (
              <span>Frete: {formatCurrency(Number(purchase.freight_cost))}</span>
            )}
            {Number(purchase.other_costs) > 0 && (
              <span>Outros: {formatCurrency(Number(purchase.other_costs))}</span>
            )}
          </div>
        )}

        {purchase.notes && (
          <p className="mt-3 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{purchase.notes}</p>
        )}
      </div>

      {/* Itens */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Itens ({items?.length ?? 0})</h2>
        </div>
        <table className="w-full text-sm">
          <caption className="sr-only">Itens da compra</caption>
          <thead>
            <tr className="bg-slate-50 text-left border-b border-slate-100">
              <th scope="col" className="px-4 py-3 font-medium text-slate-600">Produto / Variação</th>
              <th scope="col" className="px-4 py-3 font-medium text-slate-600 text-center">Qtd.</th>
              <th scope="col" className="px-4 py-3 font-medium text-slate-600 text-right">Custo unit.</th>
              <th scope="col" className="px-4 py-3 font-medium text-slate-600 text-right">Custo real</th>
              <th scope="col" className="px-4 py-3 font-medium text-slate-600 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(items ?? []).map((item) => {
              const variant = item.product_variants as unknown as { color: string; size: string; sku: string; products: { name: string; categories: { name: string } | null } | null } | null;
              const category = variant?.products?.categories?.name;
              return (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{variant?.products?.name ?? "—"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {category && (
                        <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{category}</span>
                      )}
                      <p className="text-xs text-slate-500">{variant?.color} · {variant?.size} · {variant?.sku}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{formatCurrency(Number(item.unit_cost))}</td>
                  <td className="px-4 py-3 text-right text-slate-500 text-xs">{formatCurrency(Number(item.real_unit_cost))}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(item.quantity * Number(item.unit_cost))}
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
