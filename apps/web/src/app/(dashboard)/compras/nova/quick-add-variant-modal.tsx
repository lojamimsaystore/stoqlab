"use client";

import { useRef, useState, useEffect } from "react";
import { X, ImagePlus, Trash2, Pencil, Plus, Check, Palette } from "lucide-react";
import { SIZES } from "@stoqlab/validators";
import { uploadTempPhotoAction } from "@/app/(dashboard)/produtos/actions";

type PendingVariant = { tempId: string; color: string; colorHex?: string; size: string; photoUrl?: string };
export type CreatedVariant = PendingVariant & { unitCost: number; quantity: number };

const PRESET_COLORS = [
  { name: "PRETO",        hex: "#111111" },
  { name: "BRANCO",       hex: "#FFFFFF" },
  { name: "CINZA",        hex: "#9E9E9E" },
  { name: "CINZA CLARO",  hex: "#D9D9D9" },
  { name: "AZUL MARINHO", hex: "#1A237E" },
  { name: "AZUL ROYAL",   hex: "#2962FF" },
  { name: "AZUL BEBÊ",    hex: "#90CAF9" },
  { name: "VERDE",        hex: "#2E7D32" },
  { name: "V. MILITAR",   hex: "#4B5320" },
  { name: "AMARELO",      hex: "#FDD835" },
  { name: "LARANJA",      hex: "#EF6C00" },
  { name: "VERMELHO",     hex: "#C62828" },
  { name: "ROSA",         hex: "#E91E8C" },
  { name: "ROSA CLARO",   hex: "#F8BBD0" },
  { name: "ROXO",         hex: "#6A1B9A" },
  { name: "LILÁS",        hex: "#CE93D8" },
  { name: "VINHO",        hex: "#6D0000" },
  { name: "BORDÔ",        hex: "#880E4F" },
  { name: "BEGE",         hex: "#F5F0E8" },
  { name: "NUDE",         hex: "#E8C9A0" },
  { name: "CARAMELO",     hex: "#C68642" },
  { name: "MARROM",       hex: "#5D3A1A" },
  { name: "OFF WHITE",    hex: "#FAF9F6" },
  { name: "DOURADO",      hex: "#C9A84C" },
  { name: "PRATA",        hex: "#BDBDBD" },
];

const LIGHT_COLORS = new Set([
  "#FFFFFF","#D9D9D9","#90CAF9","#FDD835",
  "#F8BBD0","#CE93D8","#F5F0E8","#E8C9A0","#FAF9F6","#BDBDBD",
]);

