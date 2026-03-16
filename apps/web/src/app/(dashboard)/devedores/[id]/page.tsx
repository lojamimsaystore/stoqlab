import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { AddPaymentModal } from "./add-payment-modal";
import { IncreaseDebtModal } from "./increase-debt-modal";
import { DeleteDebtButton } from "./delete-debt-button";
import { DeletePaymentButton } from "./delete-payment-button";

const STATUS_LABEL: Record<string, string> = {
  open: "Em aberto",
  partial: "Parcialmente pago",
  paid: "Quitado",
};
const STATUS_COLOR: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-emerald-100 text-emerald-700",
};
const METHOD_LABEL: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  credit: "Cartão de crédito",
  debit: "Cartão de débito",
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

export default async function DevedorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = await getTenantId();

  const { data: debt } = await supabaseAdmin
    .from("debts")
    .select(`
      id, total_amount, status, description, notes, created_at,
      customers(id, name, phone),
      sales(id, sold_at, total_value),
      debt_payments(id, amount, payment_method, paid_at, notes, created_at)
    `)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!debt) notFound();

  const customer = debt.customers as unknown as { id: string; name: string; phone?: string } | null;
  const sale = debt.sales as unknown as { id: string; sold_at: string; total_value: string } | null;
  const payments = (debt.debt_payments as unknown as {
    id: string;
    amount: string;
    payment_method: string;
    paid_at: string;
    notes?: string;
  }[]) ?? [];

  const totalAmount = Number(debt.total_amount);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const remaining = totalAmount - totalPaid;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/devedores"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft size={15} />
            Devedores
          </Link>
          <h1 className="text-xl font-semibold text-slate-900 mt-1">{customer?.name ?? "—"}</h1>
          {customer?.phone && <p className="text-sm text-slate-500">{customer.phone}</p>}
        </div>
        <span className={`shrink-0 inline-block text-xs font-semibold px-3 py-1 rounded-full mt-1 ${STATUS_COLOR[debt.status] ?? ""}`}>
          {STATUS_LABEL[debt.status] ?? debt.status}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Total da dívida</p>
          <p className="text-lg font-bold text-slate-900">{fmt(totalAmount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Total pago</p>
          <p className="text-lg font-bold text-emerald-600">{fmt(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Restante</p>
          <p className={`text-lg font-bold ${remaining > 0 ? "text-red-600" : "text-emerald-600"}`}>
            {fmt(remaining)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {totalAmount > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Progresso do pagamento</span>
            <span>{Math.min(100, Math.round((totalPaid / totalAmount) * 100))}%</span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (totalPaid / totalAmount) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Info */}
      {(debt.description || debt.notes || sale) && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          {debt.description && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Descrição</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{debt.description}</p>
            </div>
          )}
          {debt.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Observações</p>
              <p className="text-sm text-slate-700">{debt.notes}</p>
            </div>
          )}
          {sale && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Venda vinculada</p>
              <Link href={`/vendas/${sale.id}`} className="text-sm text-blue-600 hover:text-blue-800">
                Venda de {fmtDate(sale.sold_at)} · {fmt(Number(sale.total_value))}
              </Link>
            </div>
          )}
          <p className="text-xs text-slate-400">Registrado em {fmtDate(debt.created_at)}</p>
        </div>
      )}

      {/* Payments history */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Histórico de pagamentos</h2>
          <span className="text-xs text-slate-400">{payments.length} {payments.length === 1 ? "pagamento" : "pagamentos"}</span>
        </div>
        {payments.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">
            Nenhum pagamento registrado ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2">Data</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2 hidden sm:table-cell">Forma</th>
                <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2">Valor</th>
                <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-2 hidden md:table-cell">Obs.</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{fmtDate(p.paid_at)}</td>
                  <td className="px-4 py-2 text-slate-500 hidden sm:table-cell">{METHOD_LABEL[p.payment_method] ?? p.payment_method}</td>
                  <td className="px-4 py-2 text-right font-semibold text-emerald-600">{fmt(Number(p.amount))}</td>
                  <td className="px-4 py-2 text-slate-400 text-xs hidden md:table-cell">{p.notes ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    <DeletePaymentButton paymentId={p.id} debtId={id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Actions */}
      {debt.status !== "paid" && (
        <div className="flex flex-wrap gap-3">
          <AddPaymentModal debtId={id} remaining={remaining} />
          <IncreaseDebtModal debtId={id} />
        </div>
      )}

      {/* Delete */}
      <div className="pt-2 border-t border-slate-200 flex justify-end">
        <DeleteDebtButton debtId={id} />
      </div>
    </div>
  );
}
