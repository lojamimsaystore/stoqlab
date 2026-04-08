"use client";

import { useState } from "react";
import { Pencil, Search } from "lucide-react";
import { AdjustModal } from "./adjust-modal";

type InventoryRow = {
  id: string;
  variantId: string;
  color: string;
  size: string;
  sku: string;
  productName: string;
  categoryName: string | null;
  locationId: string;
  locationName: string;
  quantity: number;
  minStock: number;
};

export function EstoqueTable({ rows, lowStockThreshold = 5 }: { rows: InventoryRow[]; lowStockThreshold?: number }) {
  const [search, setSearch] = useState("");
  const [filterLow, setFilterLow] = useState(false);
  const [filterLocation, setFilterLocation] = useState("");
  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);

  const isLowStock = (qty: number) => qty >= 1 && qty <= lowStockThreshold;

  // Locais únicos derivados das linhas
  const locations = Array.from(
    new Map(rows.map((r) => [r.locationId, r.locationName])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const filtered = rows.filter((r) => {
    const matchSearch =
      !search ||
      r.productName.toLowerCase().includes(search.toLowerCase()) ||
      r.sku.toLowerCase().includes(search.toLowerCase()) ||
      r.color.toLowerCase().includes(search.toLowerCase());
    const matchLow = !filterLow || isLowStock(r.quantity);
    const matchLocation = !filterLocation || r.locationId === filterLocation;
    return matchSearch && matchLow && matchLocation;
  });

  const lowCount = filtered.filter((r) => isLowStock(r.quantity)).length;
  const zeroCount = filtered.filter((r) => r.quantity === 0).length;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto, SKU ou cor..."
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {locations.length > 1 && (
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            <option value="">Todos os locais</option>
            {locations.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => setFilterLow(!filterLow)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition ${
            filterLow
              ? "bg-amber-50 border-amber-300 text-amber-700"
              : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}
        >
          ⚠️ Estoque baixo ({lowCount})
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-slate-900">{rows.reduce((s, r) => s + r.quantity, 0)}</p>
          <p className="text-xs text-slate-500 mt-0.5">Total em estoque</p>
        </div>
        <div className={`bg-white rounded-lg border px-4 py-3 text-center ${lowCount > 0 ? "border-amber-200" : "border-slate-200"}`}>
          <p className={`text-2xl font-bold ${lowCount > 0 ? "text-amber-600" : "text-slate-900"}`}>{lowCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Estoque baixo</p>
        </div>
        <div className={`bg-white rounded-lg border px-4 py-3 text-center ${zeroCount > 0 ? "border-red-200" : "border-slate-200"}`}>
          <p className={`text-2xl font-bold ${zeroCount > 0 ? "text-red-500" : "text-slate-900"}`}>{zeroCount}</p>
          <p className="text-xs text-slate-500 mt-0.5">Zerados</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            {search || filterLow ? "Nenhum resultado encontrado" : "Nenhum item em estoque"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-3 font-medium text-slate-600">Produto</th>
                <th className="px-4 py-3 font-medium text-slate-600">Variação</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">SKU</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Local</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-center">Qtd.</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => {
                const isLow = isLowStock(row.quantity);
                const isZero = row.quantity === 0;
                return (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.productName}</p>
                      {row.categoryName && (
                        <p className="text-xs text-slate-400">{row.categoryName}</p>
                      )}
                      {/* Local visível só em mobile — coluna "Local" some em telas pequenas */}
                      <p className="text-xs text-slate-400 md:hidden mt-0.5">{row.locationName}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.color} · {row.size}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-500 font-mono text-xs">
                      {row.sku}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                      {row.locationName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block font-semibold px-2 py-0.5 rounded text-sm ${
                          isZero
                            ? "bg-red-100 text-red-600"
                            : isLow
                            ? "bg-amber-100 text-amber-700"
                            : "text-slate-900"
                        }`}
                      >
                        {row.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setAdjusting(row)}
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                        title="Ajustar estoque"
                      >
                        <Pencil size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {adjusting && (
        <AdjustModal
          variant={adjusting}
          onClose={() => setAdjusting(null)}
        />
      )}
    </div>
  );
}
