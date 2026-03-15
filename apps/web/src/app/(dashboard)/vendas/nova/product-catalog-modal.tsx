"use client";

import { useState, useMemo } from "react";
import { X, ChevronLeft, Package, Search, Check, Plus } from "lucide-react";
import { formatCurrency } from "@stoqlab/utils";

type Variant = {
  id: string;
  color: string;
  colorHex: string | null;
  size: string;
  sku: string;
  salePrice: number;
  stock: number;
  productName: string;
  coverImageUrl: string | null;
};

type ProductGroup = {
  name: string;
  coverImageUrl: string | null;
  variants: Variant[];
  minPrice: number;
  maxPrice: number;
};

type Props = {
  variants: Variant[];
  cartVariantIds: Set<string>;
  onSelect: (variant: Variant) => void;
  onClose: () => void;
};

const COLOR_HEX: Record<string, string> = {
  PRETO: "#111111", BRANCO: "#FFFFFF", CINZA: "#9E9E9E",
  "AZUL MARINHO": "#1A237E", VERDE: "#2E7D32", AMARELO: "#FDD835",
  LARANJA: "#EF6C00", VERMELHO: "#C62828", ROSA: "#E91E8C",
  ROXO: "#6A1B9A", VINHO: "#6D0000", BEGE: "#F5F0E8",
  NUDE: "#E8C9A0", MARROM: "#5D3A1A",
};

function resolveColor(hex: string | null, name: string) {
  return hex ?? COLOR_HEX[name?.toUpperCase()?.trim()] ?? "#94a3b8";
}

function groupByProduct(variants: Variant[]): ProductGroup[] {
  const map = new Map<string, ProductGroup>();
  for (const v of variants) {
    if (!map.has(v.productName)) {
      map.set(v.productName, {
        name: v.productName,
        coverImageUrl: v.coverImageUrl,
        variants: [],
        minPrice: v.salePrice,
        maxPrice: v.salePrice,
      });
    }
    const g = map.get(v.productName)!;
    g.variants.push(v);
    g.minPrice = Math.min(g.minPrice, v.salePrice);
    g.maxPrice = Math.max(g.maxPrice, v.salePrice);
  }
  return Array.from(map.values());
}

