import Link from "next/link";
import { Plus, AlertCircle } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";

const STATUS_LABEL: Record<string, string> = {
  open: "Em aberto",
  partial: "Parcial",
  paid: "Quitado",
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-emerald-100 text-emerald-700",
};

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function DevedoresPage() {
  const tenantId = await getTenantId();

  const { data: debts } = await supabaseAdmin
    .from("debts")
    .select(`
      id, total_amount, status, description, created_at,
      customers(id, name, phone),
      debt_payments(amount)
    `)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const rows = (debts ?? []).map((d) => {
    const totalAmount = Number(d.total_amount);
    const payments = (d.debt_payments as { amount: string }[] | null) ?? [];
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const remaining = totalAmount - totalPaid;
    const customer = d.customers as unknown as { id: string; name: string; phone?: string } | null;
    return { ...d, totalAmount, totalPaid, remaining, customer };
  });

  const totalOpen = rows.filter((r) => r.status !== "paid").reduce((s, r) => s + r.remaining, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Devedores</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {rows.filter((r) => r.status !== "paid").length} dívida
            {rows.filter((r) => r.status !== "paid").length !== 1 ? "s" : ""} em aberto
            {" · "}
            <span className="text-red-600 font-medium">{formatCurrency(totalOpen)} a receber</span>
          </p>
        </div>
        <Link
          href="/devedores/nova"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={16} />
          Nova dívida
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle size={40} className="text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">Nenhuma dívida registrada</p>
          <p className="text-slate-400 text-sm mt-1">
            Registre dívidas de clientes clicando em <span className="font-medium text-slate-500">Nova dívida</span>
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Cliente</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden sm:table-cell">Descrição</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Total</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Pago</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Restante</th>
                <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{row.customer?.name ?? "—"}</p>
                    {row.customer?.phone && (
                      <p className="text-xs text-slate-400">{row.customer.phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-slate-600 text-xs line-clamp-1">{row.description ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(row.totalAmount)}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600 hidden md:table-cell">
                    {formatCurrency(row.totalPaid)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-600">
                    {formatCurrency(row.remaining)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[row.status] ?? ""}`}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/devedores/${row.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
