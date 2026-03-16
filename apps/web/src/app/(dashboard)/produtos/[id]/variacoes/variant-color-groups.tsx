"use client";

import { useState, useTransition } from "react";
import { Layers, Trash2, QrCode, Barcode, Check, Loader2 } from "lucide-react";
import { deleteVariantAction, updateVariantsSalePriceAction } from "../../actions";
import { formatCurrency } from "@stoqlab/utils";
import { toast } from "sonner";
import { CodeModal } from "./code-modal";

type Variant = {
  id: string;
  size: string;
  color: string;
  color_hex: string | null;
  sku: string;
  sale_price: string | null;
  min_stock: number;
};

type ColorGroup = {
  color: string;
  color_hex: string | null;
  variants: Variant[];
};

type CodeModalState = {
  open: boolean;
  type: "qr" | "barcode";
  sku: string;
  label: string;
};

// Linhas de um grupo de cor — gerencia o estado de margem do grupo
function ColorGroupRows({
  group,
  costMap,
  stockMap,
  productId,
  onOpenCode,
  onDelete,
}: {
  group: ColorGroup;
  costMap: Record<string, number>;
  stockMap: Record<string, number>;
  productId: string;
  onOpenCode: (type: "qr" | "barcode", sku: string, label: string) => void;
  onDelete: (id: string, label: string) => void;
}) {
  const costs = group.variants.map((v) => costMap[v.id]).filter((c) => c !== undefined);
  const avgCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : null;

  const currentSalePrice = group.variants.find((v) => v.sale_price)?.sale_price ?? null;
  const initialMarkup =
    avgCost && currentSalePrice
      ? Math.round(((Number(currentSalePrice) - avgCost) / avgCost) * 100)
      : 0;

  const initialMarkupStr = initialMarkup > 0 ? String(initialMarkup) : "";
  const [markup, setMarkup] = useState(initialMarkupStr);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  const markupNum = parseFloat(markup.replace(",", ".")) || 0;
  const finalPrice = avgCost ? avgCost * (1 + markupNum / 100) : null;
  const profit = avgCost && finalPrice ? finalPrice - avgCost : null;

  function handleMarkupChange(value: string) {
    setMarkup(value);
    setIsDirty(value !== initialMarkupStr);
  }

  function handleSave() {
    if (!finalPrice) return;
    const ids = group.variants.map((v) => v.id);
    startTransition(async () => {
      const result = await updateVariantsSalePriceAction(ids, productId, finalPrice);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Preço de ${group.color} atualizado para ${formatCurrency(finalPrice)}`);
        setIsDirty(false);
      }
    });
  }

  return (
    <>
      {group.variants.map((v, i) => {
        const qty = stockMap[v.id] ?? 0;
        const totalProfit = profit !== null ? profit * qty : null;

        return (
          <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            {/* Cor — só aparece na primeira linha do grupo */}
            <td className="px-4 py-2.5 whitespace-nowrap">
              {i === 0 ? (
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full border border-slate-200 shrink-0"
                    style={{ backgroundColor: group.color_hex ?? "#94a3b8" }}
                  />
                  <span className="text-xs font-medium text-slate-700">{group.color}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-300 pl-5">↳</span>
              )}
            </td>

            {/* Tamanho */}
            <td className="px-4 py-2.5 text-xs font-bold text-slate-800">{v.size}</td>

            {/* Peças */}
            <td className="px-4 py-2.5">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                qty > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-500"
              }`}>
                {qty}
              </span>
            </td>

            {/* SKU */}
            <td className="px-4 py-2.5 text-xs font-mono text-slate-400">{v.sku}</td>

            {/* Custo unitário */}
            <td className="px-4 py-2.5 text-xs text-slate-600">
              {avgCost !== null ? formatCurrency(avgCost) : <span className="text-slate-300">—</span>}
            </td>

            {/* Margem — input apenas na primeira linha, valor nas demais */}
            <td className="px-4 py-2.5">
              {i === 0 ? (
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min="0"
                    max="9999"
                    value={markup}
                    onChange={(e) => handleMarkupChange(e.target.value)}
                    placeholder="0"
                    className={`w-16 text-xs font-semibold text-slate-700 bg-white border rounded px-1.5 py-0.5 outline-none focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors ${
                      isDirty ? "border-amber-400 bg-amber-50" : "border-slate-200"
                    }`}
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500">{markup || "0"}%</span>
              )}
            </td>

            {/* Valor final */}
            <td className="px-4 py-2.5">
              <span className={`text-xs font-semibold ${finalPrice ? "text-blue-600" : "text-slate-300"}`}>
                {finalPrice ? formatCurrency(finalPrice) : "—"}
              </span>
            </td>

            {/* Lucro */}
            <td className="px-4 py-2.5">
              <span className={`text-xs font-semibold ${profit !== null ? "text-emerald-600" : "text-slate-300"}`}>
                {profit !== null ? formatCurrency(profit) : "—"}
              </span>
            </td>

            {/* Lucro total */}
            <td className="px-4 py-2.5">
              <span className={`text-xs font-semibold ${totalProfit !== null ? "text-emerald-600" : "text-slate-300"}`}>
                {totalProfit !== null ? formatCurrency(totalProfit) : "—"}
              </span>
            </td>

            {/* Ações */}
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-1">
                {i === 0 && isDirty && finalPrice && (
                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    title="Salvar preço"
                    className="p-1 rounded text-emerald-500 hover:text-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {isPending
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Check size={13} />
                    }
                  </button>
                )}
                <button
                  onClick={() => onOpenCode("qr", v.sku, `${v.color} ${v.size}`)}
                  title="QR Code"
                  className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <QrCode size={13} />
                </button>
                <button
                  onClick={() => onOpenCode("barcode", v.sku, `${v.color} ${v.size}`)}
                  title="Código de Barras"
                  className="p-1 rounded text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Barcode size={13} />
                </button>
                <button
                  onClick={() => onDelete(v.id, `${v.color} ${v.size}`)}
                  title="Remover"
                  className="p-1 rounded text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </td>
          </tr>
        );
      })}
    </>
  );
}

