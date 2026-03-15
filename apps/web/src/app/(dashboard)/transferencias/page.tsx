import Link from "next/link";
import { Plus, ArrowLeftRight, Eye } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { formatDate } from "@stoqlab/utils";
import { AddLocationForm } from "./add-location-form";
import { DeleteTransferButton } from "./delete-transfer-button";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", in_transit: "Em trânsito", received: "Recebida", cancelled: "Cancelada",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  in_transit: "bg-blue-100 text-blue-700",
  received: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

export default async function TransferenciasPage() {
  const tenantId = await getTenantId();

  const [{ data: transfers }, { data: locations }] = await Promise.all([
    supabaseAdmin
      .from("stock_transfers")
      .select(`id, status, requested_at, notes,
        from_location:from_location_id(name),
        to_location:to_location_id(name)`)
      .eq("tenant_id", tenantId)
      .order("requested_at", { ascending: false }),
    supabaseAdmin
      .from("locations")
      .select("id, name, type")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Transferências</h1>
          <p className="text-sm text-slate-500 mt-1">Movimentação de estoque entre lojas e depósitos.</p>
        </div>
        <Link href="/transferencias/nova"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus size={16} />
          Nova transferência
        </Link>
      </div>

      {/* Localizações cadastradas */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-3 text-sm">
          Localizações ({locations?.length ?? 0})
        </h2>
        {(locations ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {locations!.map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                {l.type === "store" ? "🏪" : "🏭"} {l.name}
              </span>
            ))}
          </div>
        )}
        <AddLocationForm />
      </div>

      {/* Lista de transferências */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {!transfers?.length ? (
          <div className="py-16 flex flex-col items-center gap-2 text-slate-400">
            <ArrowLeftRight size={36} className="text-slate-300" />
            <p className="text-sm">Nenhuma transferência registrada</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-3 font-medium text-slate-600">Data</th>
                <th className="px-4 py-3 font-medium text-slate-600">Origem → Destino</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Observação</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transfers.map((t) => {
                const from = t.from_location as unknown as { name: string } | null;
                const to = t.to_location as unknown as { name: string } | null;
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{formatDate(t.requested_at)}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{from?.name}</span>
                      <span className="text-slate-400 mx-2">→</span>
                      <span className="font-medium text-slate-900">{to?.name}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{t.notes ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status] ?? ""}`}>
                        {STATUS_LABEL[t.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/transferencias/${t.id}`} title="Ver transferência" aria-label="Ver detalhes da transferência"
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded inline-flex">
                          <Eye size={15} />
                        </Link>
                        <DeleteTransferButton transferId={t.id} />
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