export function ProductCatalogModal({ variants, cartVariantIds, onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ProductGroup | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const allGroups = useMemo(() => groupByProduct(variants), [variants]);

  const filteredGroups = useMemo(() => {
    if (!search.trim()) return allGroups;
    const q = search.toLowerCase();
    return allGroups.filter((g) =>
      g.name.toLowerCase().includes(q) ||
      g.variants.some(
        (v) =>
          v.color.toLowerCase().includes(q) ||
          v.sku.toLowerCase().includes(q) ||
          v.size.toLowerCase().includes(q)
      )
    );
  }, [allGroups, search]);

  function handleSelect(variant: Variant) {
    onSelect(variant);
    setJustAdded(variant.id);
    setTimeout(() => setJustAdded(null), 1200);
  }

  // Group variants of selected product by color
  const variantsByColor = useMemo(() => {
    if (!selectedProduct) return new Map<string, Variant[]>();
    const map = new Map<string, Variant[]>();
    for (const v of selectedProduct.variants) {
      if (!map.has(v.color)) map.set(v.color, []);
      map.get(v.color)!.push(v);
    }
    return map;
  }, [selectedProduct]);

  const colorsInCart = useMemo(() => {
    if (!selectedProduct) return new Set<string>();
    return new Set(
      selectedProduct.variants
        .filter((v) => cartVariantIds.has(v.id))
        .map((v) => v.color)
    );
  }, [selectedProduct, cartVariantIds]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          {selectedProduct ? (
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Voltar ao catálogo"
            >
              <ChevronLeft size={18} />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Package size={16} className="text-blue-600" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-900 text-sm">
              {selectedProduct ? selectedProduct.name : "Catálogo de produtos"}
            </h2>
            {!selectedProduct && (
              <p className="text-xs text-slate-400 mt-0.5">
                {allGroups.length} produto{allGroups.length !== 1 ? "s" : ""} disponíveis
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Fechar catálogo"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Vista 1: Grade de produtos ── */}
        {!selectedProduct && (
          <>
            {/* Busca */}
            <div className="px-5 py-3 border-b border-slate-100 shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar produto, cor, tamanho ou SKU…"
                  className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Grade */}
            <div className="flex-1 overflow-y-auto p-5">
              {filteredGroups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Package size={36} className="text-slate-200 mb-3" />
                  <p className="text-sm">Nenhum produto encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredGroups.map((group) => {
                    const inCartCount = group.variants.filter((v) =>
                      cartVariantIds.has(v.id)
                    ).length;
                    const uniqueColors = new Set(group.variants.map((v) => v.color)).size;

                    return (
                      <button
                        key={group.name}
                        type="button"
                        onClick={() => setSelectedProduct(group)}
                        className="group relative flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all text-left"
                      >
                        {/* Imagem */}
                        <div className="aspect-[3/4] bg-slate-100 overflow-hidden">
                          {group.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={group.coverImageUrl}
                              alt={group.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={28} className="text-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Badge "no carrinho" */}
                        {inCartCount > 0 && (
                          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                            {inCartCount}
                          </div>
                        )}

                        {/* Info */}
                        <div className="p-2.5">
                          <p className="text-xs font-semibold text-slate-800 truncate leading-snug">
                            {group.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {uniqueColors} cor{uniqueColors !== 1 ? "es" : ""} · {group.variants.length} variação{group.variants.length !== 1 ? "ões" : ""}
                          </p>
                          <p className="text-xs font-bold text-slate-700 mt-1.5">
                            {group.minPrice === group.maxPrice
                              ? formatCurrency(group.minPrice)
                              : `${formatCurrency(group.minPrice)} – ${formatCurrency(group.maxPrice)}`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Vista 2: Variações do produto ── */}
        {selectedProduct && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Cabeçalho do produto */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-20 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                {selectedProduct.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedProduct.coverImageUrl}
                    alt={selectedProduct.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={20} className="text-slate-300" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{selectedProduct.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {variantsByColor.size} cor{variantsByColor.size !== 1 ? "es" : ""} ·{" "}
                  {selectedProduct.variants.length} variação{selectedProduct.variants.length !== 1 ? "ões" : ""}
                </p>
                <p className="text-sm font-bold text-slate-700 mt-1">
                  {selectedProduct.minPrice === selectedProduct.maxPrice
                    ? formatCurrency(selectedProduct.minPrice)
                    : `${formatCurrency(selectedProduct.minPrice)} – ${formatCurrency(selectedProduct.maxPrice)}`}
                </p>
              </div>
            </div>

            {/* Por cor */}
            {Array.from(variantsByColor.entries()).map(([color, colorVariants]) => {
              const hex = resolveColor(colorVariants[0].colorHex, color);
              const isLight = hex === "#FFFFFF" || hex === "#F5F0E8" || hex === "#E8C9A0" || hex === "#FDD835";

              return (
                <div key={color}>
                  {/* Linha de cor */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="w-4 h-4 rounded-full border border-slate-300 shrink-0"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="text-sm font-semibold text-slate-700">{color}</span>
                    {colorsInCart.has(color) && (
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 font-medium">
                        no carrinho
                      </span>
                    )}
                  </div>

                  {/* Chips de tamanho */}
                  <div className="flex flex-wrap gap-2">
                    {colorVariants
                      .sort((a, b) => {
                        const order = ["PP", "P", "M", "G", "GG", "XG", "XGG", "EG", "EGG"];
                        const ai = order.indexOf(a.size.toUpperCase());
                        const bi = order.indexOf(b.size.toUpperCase());
                        if (ai !== -1 && bi !== -1) return ai - bi;
                        return a.size.localeCompare(b.size);
                      })
                      .map((variant) => {
                        const inCart = cartVariantIds.has(variant.id);
                        const added = justAdded === variant.id;

                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => handleSelect(variant)}
                            className={`relative flex flex-col items-center justify-center px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all min-w-[72px] ${
                              added
                                ? "bg-emerald-500 border-emerald-500 text-white scale-105"
                                : inCart
                                ? "bg-blue-50 border-blue-400 text-blue-700"
                                : "bg-white border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
                            }`}
                          >
                            {/* Tamanho */}
                            <span className="text-sm font-bold leading-none">{variant.size}</span>

                            {/* Preço */}
                            <span className={`text-[10px] mt-1 font-normal ${added ? "text-emerald-100" : inCart ? "text-blue-500" : "text-slate-400"}`}>
                              {formatCurrency(variant.salePrice)}
                            </span>

                            {/* Estoque */}
                            <span className={`text-[9px] mt-0.5 font-normal ${added ? "text-emerald-100" : inCart ? "text-blue-400" : "text-slate-300"}`}>
                              {variant.stock} disp.
                            </span>

                            {/* Ícone adicionado */}
                            {added && (
                              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow">
                                <Check size={10} className="text-emerald-500" strokeWidth={3} />
                              </div>
                            )}

                            {/* Ícone no carrinho */}
                            {inCart && !added && (
                              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow">
                                <Check size={10} className="text-white" strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {cartVariantIds.size > 0
              ? `${cartVariantIds.size} variação${cartVariantIds.size !== 1 ? "ões" : ""} no carrinho`
              : "Clique numa variação para adicionar ao carrinho"}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
          >
            <Plus size={12} />
            Concluir seleção
          </button>
        </div>
      </div>
    </div>
  );
}
