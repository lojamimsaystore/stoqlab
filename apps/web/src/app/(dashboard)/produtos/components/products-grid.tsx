"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Package, Trash2, X, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import { bulkDeleteProductsAction } from "../actions";
import { DeleteProductButton } from "./delete-product-button";
import { ArchiveProductButton } from "./archive-product-button";
import { EditProductModal } from "./edit-product-modal";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  draft: "Rascunho",
  archived: "Arquivado",
};
const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  archived: "bg-red-100 text-red-600",
};
const COLOR_HEX: Record<string, string> = {
  "PRETO": "#111111", "BRANCO": "#FFFFFF", "CINZA": "#9E9E9E",
  "CINZA CLARO": "#D9D9D9", "AZUL MARINHO": "#1A237E", "AZUL ROYAL": "#2962FF",
  "AZUL BEBÊ": "#90CAF9", "VERDE": "#2E7D32", "VERDE MILITAR": "#4B5320",
  "AMARELO": "#FDD835", "LARANJA": "#EF6C00", "VERMELHO": "#C62828",
  "ROSA": "#E91E8C", "ROSA CLARO": "#F8BBD0", "ROXO": "#6A1B9A",
  "LILÁS": "#CE93D8", "VINHO": "#6D0000", "BORDÔ": "#880E4F",
  "BEGE": "#F5F0E8", "NUDE": "#E8C9A0", "CARAMELO": "#C68642",
  "MARROM": "#5D3A1A", "OFF WHITE": "#FAF9F6", "DOURADO": "#C9A84C",
  "PRATA": "#BDBDBD",
};

function resolveColorHex(colorHex: string | null, colorName: string): string {
  if (colorHex) return colorHex;
  return COLOR_HEX[colorName?.toUpperCase()?.trim()] ?? "#94a3b8";
}

type Product = {
  id: string;
  name: string;
  brand: string | null;
  status: string;
  cover_image_url: string | null;
  categories: { name: string } | null;
  product_variants: { id: string; color: string; color_hex: string | null; inventory: { quantity: number }[] }[];
};

