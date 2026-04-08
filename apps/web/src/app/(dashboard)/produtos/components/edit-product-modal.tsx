"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Camera, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateProductBasicInfoAction, updateProductVariantColorsAction } from "../actions";

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

function resolveHex(hex: string | null, name: string): string {
  if (hex) return hex;
  return COLOR_HEX[name?.toUpperCase()?.trim()] ?? "#94a3b8";
}

type Variant = { id: string; color: string; color_hex: string | null };

type ColorEdit = {
  original: string;
  name: string;
  hex: string;
};

type Props = {
  product: {
    id: string;
    name: string;
    cover_image_url: string | null;
    product_variants: Variant[];
  };
  onClose: () => void;
};

export function EditProductModal({ product, onClose }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [name, setName] = useState(product.name);
  const [previewUrl, setPreviewUrl] = useState<string | null>(product.cover_image_url);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unique colors from variants
  const [colors, setColors] = useState<ColorEdit[]>(() => {
    const seen = new Set<string>();
    return product.product_variants
      .filter((v) => { if (seen.has(v.color)) return false; seen.add(v.color); return true; })
      .map((v) => ({ original: v.color, name: v.color, hex: resolveHex(v.color_hex, v.color) }));
  });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function updateColor(idx: number, field: "name" | "hex", value: string) {
    setColors((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: field === "name" ? value.toUpperCase() : value } : c));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    try {
      // 1. Update name + photo
      const formData = new FormData();
      formData.set("name", name);
      if (photoFile) formData.set("photo", photoFile);
      const result = await updateProductBasicInfoAction(product.id, formData);
      if (result.error) { toast.error(result.error); return; }

      // 2. Update all colors (always persist hex, even if visually unchanged)
      const colorResult = await updateProductVariantColorsAction(
        product.id,
        colors.map((c) => ({ oldColor: c.original, newColor: c.name, newHex: c.hex })),
      );
      if (colorResult.error) { toast.error(colorResult.error); return; }

      toast.success("Produto atualizado.");
      router.refresh();
      onClose();
    } catch {
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <h2 className="font-semibold text-slate-900 text-sm">Editar produto</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Foto */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-28 aspect-[3/4] rounded-xl overflow-hidden border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50 transition group"
              title="Clique para trocar a foto"
            >
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Foto do produto" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={28} className="text-slate-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <Camera size={20} className="text-white" />
              </div>
            </button>
            <span className="text-[11px] text-slate-400">Clique na imagem para trocar</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-700">Nome do produto</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nome do produto"
              required
            />
          </div>

          {/* Cores */}
          {colors.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-700">Cores</label>
              <div className="flex flex-col gap-2">
                {colors.map((c, idx) => (
                  <div key={c.original} className="flex items-center gap-2">
                    {/* Swatch com color picker */}
                    <label
                      className="w-7 h-7 rounded-full border border-slate-200 shrink-0 cursor-pointer relative overflow-hidden"
                      style={{ backgroundColor: c.hex }}
                      title="Clique para mudar a cor"
                    >
                      <input
                        type="color"
                        value={c.hex}
                        onChange={(e) => updateColor(idx, "hex", e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </label>
                    {/* Nome da cor */}
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => updateColor(idx, "name", e.target.value)}
                      className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nome da cor"
                      required
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400">
                Clique no círculo para mudar o tom. Renomear a cor atualiza todas as variações vinculadas.
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg py-2 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg py-2 transition"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
