"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Trash2, ArrowLeftRight, Search, Package, X, Plus, Minus, Check } from "lucide-react";
import { createTransferAction } from "../actions";

type Location = { id: string; name: string; type: string };
type Variant = { id: string; color: string; colorHex: string | null; size: string; sku: string; stock: Record<string, number> };
type Product = { id: string; name: string; imageUrl: string | null; variants: Variant[] };
type TransferItem = { variantId: string; productId: string; productName: string; imageUrl: string | null; color: string; colorHex: string | null; size: string; quantity: number; available: number };

const COLOR_HEX: Record<string, string> = {
  "PRETO": "#111111", "BRANCO": "#FFFFFF", "CINZA": "#9E9E9E", "CINZA CLARO": "#D9D9D9",
  "AZUL MARINHO": "#1A237E", "AZUL ROYAL": "#2962FF", "AZUL BEBÊ": "#90CAF9",
  "VERDE": "#2E7D32", "VERDE MILITAR": "#4B5320", "AMARELO": "#FDD835",
  "LARANJA": "#EF6C00", "VERMELHO": "#C62828", "ROSA": "#E91E8C", "ROSA CLARO": "#F8BBD0",
  "ROXO": "#6A1B9A", "LILÁS": "#CE93D8", "VINHO": "#6D0000", "BORDÔ": "#880E4F",
  "BEGE": "#F5F0E8", "NUDE": "#E8C9A0", "CARAMELO": "#C68642",
  "MARROM": "#5D3A1A", "OFF WHITE": "#FAF9F6", "DOURADO": "#C9A84C", "PRATA": "#BDBDBD",
};
function resolveHex(hex: string | null | undefined, name: string): string {
  if (hex) return hex;
  return COLOR_HEX[name?.toUpperCase()?.trim()] ?? "#94a3b8";
}

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl text-sm transition flex items-center justify-center gap-2">
      {pending ? (
        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Transferindo...</>
      ) : (
        <><ArrowLeftRight size={16} /> Confirmar transferência</>
      )}
    </button>
  );
}