export function ProductsGrid({ products: serverProducts, isOwner = false }: { products: Product[]; isOwner?: boolean }) {
  const router = useRouter();
  // Cópia local para atualizações otimistas (cor/nome mudam imediatamente sem esperar router.refresh)
  const [products, setProducts] = useState<Product[]>(serverProducts);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Sincroniza quando o servidor envia dados frescos (após router.refresh)
  useEffect(() => { setProducts(serverProducts); }, [serverProducts]);

  const hasSelection = selected.size > 0;
  const allSelected = products.length > 0 && selected.size === products.length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  }

  function clearSelection() {
    setSelected(new Set());
    setConfirmOpen(false);
  }

  function handleBulkDelete() {
    startTransition(async () => {
      const ids = Array.from(selected);
      const result = await bulkDeleteProductsAction(ids);
      const skipped = ids.length - result.deleted;
      if (result.deleted > 0) {
        toast.success(
          skipped > 0
            ? `${result.deleted} produto${result.deleted !== 1 ? "s" : ""} excluído${result.deleted !== 1 ? "s" : ""}. ${skipped} não puderam ser excluídos (possuem vendas ou compras vinculadas).`
            : `${result.deleted} produto${result.deleted !== 1 ? "s" : ""} excluído${result.deleted !== 1 ? "s" : ""} com sucesso.`
        );
      } else {
        toast.error("Nenhum produto pôde ser excluído. Verifique se possuem vendas ou compras vinculadas.");
      }
      setSelected(new Set());
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      {/* Barra de seleção — aparece quando há itens selecionados */}
      {isOwner && hasSelection && (
        <div className="sticky top-0 z-20 mb-3 flex items-center gap-3 bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-lg">
          <button
            type="button"
            onClick={clearSelection}
            className="p-1 rounded hover:bg-blue-500 transition"
            title="Limpar seleção"
          >
            <X size={15} />
          </button>
          <span className="text-sm font-medium flex-1">
            {selected.size} produto{selected.size !== 1 ? "s" : ""} selecionado{selected.size !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-medium text-blue-200 hover:text-white transition"
          >
            {allSelected ? "Desmarcar todos" : "Selecionar todos"}
          </button>
          {!confirmOpen ? (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition"
            >
              <Trash2 size={13} />
              Excluir selecionados
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
                {isPending ? "Excluindo…" : "Sim, excluir"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="text-xs text-blue-200 hover:text-white font-medium transition"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Botão selecionar todos (quando nada selecionado) */}
      {isOwner && !hasSelection && products.length > 1 && (
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium transition"
          >
            Selecionar todos
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-3">
        {products.map((p) => {
          const variants = p.product_variants ?? [];
          const category = (p.categories as { name: string } | null)?.name;
          const totalStock = variants.reduce(
            (sum, v) => sum + (v.inventory ?? []).reduce((s, inv) => s + (inv.quantity ?? 0), 0),
            0
          );
          const uniqueColors = variants.filter(
            (v, i, arr) => arr.findIndex((x) => x.color === v.color) === i
          );
          const isSelected = selected.has(p.id);

          return (
            <div
              key={p.id}
              className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-all flex flex-col group relative ${
                isSelected
                  ? "border-blue-500 ring-2 ring-blue-500 shadow-md"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {/* Checkbox de seleção — só para owners */}
              {isOwner && (
                <button
                  type="button"
                  onClick={() => toggleSelect(p.id)}
                  className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-blue-600 border-blue-600 opacity-100"
                      : "bg-white/90 border-slate-300 opacity-0 group-hover:opacity-100"
                  }`}
                  title={isSelected ? "Desmarcar" : "Selecionar"}
                >
                  {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                </button>
              )}

              {/* Ações no hover — só para owners */}
              {isOwner && !hasSelection && (
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm flex items-center">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); setEditingProduct(p); }}
                      title="Editar nome e foto"
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition"
                    >
                      <Pencil size={13} />
                    </button>
                    <ArchiveProductButton id={p.id} status={p.status} />
                    <DeleteProductButton id={p.id} name={p.name} />
                  </div>
                </div>
              )}

              {/* Área clicável → variações */}
              <Link
                href={`/produtos/${p.id}/variacoes`}
                className="flex-1 flex flex-col"
                onClick={(e) => {
                  if (isOwner && (isSelected || hasSelection)) {
                    e.preventDefault();
                    toggleSelect(p.id);
                  }
                }}
              >
                {/* Imagem */}
                <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                  {p.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.cover_image_url}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={28} className="text-slate-300" />
                    </div>
                  )}
                  {/* Badge de status */}
                  <span className={`absolute top-2 left-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[p.status] ?? ""}`}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>

                {/* Info */}
                <div className="p-2.5 flex-1 flex flex-col gap-1">
                  <p className="font-semibold text-slate-900 text-xs leading-snug line-clamp-2">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {category ?? "Sem categoria"}
                  </p>

                  {/* Estoque total */}
                  <p className={`text-[10px] font-semibold ${totalStock > 0 ? "text-emerald-600" : "text-red-400"}`}>
                    {totalStock} {totalStock === 1 ? "peça" : "peças"}
                  </p>

                  {/* Bolinhas de cor */}
                  {uniqueColors.length > 0 && (
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {uniqueColors.slice(0, 6).map((v) => (
                        <span
                          key={v.id}
                          title={v.color}
                          className="w-3 h-3 rounded-full border border-slate-200 shrink-0"
                          style={{ backgroundColor: resolveColorHex(v.color_hex, v.color) }}
                        />
                      ))}
                      {uniqueColors.length > 6 && (
                        <span className="text-[9px] text-slate-400 font-medium">+{uniqueColors.length - 6}</span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSaved={(updated) => {
            // Atualiza o estado local imediatamente (sem esperar router.refresh)
            setProducts((prev) => prev.map((p) =>
              p.id === updated.id
                ? { ...p, name: updated.name, cover_image_url: updated.cover_image_url, product_variants: updated.product_variants.map((uv) => ({ ...uv, inventory: p.product_variants.find((pv) => pv.id === uv.id)?.inventory ?? [] })) }
                : p
            ));
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}
