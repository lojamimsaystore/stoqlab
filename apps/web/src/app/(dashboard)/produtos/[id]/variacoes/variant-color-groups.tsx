"use client";

import { useState, useTransition } from "react";
import { Layers, Trash2, QrCode, Barcode, Check, Loader2, Printer } from "lucide-react";
import { deleteVariantAction, updateVariantsSalePriceAction } from "../../actions";
import { formatCurrency } from "@stoqlab/utils";
import { toast } from "sonner";
import { CodeModal } from "./code-modal";
import { LabelsPrintModal, type LabelVariant } from "./labels-print-modal";

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

// ── Linhas de um grupo de cor ────────────────────────────────────────────────

function ColorGroupRows({
  group,
  costMap,
  stockMap,
  productId,
  selectedIds,
  onToggleSelect,
  onOpenCode,
  onDelete,
}: {
  group: ColorGroup;
  costMap: Record<string, number>;
  stockMap: Record<string, number>;
  productId: string;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenCode: (type: "qr" | "barcode", sku: string, label: string) => void;
  onDelete: (id: string, label: string) => void;
}) {
  const costs = group.variants.map((v) => costMap[v.id]).filter((c) => c !== undefined);
  const avgCost = costs.length > 0 ? costs.reduce((a, b) => a + b, 0) / costs.length : null;

  const currentSalePrice = group.variants.find((v) => v.sale_price)?.sale_price ?? null;
  const initialPrice = currentSalePrice ? String(Number(currentSalePrice).toFixed(2)) : "";

  const [salePrice, setSalePrice] = useState(initialPrice);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  const salePriceNum = parseFloat(salePrice.replace(",", ".")) || 0;
  const margin =
    avgCost && avgCost > 0 && salePriceNum > 0
      ? ((salePriceNum - avgCost) / avgCost) * 100
      : null;
  const profit = avgCost !== null && salePriceNum > 0 ? salePriceNum - avgCost : null;

  function handlePriceChange(value: string) {
    setSalePrice(value);
    setIsDirty(value !== initialPrice);
  }

  function handleSave() {
    if (!salePriceNum) return;
    const ids = group.variants.map((v) => v.id);
    startTransition(async () => {
      const result = await updateVariantsSalePriceAction(ids, productId, salePriceNum);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(`Preço de ${group.color} atualizado para ${formatCurrency(salePriceNum)}`);
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

            {/* Checkbox */}
            <td className="px-2 py-2.5 text-center">
              <input
                type="checkbox"
                checked={selectedIds.has(v.id)}
                onChange={() => onToggleSelect(v.id)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </td>

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
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                  qty > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-500"
                }`}
              >
                {qty}
              </span>
            </td>

            {/* SKU */}
            <td className="px-4 py-2.5 text-xs font-mono text-slate-400">{v.sku}</td>

            {/* Custo unitário */}
            <td className="px-4 py-2.5 text-xs text-slate-600">
              {avgCost !== null ? formatCurrency(avgCost) : <span className="text-slate-300">—</span>}
            </td>

            {/* Valor de venda */}
            <td className="px-4 py-2.5">
              {i === 0 ? (
                <div className="flex items-center gap-0.5">
                  <span className="text-xs text-slate-400">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    placeholder="0,00"
                    className={`w-20 text-xs font-semibold text-slate-700 bg-white border rounded px-1.5 py-0.5 outline-none focus:border-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors ${
                      isDirty ? "border-amber-400 bg-amber-50" : "border-slate-200"
                    }`}
                  />
                </div>
              ) : (
                <span className="text-xs text-slate-500">
                  {salePrice ? formatCurrency(salePriceNum) : "—"}
                </span>
              )}
            </td>

            {/* Markup */}
            <td className="px-4 py-2.5">
              <span
                className={`text-xs font-semibold ${
                  margin !== null
                    ? margin >= 0
                      ? "text-blue-600"
                      : "text-red-500"
                    : "text-slate-300"
                }`}
              >
                {margin !== null ? `${margin.toFixed(1)}%` : "—"}
              </span>
            </td>

            {/* Lucro */}
            <td className="px-4 py-2.5">
              <span
                className={`text-xs font-semibold ${
                  profit !== null
                    ? profit >= 0
                      ? "text-emerald-600"
                      : "text-red-500"
                    : "text-slate-300"
                }`}
              >
                {profit !== null ? formatCurrency(profit) : "—"}
              </span>
            </td>

            {/* Lucro total */}
            <td className="px-4 py-2.5">
              <span
                className={`text-xs font-semibold ${
                  totalProfit !== null
                    ? totalProfit >= 0
                      ? "text-emerald-600"
                      : "text-red-500"
                    : "text-slate-300"
                }`}
              >
                {totalProfit !== null ? formatCurrency(totalProfit) : "—"}
              </span>
            </td>

            {/* Ações */}
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-1">
                {i === 0 && isDirty && salePriceNum > 0 && (
                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    title="Salvar preço"
                    className="p-1 rounded text-emerald-500 hover:text-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
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

// ── Componente principal ─────────────────────────────────────────────────────

export function VariantColorGroups({
  variants,
  stockMap,
  costMap,
  productId,
  productName,
}: {
  variants: Variant[];
  stockMap: Record<string, number>;
  costMap: Record<string, number>;
  productId: string;
  productName: string;
}) {
  const [codeModal, setCodeModal] = useState<CodeModalState>({
    open: false,
    type: "qr",
    sku: "",
    label: "",
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [printModalOpen, setPrintModalOpen] = useState(false);

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

  const allIds = variants.map((v) => v.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = !allSelected && allIds.some((id) => selectedIds.has(id));

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Remover "${label}"?`)) return;
    await deleteVariantAction(id, productId);
  }

  function openCode(type: "qr" | "barcode", sku: string, label: string) {
    setCodeModal({ open: true, type, sku, label });
  }

  const totalStock = variants.reduce((s, v) => s + (stockMap[v.id] ?? 0), 0);

  // Variantes selecionadas para imprimir
  const selectedVariants: LabelVariant[] = variants
    .filter((v) => selectedIds.has(v.id))
    .map((v) => ({
      id: v.id,
      sku: v.sku,
      color: v.color,
      size: v.size,
      sale_price: v.sale_price,
    }));

  return (
    <>
      <CodeModal
        open={codeModal.open}
        onClose={() => setCodeModal((p) => ({ ...p, open: false }))}
        type={codeModal.type}
        sku={codeModal.sku}
        label={codeModal.label}
      />

      <LabelsPrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        variants={selectedVariants}
        productName={productName}
      />

      {/* Resumo + ação de impressão em lote */}
      <div className="flex items-center gap-4 text-sm text-slate-500 mb-4 flex-wrap">
        <span>{groups.length} cor{groups.length !== 1 ? "es" : ""}</span>
        <span>·</span>
        <span>{variants.length} produto{variants.length !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{totalStock} peças em estoque</span>

        {selectedIds.size > 0 && (
          <>
            <span>·</span>
            <span className="text-blue-600 font-medium">{selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}</span>
            <button
              onClick={() => setPrintModalOpen(true)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition"
            >
              <Printer size={13} />
              Imprimir etiquetas
            </button>
          </>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {/* Checkbox selecionar todos */}
              <th className="px-2 py-2.5 w-8 text-center">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleAll}
                  title="Selecionar todos"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[13%]">Cor</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[7%]">Tamanho</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[6%]">Peças</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[13%]">SKU</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[10%]">Custo unit.</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[12%]">Valor de venda</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[10%]">Markup</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide w-[9%]">Lucro</th>
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
                selectedIds={selectedIds}
                onToggleSelect={toggleOne}
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