// ── Modal de variantes de um produto ─────────────────────────────────────────
function VariantPickerModal({
  product,
  fromId,
  alreadyAdded,
  onAdd,
  onClose,
}: {
  product: Product;
  fromId: string;
  alreadyAdded: Set<string>;
  onAdd: (items: { variant: Variant; qty: number }[]) => void;
  onClose: () => void;
}) {
  const availableVariants = product.variants.filter((v) => (v.stock[fromId] ?? 0) > 0);
  const [qtys, setQtys] = useState<Record<string, number>>({});

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Agrupa por cor
  const byColor = useMemo(() => {
    const map = new Map<string, { hex: string | null; sizes: Variant[] }>();
    for (const v of availableVariants) {
      if (!map.has(v.color)) map.set(v.color, { hex: v.colorHex, sizes: [] });
      map.get(v.color)!.sizes.push(v);
    }
    return map;
  }, [availableVariants]);

  function setQty(variantId: string, val: number, max: number) {
    setQtys((prev) => ({ ...prev, [variantId]: Math.min(Math.max(0, val), max) }));
  }

  function handleAdd() {
    const toAdd = availableVariants
      .filter((v) => (qtys[v.id] ?? 0) > 0)
      .map((v) => ({ variant: v, qty: qtys[v.id] }));
    if (toAdd.length === 0) return;
    onAdd(toAdd);
    onClose();
  }

  const totalSelected = Object.values(qtys).reduce((s, q) => s + q, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-picker-title"
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Package size={18} aria-hidden="true" className="text-slate-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 id="variant-picker-title" className="font-semibold text-slate-900 text-sm truncate">{product.name}</h2>
            <p className="text-xs text-slate-500">{availableVariants.length} variação{availableVariants.length !== 1 ? "ões" : ""} disponível{availableVariants.length !== 1 ? "is" : ""}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Variantes por cor */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {availableVariants.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma variação com estoque na origem selecionada.</p>
          ) : (
            [...byColor.entries()].map(([color, { hex, sizes }]) => (
              <div key={color}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-4 h-4 rounded-full border border-slate-200 shrink-0"
                    style={{ backgroundColor: resolveHex(hex, color) }} />
                  <span className="text-sm font-medium text-slate-800">{color}</span>
                </div>
                <div className="space-y-2 pl-6">
                  {sizes.map((v) => {
                    const available = v.stock[fromId] ?? 0;
                    const qty = qtys[v.id] ?? 0;
                    const isAdded = alreadyAdded.has(v.id);
                    return (
                      <div key={v.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-colors ${qty > 0 ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-slate-50"} ${isAdded ? "opacity-50" : ""}`}>
                        <span className="w-10 text-center text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg py-1.5 shrink-0">
                          {v.size}
                        </span>
                        <span className="flex-1 text-xs text-slate-500">
                          {available} disponível{available !== 1 ? "is" : ""}
                        </span>
                        {isAdded ? (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <Check size={12} /> Adicionado
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setQty(v.id, qty - 1, available)}
                              className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 flex items-center justify-center transition">
                              <Minus size={12} />
                            </button>
                            <input type="number" min={0} max={available} value={qty === 0 ? "" : qty}
                              onChange={(e) => setQty(v.id, Number(e.target.value) || 0, available)}
                              placeholder="0"
                              className="w-12 text-center py-1 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                            <button type="button" onClick={() => setQty(v.id, qty + 1, available)}
                              className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 flex items-center justify-center transition">
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-slate-100 flex items-center gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button type="button" onClick={handleAdd} disabled={totalSelected === 0}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-sm font-semibold text-white transition">
            {totalSelected > 0 ? `Adicionar ${totalSelected} peça${totalSelected !== 1 ? "s" : ""}` : "Adicionar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Formulário principal ──────────────────────────────────────────────────────
export function TransferForm({ locations, products }: { locations: Location[]; products: Product[] }) {
  const [state, formAction] = useFormState(createTransferAction, {});
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [items, setItems] = useState<TransferItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const addedVariantIds = useMemo(() => new Set(items.map((i) => i.variantId)), [items]);

  // Produtos com estoque na origem
  const catalogProducts = useMemo(() => {
    if (!fromId) return products;
    return products.filter((p) => p.variants.some((v) => (v.stock[fromId] ?? 0) > 0));
  }, [products, fromId]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return catalogProducts;
    const q = search.toLowerCase();
    return catalogProducts.filter((p) => p.name.toLowerCase().includes(q));
  }, [catalogProducts, search]);

  function handleAdd(picked: { variant: Variant; qty: number }[]) {
    if (!selectedProduct) return;
    setItems((prev) => {
      const next = [...prev];
      for (const { variant, qty } of picked) {
        const existing = next.findIndex((i) => i.variantId === variant.id);
        if (existing >= 0) {
          next[existing] = { ...next[existing], quantity: Math.min(next[existing].quantity + qty, next[existing].available) };
        } else {
          next.push({
            variantId: variant.id,
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            imageUrl: selectedProduct.imageUrl,
            color: variant.color,
            colorHex: variant.colorHex,
            size: variant.size,
            quantity: qty,
            available: variant.stock[fromId] ?? 0,
          });
        }
      }
      return next;
    });
  }

  function updateQty(variantId: string, qty: number) {
    setItems((prev) => prev.map((i) => i.variantId === variantId
      ? { ...i, quantity: Math.min(Math.max(1, qty), i.available) } : i));
  }

  function removeItem(variantId: string) {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }

  function handleFromChange(newFromId: string) {
    setFromId(newFromId);
    setItems([]);
    setSearch("");
  }

  const totalPecas = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <>
      {selectedProduct && fromId && (
        <VariantPickerModal
          product={selectedProduct}
          fromId={fromId}
          alreadyAdded={addedVariantIds}
          onAdd={handleAdd}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <form action={formAction} className="flex flex-col lg:flex-row gap-4 min-h-0">

        {/* ── Coluna principal: seleção de locais + catálogo ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* Origem e Destino */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Rota da transferência</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Origem <span className="text-red-500">*</span>
                </label>
                <select name="fromLocationId" required value={fromId}
                  onChange={(e) => handleFromChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800">
                  <option value="">Selecione a origem</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.type === "store" ? "🏪" : "🏭"} {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Destino <span className="text-red-500">*</span>
                </label>
                <select name="toLocationId" required value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800">
                  <option value="">Selecione o destino</option>
                  {locations.filter((l) => l.id !== fromId).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.type === "store" ? "🏪" : "🏭"} {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Catálogo */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 flex-1 min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Catálogo
                {fromId && <span className="ml-2 font-normal normal-case text-slate-400">({catalogProducts.length} produto{catalogProducts.length !== 1 ? "s" : ""} com estoque)</span>}
              </h2>
            </div>

            {/* Busca */}
            <div className="relative shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={fromId ? "Buscar produto..." : "Selecione a origem para ver o catálogo"}
                disabled={!fromId}
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400" />
            </div>

            {!fromId ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <ArrowLeftRight size={32} className="text-slate-200 mb-3" />
                <p className="text-sm text-slate-400">Selecione a origem para visualizar o catálogo</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                <Package size={32} className="text-slate-200 mb-3" />
                <p className="text-sm text-slate-400">
                  {search ? `Nenhum produto encontrado para "${search}"` : "Nenhum produto com estoque nesta origem"}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {filteredProducts.map((p) => {
                    const totalStock = p.variants.reduce((s, v) => s + (v.stock[fromId] ?? 0), 0);
                    const uniqueColors = p.variants
                      .filter((v, i, arr) => arr.findIndex((x) => x.color === v.color) === i && (v.stock[fromId] ?? 0) > 0);
                    const addedCount = items.filter((i) => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);

                    return (
                      <button key={p.id} type="button"
                        onClick={() => setSelectedProduct(p)}
                        className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-md transition-all text-left flex flex-col">
                        {/* Badge de adicionados */}
                        {addedCount > 0 && (
                          <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {addedCount}
                          </div>
                        )}
                        {/* Imagem */}
                        <div className="aspect-[3/4] bg-slate-100 overflow-hidden">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.imageUrl} alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={24} className="text-slate-300" />
                            </div>
                          )}
                        </div>
                        {/* Info */}
                        <div className="p-2 flex flex-col gap-1">
                          <p className="text-xs font-semibold text-slate-900 leading-snug line-clamp-2">{p.name}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex gap-0.5">
                              {uniqueColors.slice(0, 5).map((v) => (
                                <span key={v.id} title={v.color}
                                  className="w-3 h-3 rounded-full border border-slate-200"
                                  style={{ backgroundColor: resolveHex(v.colorHex, v.color) }} />
                              ))}
                              {uniqueColors.length > 5 && <span className="text-[9px] text-slate-400 ml-0.5">+{uniqueColors.length - 5}</span>}
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium">{totalStock} un.</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Coluna lateral: resumo da transferência ── */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col gap-4">

          {/* Itens selecionados */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 flex-1 min-h-0">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">
              Itens a transferir {items.length > 0 && <span className="text-blue-600">({items.length})</span>}
            </h2>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                <ArrowLeftRight size={24} className="text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">Selecione produtos no catálogo</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2">
                {items.map((item) => (
                  <div key={item.variantId} className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                    {/* Thumbnail */}
                    <div className="w-8 shrink-0 rounded-lg overflow-hidden bg-slate-200" style={{ aspectRatio: "3/4" }}>
                      {item.imageUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-slate-200" />}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{item.productName}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="w-2.5 h-2.5 rounded-full border border-slate-200 shrink-0"
                          style={{ backgroundColor: resolveHex(item.colorHex, item.color) }} />
                        <span className="text-[10px] text-slate-500">{item.color} · {item.size}</span>
                      </div>
                    </div>
                    {/* Qty */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => updateQty(item.variantId, item.quantity - 1)}
                        className="w-6 h-6 rounded border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition">
                        <Minus size={10} />
                      </button>
                      <span className="w-7 text-center text-xs font-bold text-slate-800">{item.quantity}</span>
                      <button type="button" onClick={() => updateQty(item.variantId, item.quantity + 1)}
                        className="w-6 h-6 rounded border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-300 flex items-center justify-center transition">
                        <Plus size={10} />
                      </button>
                    </div>
                    {/* Remove */}
                    <button type="button" onClick={() => removeItem(item.variantId)}
                      className="text-slate-300 hover:text-red-400 transition shrink-0 p-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            {items.length > 0 && (
              <div className="shrink-0 pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-500">{items.length} produto{items.length !== 1 ? "s"  : ""}</span>
                <span className="text-sm font-bold text-slate-900">{totalPecas} peça{totalPecas !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* Observações + ações */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Observações</label>
              <textarea name="notes" rows={2}
                placeholder="Ex: Reposição semana, transferência loja parceira..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-800 placeholder:text-slate-400" />
            </div>

            {state.error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
            )}

            <SubmitButton disabled={items.length === 0 || !fromId || !toId} />
            <Link href="/transferencias"
              className="block text-center text-sm text-slate-500 hover:text-slate-700 font-medium py-1 transition">
              Cancelar
            </Link>
          </div>
        </div>

        <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })))} />
      </form>
    </>
  );
}
