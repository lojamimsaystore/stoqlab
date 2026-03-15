import Link from "next/link";
import { Plus, ShoppingBag, Eye } from "lucide-react";
import { PrintReceiptButton } from "./print-receipt-button";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { formatCurrency, formatDate } from "@stoqlab/utils";
import { CancelSaleButton } from "./cancel-sale-button";
import { SearchInput } from "@/components/ui/search-input";
import { StatusFilter } from "./status-filter";
import { Suspense } from "react";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  debit: "Débito",
  credit: "Crédito",
  installment: "Parcelado",
};

function parseInstallments(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/^(\d+)x (com|sem) juros/);
  if (!match) return null;
  return `${match[1]}x ${match[2] === "com" ? "c/ juros" : "s/ juros"}`;
}

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

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const tenantId = await getTenantId();
  const { q, status } = await searchParams;

  let query = supabaseAdmin
    .from("sales")
    .select("id, status, payment_method, channel, total_value, discount_value, gross_margin, sold_at, notes, customers(name), locations(name)")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("sold_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (q) {
    query = query.or(`payment_method.ilike.%${q}%,customers.name.ilike.%${q}%`);
  }

  const { data: sales } = await query;
  const filtered = sales ?? [];

  const now = new Date();
  const totalMes = (sales ?? [])
    .filter((s) => {
      const d = new Date(s.sold_at);
      return s.status === "completed" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, s) => sum + Number(s.total_value), 0);

  const totalConcluidas = (sales ?? []).filter((s) => s.status === "completed").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vendas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Histórico de vendas realizadas.</p>
        </div>
        <Link
          href="/vendas/nova"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={16} />
          Nova venda
        </Link>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Vendas no mês</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalMes)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Concluídas</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalConcluidas}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Suspense fallback={null}>
          <SearchInput placeholder="Buscar por cliente ou método de pagamento…" className="flex-1" />
        </Suspense>
        <Suspense fallback={null}>
          <StatusFilter />
        </Suspense>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {!filtered.length ? (
          <div className="py-16 flex flex-col items-center gap-2 text-slate-400">
            <ShoppingBag size={36} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              {q || status ? "Nenhuma venda encontrada com esses filtros" : "Nenhuma venda registrada"}
            </p>
            {!q && !status && (
              <Link href="/vendas/nova" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-1">
                Registrar primeira venda
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-3 font-medium text-slate-600">Data</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Cliente</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Pagamento</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden xl:table-cell">Parcelas</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Local</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden lg:table-cell">Desconto</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Total</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell text-right">Margem</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((s) => {
                const customer = (s.customers as unknown as Array<{ name: string }> | null)?.[0] ?? null;
                const location = s.locations as unknown as { name: string } | null;
                const installmentLabel = parseInstallments(s.notes ?? null);
                return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-700">{formatDate(s.sold_at)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-700">
                    {customer?.name ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600">
                    {PAYMENT_LABELS[s.payment_method] ?? s.payment_method}
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-slate-500 text-xs">
                    {installmentLabel ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-500 text-xs">
                    {location?.name ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-500">
                    {Number(s.discount_value) > 0 ? formatCurrency(Number(s.discount_value)) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatCurrency(Number(s.total_value))}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-right text-emerald-600 font-medium">
                    {s.gross_margin ? `${Number(s.gross_margin).toFixed(1)}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status] ?? ""}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <PrintReceiptButton id={s.id} />
                      <Link href={`/vendas/${s.id}`} title="Ver venda" aria-label="Ver detalhes da venda"
                        className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded inline-flex">
                        <Eye size={15} />
                      </Link>
                      {s.status === "completed" && <CancelSaleButton id={s.id} />}
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
