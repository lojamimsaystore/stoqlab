"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@stoqlab/utils";
import { bulkCancelSalesAction } from "./actions";
import { CancelSaleButton } from "./cancel-sale-button";
import { PrintReceiptButton } from "./print-receipt-button";

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

type Sale = {
  id: string;
  status: string;
  payment_method: string;
  channel: string;
  total_value: string;
  discount_value: string;
  gross_margin: string | null;
  sold_at: string;
  notes: string | null;
  customers: { name: string }[] | null;
  locations: { name: string } | null;
};

export function SalesTable({ sales }: { sales: Sale[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const hasSelection = selected.size > 0;
  const allSelected = sales.length > 0 && selected.size === sales.length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(sales.map((s) => s.id)));
  }

  function clearSelection() {
    setSelected(new Set());
    setConfirmOpen(false);
  }

  function handleBulkDelete() {
    startTransition(async () => {
      const ids = Array.from(selected);
      const result = await bulkCancelSalesAction(ids);
      const skipped = ids.length - result.deleted;
      if (result.deleted > 0) {
        toast.success(
          skipped > 0
            ? `${result.deleted} venda${result.deleted !== 1 ? "s" : ""} cancelada${result.deleted !== 1 ? "s" : ""}. ${skipped} não pôde${skipped !== 1 ? "ram" : ""} ser cancelada${skipped !== 1 ? "s" : ""}.`
            : `${result.deleted} venda${result.deleted !== 1 ? "s" : ""} cancelada${result.deleted !== 1 ? "s" : ""} com sucesso.`
        );
      } else {
        toast.error("Nenhuma venda pôde ser cancelada.");
      }
      setSelected(new Set());
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {/* Barra de seleção */}
      {hasSelection && (
        <div className="flex items-center gap-3 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-lg">
          <button type="button" onClick={clearSelection} className="p-1 rounded hover:bg-blue-500 transition" title="Limpar seleção">
            <X size={15} />
          </button>
          <span className="text-sm font-medium flex-1">
            {selected.size} venda{selected.size !== 1 ? "s" : ""} selecionada{selected.size !== 1 ? "s" : ""}
          </span>
          <button type="button" onClick={toggleAll} className="text-xs font-medium text-blue-200 hover:text-white transition">
            {allSelected ? "Desmarcar todas" : "Selecionar todas"}
          </button>
          {!confirmOpen ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <Trash2 size={13} />
              Cancelar selecionadas
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-100">Confirmar cancelamento?</span>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isPending}
                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                <Check size={12} />
                {isPending ? "Cancelando…" : "Sim, cancelar"}
              </button>
              <button type="button" onClick={() => setConfirmOpen(false)} className="text-xs text-blue-200 hover:text-white font-medium transition">
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {sales.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-slate-400">
            <p className="text-sm font-medium text-slate-500">Nenhuma venda encontrada</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer accent-blue-600"
                    title={allSelected ? "Desmarcar todas" : "Selecionar todas"}
                  />
                </th>
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
              {sales.map((s) => {
                const customer = (s.customers as unknown as Array<{ name: string }> | null)?.[0] ?? null;
                const location = s.locations as unknown as { name: string } | null;
                const installmentLabel = parseInstallments(s.notes ?? null);
                const isSelected = selected.has(s.id);

                return (
                  <tr key={s.id} className={`transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(s.id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer accent-blue-600"
                      />
                    </td>
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
                        {!hasSelection && s.status === "completed" && <CancelSaleButton id={s.id} />}
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