export function QuickAddVariantModal({
  open, onClose, onCreated, onUpdated,
  productId: _productId, productName, editVariant,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (variants: CreatedVariant[]) => void;
  onUpdated?: (variant: PendingVariant) => void;
  productId: string;
  productName: string;
  editVariant?: PendingVariant;
}) {
  const isEdit = !!editVariant;

  const [preview, setPreview]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [colorName, setColorName]     = useState("");
  const [colorHex, setColorHex]       = useState("#9E9E9E");
  const [editingName, setEditingName] = useState(false);
  const [selectedSizes, setSelectedSizes]   = useState<string[]>([]);
  const [extraSizes, setExtraSizes]         = useState<string[]>([]);
  const [customSizeMode, setCustomSizeMode] = useState(false);
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [sizeQtys, setSizeQtys]     = useState<Record<string, string>>({});
  const [sizePrices, setSizePrices] = useState<Record<string, string>>({});

  const nameInputRef  = useRef<HTMLInputElement>(null);
  const hexInputRef   = useRef<HTMLInputElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const customSizeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPreview(editVariant?.photoUrl ?? null);
    setError(""); setEditingName(false);
    setCustomSizeMode(false); setCustomSizeInput("");
    setExtraSizes([]); setSizeQtys({}); setSizePrices({});
    if (isEdit && editVariant) {
      setColorName(editVariant.color);
      setColorHex(PRESET_COLORS.find((c) => c.name === editVariant.color)?.hex ?? "#9E9E9E");
      setSelectedSizes([editVariant.size]);
    } else {
      setColorName(""); setColorHex("#9E9E9E"); setSelectedSizes([]);
    }
  }, [open, isEdit, editVariant]);

  if (!open) return null;

  const allSizes = [...SIZES, ...extraSizes];
  const isLight = LIGHT_COLORS.has(colorHex);

  function toggleSize(s: string) {
    if (isEdit) { setSelectedSizes([s]); return; }
    setSelectedSizes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function confirmCustomSize() {
    const s = customSizeInput.trim().toUpperCase();
    if (!s) { setCustomSizeMode(false); return; }
    if (!allSizes.includes(s)) setExtraSizes((prev) => [...prev, s]);
    setSelectedSizes((prev) => prev.includes(s) ? prev : [...prev, s]);
    setCustomSizeMode(false); setCustomSizeInput("");
  }

  function parsePriceBR(raw: string): number {
    return parseFloat(raw.replace(",", ".").replace(/[^\d.]/g, "")) || 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const color = colorName.trim();
    if (!color || selectedSizes.length === 0) { setError("Preencha a cor e ao menos um tamanho."); return; }
    setLoading(true); setError("");
    try {
      const fd = new FormData(e.currentTarget);
      let photoUrl: string | undefined = editVariant?.photoUrl;
      const photo = fd.get("photo") as File | null;
      if (photo && photo.size > 0) {
        const url = await uploadTempPhotoAction(fd);
        if (url) photoUrl = url;
      } else if (!preview) { photoUrl = undefined; }

      if (isEdit && editVariant) {
        onUpdated?.({ tempId: editVariant.tempId, color, colorHex, size: selectedSizes[0], photoUrl });
      } else {
        onCreated?.(selectedSizes.map((size) => ({
          tempId: crypto.randomUUID(), color, colorHex, size, photoUrl,
          quantity: Math.max(1, parseInt(sizeQtys[size] ?? "1", 10) || 1),
          unitCost: parsePriceBR(sizePrices[size] ?? ""),
        })));
      }
      onClose(); setPreview(null);
    } catch { setError("Erro ao processar. Tente novamente."); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Palette size={15} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">
              {isEdit ? "Editar detalhe" : "Adicionar cor e tamanhos"}
            </h2>
            <p className="text-xs text-slate-400 truncate">{productName}</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} encType="multipart/form-data">
          {/* ── Corpo: 3 colunas ───────────────────────────────── */}
          <div className="flex divide-x divide-slate-100">

            {/* ── Coluna 1: Foto ─── */}
            <div className="w-36 shrink-0 p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Foto</p>
              <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/40 transition overflow-hidden group"
                >
                  {preview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={preview} alt="" className="w-full h-full object-cover" />
                    : <>
                        <ImagePlus size={22} className="text-slate-300 group-hover:text-blue-400 transition" />
                        <span className="text-[10px] text-slate-400 group-hover:text-blue-500 transition text-center px-2 leading-tight">
                          Clique para<br />adicionar
                        </span>
                      </>
                  }
                </button>
                {preview && (
                  <button type="button"
                    onClick={() => { setPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-md transition">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
              <input ref={fileInputRef} name="photo" type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }} />
              <p className="text-[9px] text-slate-300 text-center leading-tight">Opcional · 3×4</p>
            </div>

            {/* ── Coluna 2: Cor ─── */}
            <div className="flex-1 p-4 flex flex-col gap-3 min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Cor <span className="text-red-500 font-bold">*</span>
              </p>

              {/* Preview da cor selecionada */}
              <div className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 border transition-all"
                style={{ backgroundColor: colorHex, borderColor: isLight ? "#e2e8f0" : colorHex }}>
                {colorName
                  ? <span className="text-sm font-bold tracking-wide" style={{ color: isLight ? "#1e293b" : "#fff" }}>{colorName}</span>
                  : <span className="text-xs italic" style={{ color: isLight ? "#94a3b8" : "rgba(255,255,255,.6)" }}>Selecione uma cor…</span>
                }
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button"
                    onClick={() => { setEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 50); }}
                    className="p-1 rounded-md bg-black/10 hover:bg-black/20 transition"
                    style={{ color: isLight ? "#475569" : "#fff" }} title="Digitar nome">
                    <Pencil size={11} />
                  </button>
                  <button type="button" onClick={() => hexInputRef.current?.click()}
                    className="w-5 h-5 rounded-full border-2 shadow-sm cursor-pointer"
                    style={{ backgroundColor: colorHex, borderColor: isLight ? "#cbd5e1" : "rgba(255,255,255,.5)" }}
                    title="Cor personalizada" />
                  <input ref={hexInputRef} type="color" value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)} className="sr-only" />
                </div>
              </div>

              {editingName && (
                <input ref={nameInputRef} type="text" value={colorName}
                  onChange={(e) => setColorName(e.target.value.toUpperCase())}
                  onBlur={() => { if (colorName.trim()) setEditingName(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setEditingName(false); } }}
                  placeholder="Ex: AZUL PETRÓLEO"
                  className="w-full px-2.5 py-1.5 border border-blue-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
              )}

              {/* Grid de cores compacto com nomes */}
              <div className="grid grid-cols-5 gap-0.5">
                {PRESET_COLORS.map((c) => {
                  const sel = colorName === c.name;
                  return (
                    <button key={c.name} type="button" title={c.name}
                      onClick={() => { setColorName(c.name); setColorHex(c.hex); setEditingName(false); }}
                      className={`flex flex-col items-center gap-0.5 py-1 px-0.5 rounded-lg transition-all ${
                        sel ? "bg-blue-50 ring-2 ring-blue-500 ring-offset-1" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="w-7 h-7 rounded-lg border border-black/10 shadow-sm shrink-0"
                        style={{ backgroundColor: c.hex }} />
                      <span className={`text-[8px] leading-tight text-center w-full truncate px-0.5 ${
                        sel ? "text-blue-600 font-semibold" : "text-slate-400"
                      }`}>
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <input type="hidden" name="color" value={colorName} />
              <input type="hidden" name="colorHex" value={colorHex} />
            </div>

            {/* ── Coluna 3: Tamanho + Qtd/Custo ─── */}
            <div className="w-80 shrink-0 p-4 flex flex-col gap-4">

              {/* Tamanhos */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Tamanho <span className="text-red-500 font-bold">*</span>
                  {!isEdit && (
                    <span className="ml-1 normal-case text-[10px] font-normal text-slate-400">
                      (múltiplos)
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1">
                  {allSizes.map((s) => {
                    const sel = selectedSizes.includes(s);
                    return (
                      <button key={s} type="button" onClick={() => toggleSize(s)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                          sel
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm scale-105"
                            : "bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                  {customSizeMode ? (
                    <div className="flex items-center gap-1 w-full mt-1">
                      <input ref={customSizeRef} autoFocus value={customSizeInput}
                        onChange={(e) => setCustomSizeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); confirmCustomSize(); }
                          if (e.key === "Escape") setCustomSizeMode(false);
                        }}
                        placeholder="Ex: 42" maxLength={8}
                        className="flex-1 min-w-0 px-2 py-1 border border-blue-300 rounded-lg text-xs focus:outline-none uppercase" />
                      <button type="button" onClick={confirmCustomSize} className="text-green-500 hover:text-green-600"><Check size={13} /></button>
                      <button type="button" onClick={() => setCustomSizeMode(false)} className="text-slate-300 hover:text-slate-500"><X size={13} /></button>
                    </div>
                  ) : (
                    <button type="button"
                      onClick={() => { setCustomSizeMode(true); setTimeout(() => customSizeRef.current?.focus(), 50); }}
                      className="px-2 py-1.5 rounded-lg text-[10px] border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition flex items-center gap-0.5">
                      <Plus size={9} /> outro
                    </button>
                  )}
                </div>
              </div>

              {/* Qtd + Custo por tamanho */}
              {selectedSizes.length > 0 && (
                <div className="flex-1">
                  {/* Cabeçalho da tabela */}
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="w-12 shrink-0" />
                    <span className="w-20 shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">Qtd.</span>
                    <span className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">Custo unitário</span>
                  </div>

                  <div className="space-y-2">
                    {selectedSizes.map((size) => (
                      <div key={size} className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-center text-xs font-bold text-white bg-blue-600 rounded-lg py-2">
                          {size}
                        </span>
                        <input type="number" min="1" placeholder="1"
                          value={sizeQtys[size] ?? ""}
                          onChange={(e) => setSizeQtys((prev) => ({ ...prev, [size]: e.target.value }))}
                          className="w-20 shrink-0 px-2 py-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-300"
                        />
                        <input type="text" inputMode="decimal" placeholder="R$ 0,00"
                          value={sizePrices[size] ?? ""}
                          onChange={(e) => setSizePrices((prev) => ({ ...prev, [size]: e.target.value }))}
                          className="w-28 shrink-0 px-2 py-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Estado vazio */}
              {selectedSizes.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-4 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Selecione os tamanhos<br />disponíveis para este produto
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Rodapé ─────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            {error && (
              <p className="flex-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            {!error && (
              <div className="flex-1 flex items-center gap-2">
                {colorName && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="w-4 h-4 rounded-full border border-black/10 shadow-sm shrink-0"
                      style={{ backgroundColor: colorHex }} />
                    {colorName}
                  </span>
                )}
                {selectedSizes.length > 0 && (
                  <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                    {selectedSizes.join(" · ")}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition font-medium">
                Cancelar
              </button>
              <button type="submit"
                disabled={loading || !colorName.trim() || selectedSizes.length === 0}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold transition shadow-sm">
                {loading ? "Salvando…"
                  : isEdit ? "Salvar alterações"
                  : selectedSizes.length > 1 ? `Adicionar ${selectedSizes.length} tamanhos`
                  : "Adicionar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