export function VariantColorGroups({
  variants,
  stockMap,
  costMap,
  productId,
}: {
  variants: Variant[];
  stockMap: Record<string, number>;
  costMap: Record<string, number>;
  productId: string;
}) {
  const [codeModal, setCodeModal] = useState<CodeModalState>({
    open: false,
    type: "qr",
    sku: "",
    label: "",
  });

  if (variants.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-12 text-center">
        <Layers size={32} className="text-slate-300 mb-3" />
        <p className="text-slate-500 text-sm font-medium">Nenhum produto cadastrado</p>
        <p className="text-slate-400 text-xs mt-1">Registre uma compra para adicionar produtos</p>
      </div>
    );
  }

  // Agrupar por cor
  const groups: ColorGroup[] = [];
  const seen = new Map<string, ColorGroup>();
  for (const v of variants) {
    if (!seen.has(v.color)) {
      const g: ColorGroup = { color: v.color, color_hex: v.color_hex, variants: [] };
      seen.set(v.color, g);
      groups.push(g);
    }
    seen.get(v.color)!.variants.push(v);
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Remover "${label}"?`)) return;
    await deleteVariantAction(id, productId);
  }

  function openCode(type: "qr" | "barcode", sku: string, label: string) {
    setCodeModal({ open: true, type, sku, label });
  }

  const totalStock = variants.reduce((s, v) => s + (stockMap[v.id] ?? 0), 0);

  return (
    <>
      <CodeModal
        open={codeModal.open}
        onClose={() => setCodeModal((p) => ({ ...p, open: false }))}
        type={codeModal.type}
        sku={codeModal.sku}
        label={codeModal.label}
      />

      {/* Resumo */}
      <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
        <span>{groups.length} cor{groups.length !== 1 ? "es" : ""}</span>
        <span>·</span>
        <span>{variants.length} produto{variants.length !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{totalStock} peças em estoque</span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[14%]">Cor</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[7%]">Tamanho</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[7%]">Peças</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[14%]">SKU</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[11%]">Custo unit.</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[13%]">Margem</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[11%]">Valor final</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[10%]">Lucro</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[10%]">Lucro total</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[8%]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <ColorGroupRows
                  key={group.color}
                  group={group}
                  costMap={costMap}
                  stockMap={stockMap}
                  productId={productId}
                  onOpenCode={openCode}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
      </div>
    </>
  );
}
