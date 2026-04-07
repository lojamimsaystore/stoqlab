"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Download, Pencil, Trash2, X, Check, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@stoqlab/utils";
import { bulkDeletePurchasesAction } from "./actions";
import { DeletePurchaseButton } from "./delete-purchase-button";
import { PurchaseStatusSelect } from "./purchase-status-select";

type Purchase = {
  id: string;
  status: string;
  invoice_number: string | null;
  invoice_url: string | null;
  purchased_at: string;
  total_items: number;
  products_cost: string;
  freight_cost: string;
  other_costs: string;
  suppliers: { name: string } | null;
};

type SortField = "purchased_at" | "suppliers" | "total_items" | "total";
type SortDir = "asc" | "desc";

export function PurchasesTable({ purchases }: { purchases: Purchase[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronsUpDown size={12} className="ml-1 text-slate-300 inline" />;
    return sortDir === "asc"
      ? <ChevronUp size={12} className="ml-1 text-blue-500 inline" />
      : <ChevronDown size={12} className="ml-1 text-blue-500 inline" />;
  }

  const sortedPurchases = [...purchases].sort((a, b) => {
    if (!sortField) return 0;
    const mul = sortDir === "asc" ? 1 : -1;
    if (sortField === "purchased_at") return mul * a.purchased_at.localeCompare(b.purchased_at);
    if (sortField === "suppliers") {
      const aName = (a.suppliers as unknown as { name: string } | null)?.name ?? "";
      const bName = (b.suppliers as unknown as { name: string } | null)?.name ?? "";
      return mul * aName.localeCompare(bName);
    }
    if (sortField === "total_items") return mul * (a.total_items - b.total_items);
    if (sortField === "total") {
      const aT = Number(a.products_cost) + Number(a.freight_cost) + Number(a.other_costs);
      const bT = Number(b.products_cost) + Number(b.freight_cost) + Number(b.other_costs);
      return mul * (aT - bT);
    }
    return 0;
  });

  const hasSelection = selected.size > 0;
  const allSelected = purchases.length > 0 && selected.size === purchases.length;

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
    else setSelected(new Set(purchases.map((p) => p.id)));
  }

  function clearSelection() {
    setSelected(new Set());
    setConfirmOpen(false);
  }

  function handleBulkDelete() {
    startTransition(async () => {
      const ids = Array.from(selected);
      const result = await bulkDeletePurchasesAction(ids);
      const skipped = ids.length - result.deleted;
      if (result.deleted > 0) {
        toast.success(
          skipped > 0
            ? `${result.deleted} compra${result.deleted !== 1 ? "s" : ""} removida${result.deleted !== 1 ? "s" : ""}. ${skipped} não pôde${skipped !== 1 ? "ram" : ""} ser removida${skipped !== 1 ? "s" : ""}.`
            : `${result.deleted} compra${result.deleted !== 1 ? "s" : ""} removida${result.deleted !== 1 ? "s" : ""} com sucesso.`
        );
      } else {
        toast.error("Nenhuma compra pôde ser removida.");
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
            {selected.size} compra{selected.size !== 1 ? "s" : ""} selecionada{selected.size !== 1 ? "s" : ""}
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
              Excluir selecionadas
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-100">Confirmar exclusão?</span>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isPending}
                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition"
              >
                <Check size={12} />
                {isPending ? "Removendo…" : "Sim, excluir"}
              </button>
              <button type="button" onClick={() => setConfirmOpen(false)} className="text-xs text-blue-200 hover:text-white font-medium transition">
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
              <th className="px-4 py-3 font-medium text-slate-600 cursor-pointer select-none" onClick={() => handleSort("purchased_at")}>
                Data <SortIcon field="purchased_at" />
              </th>
              <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell cursor-pointer select-none" onClick={() => handleSort("suppliers")}>
                Fornecedor <SortIcon field="suppliers" />
              </th>
              <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">NF</th>
              <th className="px-4 py-3 font-medium text-slate-600 text-center cursor-pointer select-none" onClick={() => handleSort("total_items")}>
                Peças <SortIcon field="total_items" />
              </th>
              <th className="px-4 py-3 font-medium text-slate-600 text-right cursor-pointer select-none" onClick={() => handleSort("total")}>
                Total <SortIcon field="total" />
              </th>
              <th className="px-4 py-3 font-medium text-slate-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedPurchases.map((p) => {
              const total = Number(p.products_cost) + Number(p.freight_cost) + Number(p.other_costs);
              const supplier = p.suppliers as unknown as { name: string } | null;
              const isSelected = selected.has(p.id);

              return (
                <tr
                  key={p.id}
                  className={`transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(p.id)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 cursor-pointer accent-blue-600"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(p.purchased_at)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-700">
                    {supplier?.name ?? <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-mono text-xs">{p.invoice_number ?? "—"}</span>
                      {p.invoice_url && (
                        <a href={p.invoice_url} target="_blank" rel="noopener noreferrer"
                          title="Baixar nota fiscal" aria-label="Baixar nota fiscal"
                          className="text-slate-400 hover:text-blue-600 transition">
                          <Download size={12} />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700">{p.total_items}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(total)}</td>
                  <td className="px-4 py-3">
                    <PurchaseStatusSelect id={p.id} status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/compras/${p.id}`} title="Ver compra" aria-label="Ver detalhes da compra"
                        className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded">
                        <Eye size={15} />
                      </Link>
                      {!hasSelection && (
                        <Link href={`/compras/${p.id}/editar`} title="Editar compra" aria-label="Editar compra"
                          className="text-slate-400 hover:text-amber-600 transition-colors p-1 rounded">
                          <Pencil size={15} />
                        </Link>
                      )}
                      {!hasSelection && <DeletePurchaseButton id={p.id} />}
                    </div>
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
