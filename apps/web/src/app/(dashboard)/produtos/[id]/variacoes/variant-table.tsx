"use client";

import { Trash2, Layers } from "lucide-react";
import { formatCurrency } from "@stoqlab/utils";
import { deleteVariantAction } from "../../actions";

type Variant = {
  id: string;
  size: string;
  color: string;
  color_hex: string | null;
  sku: string;
  barcode: string | null;
  sale_price: string | null;
  min_stock: number;
};

export function VariantTable({
  variants,
  productId,
}: {
  variants: Variant[];
  productId: string;
}) {
  if (variants.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-10 text-center">
        <Layers size={32} className="text-slate-300 mb-3" />
        <p className="text-slate-500 text-sm font-medium">Nenhuma variação ainda</p>
        <p className="text-slate-400 text-xs mt-1">
          Adicione tamanhos e cores abaixo
        </p>
      </div>
    );
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Remover variação "${label}"?`)) return;
    await deleteVariantAction(id, productId);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <p className="text-sm font-medium text-slate-700">
          {variants.length} varia{variants.length !== 1 ? "ções" : "ção"} cadastrada{variants.length !== 1 ? "s" : ""}
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left">
            <th className="px-4 py-3 font-medium text-slate-600">Cor / Tamanho</th>
            <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">SKU</th>
            <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Preço</th>
            <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Estoque mín.</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {variants.map((v) => (
            <tr key={v.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {v.color_hex && (
                    <span
                      className="w-4 h-4 rounded-full border border-slate-200 shrink-0"
                      style={{ backgroundColor: v.color_hex }}
                    />
                  )}
                  <span className="font-medium text-slate-900">{v.color}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">{v.size}</span>
                </div>
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-slate-500 font-mono text-xs">
                {v.sku}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-slate-700">
                {v.sale_price ? formatCurrency(Number(v.sale_price)) : "—"}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                {v.min_stock}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleDelete(v.id, `${v.color} ${v.size}`)}
                  className="text-red-400 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
