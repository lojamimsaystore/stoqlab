import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { formatDate } from "@stoqlab/utils";

export default async function TransferenciaDetailPage({ params }: { params: { id: string } }) {
  const tenantId = await getTenantId();

  const { data: transfer } = await supabaseAdmin
    .from("stock_transfers")
    .select(`id, status, requested_at, received_at, notes,
      from_location:from_location_id(name),
      to_location:to_location_id(name)`)
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single();

  if (!transfer) notFound();

  const { data: items } = await supabaseAdmin
    .from("transfer_items")
    .select("id, quantity, product_variants(color, size, sku, products(name))")
    .eq("transfer_id", params.id);

  const from = transfer.from_location as { name: string } | null;
  const to = transfer.to_location as { name: string } | null;

  return (
    <div className="space-y-6 max-w-2xl">
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/transferencias" className="hover:text-slate-700">Transferências</Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">{formatDate(transfer.requested_at)}</span>
      </nav>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
          <span>{from?.name}</span>
          <span className="text-slate-400">→</span>
          <span>{to?.name}</span>
        </div>
        <div className="flex gap-6 text-sm text-slate-500">
          <span>Data: {formatDate(transfer.requested_at)}</span>
          {transfer.received_at && <span>Recebido: {formatDate(transfer.received_at)}</span>}
        </div>
        {transfer.notes && <p className="text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">{transfer.notes}</p>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Itens transferidos ({items?.length ?? 0})</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left border-b border-slate-100">
              <th className="px-4 py-3 font-medium text-slate-600">Produto</th>
              <th className="px-4 py-3 font-medium text-slate-600">Variação</th>
              <th className="px-4 py-3 font-medium text-slate-600 text-center">Qtd.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(items ?? []).map((item) => {
              const v = item.product_variants as { color: string; size: string; sku: string; products: { name: string } | null } | null;
              return (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{v?.products?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{v?.color} · {v?.size}</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-900">{item.quantity}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
