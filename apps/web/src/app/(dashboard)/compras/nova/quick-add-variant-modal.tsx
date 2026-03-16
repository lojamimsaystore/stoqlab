"use client";

import { useRef, useState, useEffect } from "react";
import { X, ImagePlus, Trash2, Pencil, Plus, Check, Palette } from "lucide-react";
import { SIZES } from "@stoqlab/validators";
import { uploadTempPhotoAction } from "@/app/(dashboard)/produtos/actions";

type PendingVariant = { tempId: string; color: string; colorHex?: string; size: string; photoUrl?: string };
export type CreatedVariant = PendingVariant & { unitCost: number; quantity: number };

type ColorEntry = { name: string; hex: string };

const PRESET_COLORS: ColorEntry[] = [
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

function isLight(hex: string) { return LIGHT_COLORS.has(hex); }

function parsePriceBR(raw: string): number {
  return parseFloat(raw.replace(",", ".").replace(/[^\d.]/g, "")) || 0;
}

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

  // Foto
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cores selecionadas (multi) e cor ativa para configurar tamanhos
  const [selectedColors, setSelectedColors] = useState<ColorEntry[]>([]);
  const [activeColorName, setActiveColorName] = useState<string | null>(null);
  const [customColors, setCustomColors] = useState<ColorEntry[]>([]);
  const [customColorMode, setCustomColorMode] = useState(false);
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#9E9E9E");
  const hexPickerRef = useRef<HTMLInputElement>(null);
  const customColorNameRef = useRef<HTMLInputElement>(null);

  // Tamanhos por cor: { colorName -> string[] }
  const [colorSizes, setColorSizes] = useState<Record<string, string[]>>({});
  const [extraSizes, setExtraSizes] = useState<string[]>([]);
  const [customSizeMode, setCustomSizeMode] = useState(false);
  const [customSizeInput, setCustomSizeInput] = useState("");
  const customSizeRef = useRef<HTMLInputElement>(null);

  // Qtd + Custo por cor+tamanho: { colorName -> { size -> value } }
  const [colorSizeQtys, setColorSizeQtys] = useState<Record<string, Record<string, string>>>({});
  const [colorSizePrices, setColorSizePrices] = useState<Record<string, Record<string, string>>>({});

  // Edit mode: single color + single size (comportamento anterior)
  const [editColorName, setEditColorName] = useState("");
  const [editColorHex, setEditColorHex] = useState("#9E9E9E");
  const [editingName, setEditingName] = useState(false);
  const [editSelectedSizes, setEditSelectedSizes] = useState<string[]>([]);
  const editNameRef = useRef<HTMLInputElement>(null);
  const editHexRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPreview(editVariant?.photoUrl ?? null);
    setError(""); setLoading(false);
    setCustomColorMode(false); setCustomColorName(""); setCustomColorHex("#9E9E9E");
    setCustomSizeMode(false); setCustomSizeInput(""); setExtraSizes([]);

    if (isEdit && editVariant) {
      setEditColorName(editVariant.color);
      setEditColorHex(PRESET_COLORS.find((c) => c.name === editVariant.color)?.hex ?? "#9E9E9E");
      setEditSelectedSizes([editVariant.size]);
      setEditingName(false);
    } else {
      setSelectedColors([]);
      setActiveColorName(null);
      setColorSizes({});
      setColorSizeQtys({});
      setColorSizePrices({});
    }
  }, [open, isEdit, editVariant]);

  if (!open) return null;

  const allSizes = [...SIZES, ...extraSizes];
  const allPresetColors = [...PRESET_COLORS, ...customColors];

  // ── Ações de cor ──
  function toggleColor(c: ColorEntry) {
    const already = selectedColors.find((s) => s.name === c.name);
    if (already) {
      // Remover
      const next = selectedColors.filter((s) => s.name !== c.name);
      setSelectedColors(next);
      setColorSizes((prev) => { const r = { ...prev }; delete r[c.name]; return r; });
      setColorSizeQtys((prev) => { const r = { ...prev }; delete r[c.name]; return r; });
      setColorSizePrices((prev) => { const r = { ...prev }; delete r[c.name]; return r; });
      setActiveColorName(next.length > 0 ? next[next.length - 1].name : null);
    } else {
      // Adicionar
      const next = [...selectedColors, c];
      setSelectedColors(next);
      setActiveColorName(c.name);
    }
  }

  function addCustomColor() {
    const name = customColorName.trim().toUpperCase();
    if (!name) return;
    const c: ColorEntry = { name, hex: customColorHex };
    if (!allPresetColors.find((p) => p.name === name)) {
      setCustomColors((prev) => [...prev, c]);
    }
    toggleColor(c);
    setCustomColorMode(false);
    setCustomColorName("");
  }

  // ── Ações de tamanho (para a cor ativa) ──
  function toggleSize(size: string) {
    if (!activeColorName) return;
    setColorSizes((prev) => {
      const current = prev[activeColorName] ?? [];
      return {
        ...prev,
        [activeColorName]: current.includes(size)
          ? current.filter((s) => s !== size)
          : [...current, size],
      };
    });
  }

  function confirmCustomSize() {
    const s = customSizeInput.trim().toUpperCase();
    if (!s) { setCustomSizeMode(false); return; }
    if (!allSizes.includes(s)) setExtraSizes((prev) => [...prev, s]);
    if (activeColorName) {
      setColorSizes((prev) => {
        const current = prev[activeColorName] ?? [];
        return { ...prev, [activeColorName]: current.includes(s) ? current : [...current, s] };
      });
    }
    setCustomSizeMode(false); setCustomSizeInput("");
  }

  // ── Submit ──
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
        onUpdated?.({
          tempId: editVariant.tempId,
          color: editColorName.trim(),
          colorHex: editColorHex,
          size: editSelectedSizes[0],
          photoUrl,
        });
        onClose(); return;
      }

      const variants: CreatedVariant[] = [];
      for (const color of selectedColors) {
        const sizes = colorSizes[color.name] ?? [];
        for (const size of sizes) {
          variants.push({
            tempId: crypto.randomUUID(),
            color: color.name,
            colorHex: color.hex,
            size,
            photoUrl,
            quantity: Math.max(1, parseInt(colorSizeQtys[color.name]?.[size] ?? "1", 10) || 1),
            unitCost: parsePriceBR(colorSizePrices[color.name]?.[size] ?? ""),
          });
        }
      }

      if (variants.length === 0) {
        setError("Selecione ao menos uma cor com tamanho.");
        setLoading(false); return;
      }

      onCreated?.(variants);
      onClose(); setPreview(null);
    } catch {
      setError("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // Contagem total de variantes a criar
  const totalVariants = selectedColors.reduce(
    (s, c) => s + (colorSizes[c.name]?.length ?? 0), 0
  );

  const activeSizes = activeColorName ? (colorSizes[activeColorName] ?? []) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <Palette size={15} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">
              {isEdit ? "Editar detalhe" : "Adicionar cores e tamanhos"}
            </h2>
            <p className="text-xs text-slate-400 truncate">{productName}</p>
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <div className="flex divide-x divide-slate-100" style={{ minHeight: 420 }}>

            {/* ── Col 1: Foto ── */}
            <div className="w-36 shrink-0 p-4 flex flex-col gap-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Foto</p>
              <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/40 transition overflow-hidden group">
                  {preview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={preview} alt="" className="w-full h-full object-cover" />
                    : <>
                        <ImagePlus size={22} className="text-slate-300 group-hover:text-blue-400 transition" />
                        <span className="text-[10px] text-slate-400 text-center px-2 leading-tight">Clique para<br />adicionar</span>
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

            {/* ── Col 2: Cores ── */}
            <div className="flex-1 p-4 flex flex-col gap-3 min-w-0 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {isEdit ? "Cor" : "Cores"} <span className="text-red-500">*</span>
                {!isEdit && <span className="ml-1 normal-case font-normal text-[10px] text-slate-400">(selecione uma ou mais)</span>}
              </p>

              {isEdit ? (
                /* ── Modo edição: seleção única ── */
                <>
                  <div className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 border transition-all"
                    style={{ backgroundColor: editColorHex, borderColor: isLight(editColorHex) ? "#e2e8f0" : editColorHex }}>
                    {editColorName
                      ? <span className="text-sm font-bold" style={{ color: isLight(editColorHex) ? "#1e293b" : "#fff" }}>{editColorName}</span>
                      : <span className="text-xs italic" style={{ color: isLight(editColorHex) ? "#94a3b8" : "rgba(255,255,255,.6)" }}>Selecione…</span>
                    }
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button type="button" onClick={() => { setEditingName(true); setTimeout(() => editNameRef.current?.focus(), 50); }}
                        className="p-1 rounded-md bg-black/10 hover:bg-black/20 transition"
                        style={{ color: isLight(editColorHex) ? "#475569" : "#fff" }}>
                        <Pencil size={11} />
                      </button>
                      <button type="button" onClick={() => editHexRef.current?.click()}
                        className="w-5 h-5 rounded-full border-2 shadow-sm"
                        style={{ backgroundColor: editColorHex, borderColor: isLight(editColorHex) ? "#cbd5e1" : "rgba(255,255,255,.5)" }} />
                      <input ref={editHexRef} type="color" value={editColorHex}
                        onChange={(e) => setEditColorHex(e.target.value)} className="sr-only" />
                    </div>
                  </div>
                  {editingName && (
                    <input ref={editNameRef} type="text" value={editColorName}
                      onChange={(e) => setEditColorName(e.target.value.toUpperCase())}
                      onBlur={() => { if (editColorName.trim()) setEditingName(false); }}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setEditingName(false); } }}
                      placeholder="Ex: AZUL PETRÓLEO"
                      className="w-full px-2.5 py-1.5 border border-blue-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
                  )}
                  <div className="grid grid-cols-5 gap-0.5">
                    {PRESET_COLORS.map((c) => {
                      const sel = editColorName === c.name;
                      return (
                        <button key={c.name} type="button" title={c.name}
                          onClick={() => { setEditColorName(c.name); setEditColorHex(c.hex); setEditingName(false); }}
                          className={`flex flex-col items-center gap-0.5 py-1 px-0.5 rounded-lg transition-all ${sel ? "bg-blue-50 ring-2 ring-blue-500 ring-offset-1" : "hover:bg-slate-50"}`}>
                          <span className="w-7 h-7 rounded-lg border border-black/10 shadow-sm shrink-0" style={{ backgroundColor: c.hex }} />
                          <span className={`text-[8px] leading-tight text-center w-full truncate px-0.5 ${sel ? "text-blue-600 font-semibold" : "text-slate-400"}`}>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* ── Modo criação: multi-select ── */
                <>
                  {/* Chips das cores selecionadas */}
                  {selectedColors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedColors.map((c) => {
                        const isActive = c.name === activeColorName;
                        const sizesCount = colorSizes[c.name]?.length ?? 0;
                        return (
                          <button key={c.name} type="button"
                            onClick={() => setActiveColorName(c.name)}
                            className={`flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full border-2 text-xs font-semibold transition-all ${
                              isActive ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"
                            }`}
                          >
                            <span className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />
                            <span className="text-slate-700">{c.name}</span>
                            {sizesCount > 0 && (
                              <span className="text-[10px] bg-blue-600 text-white rounded-full px-1.5 py-0.5 leading-none">{sizesCount}</span>
                            )}
                            <span
                              onClick={(e) => { e.stopPropagation(); toggleColor(c); }}
                              className="text-slate-300 hover:text-red-400 transition cursor-pointer"
                            >
                              <X size={11} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Paleta de cores */}
                  <div className="grid grid-cols-5 gap-0.5">
                    {allPresetColors.map((c) => {
                      const sel = !!selectedColors.find((s) => s.name === c.name);
                      return (
                        <button key={c.name} type="button" title={c.name}
                          onClick={() => toggleColor(c)}
                          className={`flex flex-col items-center gap-0.5 py-1 px-0.5 rounded-lg transition-all relative ${
                            sel ? "bg-blue-50 ring-2 ring-blue-500 ring-offset-1" : "hover:bg-slate-50"
                          }`}>
                          <span className="w-7 h-7 rounded-lg border border-black/10 shadow-sm shrink-0 relative" style={{ backgroundColor: c.hex }}>
                            {sel && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <Check size={12} className={isLight(c.hex) ? "text-slate-800" : "text-white"} />
                              </span>
                            )}
                          </span>
                          <span className={`text-[8px] leading-tight text-center w-full truncate px-0.5 ${sel ? "text-blue-600 font-semibold" : "text-slate-400"}`}>{c.name}</span>
                        </button>
                      );
                    })}

                    {/* Cor personalizada */}
                    {customColorMode ? (
                      <div className="col-span-5 mt-1 flex items-center gap-2 p-2 border border-blue-200 rounded-lg bg-blue-50">
                        <button type="button" onClick={() => hexPickerRef.current?.click()}
                          className="w-7 h-7 rounded-lg border border-black/10 shadow-sm shrink-0 cursor-pointer"
                          style={{ backgroundColor: customColorHex }} />
                        <input ref={hexPickerRef} type="color" value={customColorHex}
                          onChange={(e) => setCustomColorHex(e.target.value)} className="sr-only" />
                        <input ref={customColorNameRef} type="text" value={customColorName}
                          onChange={(e) => setCustomColorName(e.target.value.toUpperCase())}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomColor(); } if (e.key === "Escape") setCustomColorMode(false); }}
                          placeholder="Nome da cor" autoFocus
                          className="flex-1 min-w-0 px-2 py-1 border border-blue-300 rounded-lg text-xs focus:outline-none uppercase bg-white" />
                        <button type="button" onClick={addCustomColor} className="text-green-500 hover:text-green-600"><Check size={14} /></button>
                        <button type="button" onClick={() => setCustomColorMode(false)} className="text-slate-300 hover:text-slate-500"><X size={14} /></button>
                      </div>
                    ) : (
                      <button type="button"
                        onClick={() => setCustomColorMode(true)}
                        className="flex flex-col items-center gap-0.5 py-1 px-0.5 rounded-lg hover:bg-slate-50 transition">
                        <span className="w-7 h-7 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center shrink-0">
                          <Plus size={12} className="text-slate-300" />
                        </span>
                        <span className="text-[8px] text-slate-300 leading-tight">outra</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ── Col 3: Tamanhos ── */}
            <div className="w-80 shrink-0 p-4 flex flex-col gap-4 overflow-y-auto">

              {isEdit ? (
                /* ── Modo edição: tamanho único ── */
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Tamanho <span className="text-red-500">*</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {[...SIZES, ...extraSizes].map((s) => {
                      const sel = editSelectedSizes.includes(s);
                      return (
                        <button key={s} type="button" onClick={() => setEditSelectedSizes([s])}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                            sel ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                          }`}>{s}</button>
                      );
                    })}
                  </div>
                </>
              ) : activeColorName ? (
                /* ── Modo criação: tamanhos da cor ativa ── */
                <>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: selectedColors.find((c) => c.name === activeColorName)?.hex }} />
                    <p className="text-xs font-semibold text-slate-700 truncate">{activeColorName}</p>
                    <span className="text-[10px] text-slate-400 normal-case font-normal">— selecione os tamanhos</span>
                  </div>

                  {/* Botões de tamanho */}
                  <div className="flex flex-wrap gap-1">
                    {allSizes.map((s) => {
                      const sel = activeSizes.includes(s);
                      return (
                        <button key={s} type="button" onClick={() => toggleSize(s)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                            sel ? "bg-blue-600 text-white border-blue-600 shadow-sm scale-105" : "bg-white text-slate-500 border-slate-200 hover:border-blue-300"
                          }`}>{s}</button>
                      );
                    })}
                    {customSizeMode ? (
                      <div className="flex items-center gap-1 w-full mt-1">
                        <input ref={customSizeRef} autoFocus value={customSizeInput}
                          onChange={(e) => setCustomSizeInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmCustomSize(); } if (e.key === "Escape") setCustomSizeMode(false); }}
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

                  {/* Qtd + Custo por tamanho */}
                  {activeSizes.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className="w-12 shrink-0" />
                        <span className="w-20 shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">Qtd.</span>
                        <span className="flex-1 text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">Custo unit.</span>
                      </div>
                      <div className="space-y-2">
                        {activeSizes.map((size) => (
                          <div key={size} className="flex items-center gap-2">
                            <span className="w-12 shrink-0 text-center text-xs font-bold text-white bg-blue-600 rounded-lg py-2">{size}</span>
                            <input type="number" min="1" placeholder="1"
                              value={colorSizeQtys[activeColorName]?.[size] ?? ""}
                              onChange={(e) => setColorSizeQtys((prev) => ({
                                ...prev,
                                [activeColorName]: { ...(prev[activeColorName] ?? {}), [size]: e.target.value },
                              }))}
                              className="w-20 shrink-0 px-2 py-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300" />
                            <input type="text" inputMode="decimal" placeholder="R$ 0,00"
                              value={colorSizePrices[activeColorName]?.[size] ?? ""}
                              onChange={(e) => setColorSizePrices((prev) => ({
                                ...prev,
                                [activeColorName]: { ...(prev[activeColorName] ?? {}), [size]: e.target.value },
                              }))}
                              className="flex-1 min-w-0 px-2 py-2 border border-slate-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-300" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeSizes.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-6 border-2 border-dashed border-slate-100 rounded-xl">
                      <p className="text-xs text-slate-400">Selecione os tamanhos<br />disponíveis para {activeColorName}</p>
                    </div>
                  )}
                </>
              ) : (
                /* Nenhuma cor selecionada */
                <div className="flex-1 flex flex-col items-center justify-center text-center py-6 border-2 border-dashed border-slate-100 rounded-xl">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Selecione uma cor ao lado<br />para configurar os tamanhos
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Rodapé ── */}
          <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            {error && (
              <p className="flex-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            {!error && !isEdit && (
              <div className="flex-1 flex flex-wrap items-center gap-2">
                {selectedColors.map((c) => {
                  const sizes = colorSizes[c.name] ?? [];
                  return (
                    <span key={c.name} className="flex items-center gap-1 text-xs text-slate-500">
                      <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: c.hex }} />
                      <span className="font-medium">{c.name}</span>
                      {sizes.length > 0 && <span className="text-slate-400">({sizes.join(", ")})</span>}
                    </span>
                  );
                })}
              </div>
            )}
            {!error && isEdit && <div className="flex-1" />}
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition font-medium">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold transition shadow-sm">
                {loading ? "Salvando…"
                  : isEdit ? "Salvar alterações"
                  : totalVariants > 0 ? `Adicionar ${totalVariants} variação${totalVariants !== 1 ? "ões" : ""}`
                  : "Adicionar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
