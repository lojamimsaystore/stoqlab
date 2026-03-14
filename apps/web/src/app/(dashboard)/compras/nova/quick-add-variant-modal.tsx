"use client";

import { useRef, useState, useEffect } from "react";
import { X, ImagePlus, Trash2, Pencil, Plus, Check } from "lucide-react";
import { SIZES } from "@stoqlab/validators";
import { uploadTempPhotoAction } from "@/app/(dashboard)/produtos/actions";

type PendingVariant = { tempId: string; color: string; colorHex?: string; size: string; photoUrl?: string };

const PRESET_COLORS = [
  { name: "PRETO",         hex: "#111111" },
  { name: "BRANCO",        hex: "#FFFFFF" },
  { name: "CINZA",         hex: "#9E9E9E" },
  { name: "CINZA CLARO",   hex: "#D9D9D9" },
  { name: "AZUL MARINHO",  hex: "#1A237E" },
  { name: "AZUL ROYAL",    hex: "#2962FF" },
  { name: "AZUL BEBÊ",     hex: "#90CAF9" },
  { name: "VERDE",         hex: "#2E7D32" },
  { name: "VERDE MILITAR", hex: "#4B5320" },
  { name: "AMARELO",       hex: "#FDD835" },
  { name: "LARANJA",       hex: "#EF6C00" },
  { name: "VERMELHO",      hex: "#C62828" },
  { name: "ROSA",          hex: "#E91E8C" },
  { name: "ROSA CLARO",    hex: "#F8BBD0" },
  { name: "ROXO",          hex: "#6A1B9A" },
  { name: "LILÁS",         hex: "#CE93D8" },
  { name: "VINHO",         hex: "#6D0000" },
  { name: "BORDÔ",         hex: "#880E4F" },
  { name: "BEGE",          hex: "#F5F0E8" },
  { name: "NUDE",          hex: "#E8C9A0" },
  { name: "CARAMELO",      hex: "#C68642" },
  { name: "MARROM",        hex: "#5D3A1A" },
  { name: "OFF WHITE",     hex: "#FAF9F6" },
  { name: "DOURADO",       hex: "#C9A84C" },
  { name: "PRATA",         hex: "#BDBDBD" },
];

const LIGHT_COLORS = new Set([
  "#FFFFFF", "#D9D9D9", "#90CAF9", "#FDD835",
  "#F8BBD0", "#CE93D8", "#F5F0E8", "#E8C9A0",
  "#FAF9F6", "#BDBDBD",
]);

export function QuickAddVariantModal({
  open,
  onClose,
  onCreated,
  onUpdated,
  productId,
  productName,
  editVariant,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (variant: PendingVariant) => void;
  onUpdated?: (variant: PendingVariant) => void;
  productId: string;
  productName: string;
  editVariant?: PendingVariant;
}) {
  const isEdit = !!editVariant;

  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cor
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#9E9E9E");
  const [editingName, setEditingName] = useState(false);

  // Tamanho
  const [selectedSize, setSelectedSize] = useState("");
  const [customSizeMode, setCustomSizeMode] = useState(false);
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [extraSizes, setExtraSizes] = useState<string[]>([]);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const hexInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customSizeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPreview(editVariant?.photoUrl ?? null);
      setError("");
      setEditingName(false);
      setCustomSizeMode(false);
      setCustomSizeInput("");
      setExtraSizes([]);

      if (isEdit && editVariant) {
        setColorName(editVariant.color);
        const preset = PRESET_COLORS.find((c) => c.name === editVariant.color);
        setColorHex(preset?.hex ?? "#9E9E9E");
        setSelectedSize(editVariant.size);
      } else {
        setColorName("");
        setColorHex("#9E9E9E");
        setSelectedSize("");
      }
    }
  }, [open, isEdit, editVariant]);

  if (!open) return null;

  const allSizes = [...SIZES, ...extraSizes];

  function selectPreset(name: string, hex: string) {
    setColorName(name);
    setColorHex(hex);
    setEditingName(false);
  }

  function handlePencilClick() {
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }

  function confirmCustomSize() {
    const s = customSizeInput.trim().toUpperCase();
    if (!s) { setCustomSizeMode(false); return; }
    if (!allSizes.includes(s)) setExtraSizes((prev) => [...prev, s]);
    setSelectedSize(s);
    setCustomSizeMode(false);
    setCustomSizeInput("");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  function handleRemovePhoto() {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const color = colorName.trim();
    const fd = new FormData(e.currentTarget);
    if (!color || !selectedSize) { setError("Preencha todos os campos."); return; }

    setLoading(true);
    setError("");
    try {
      let photoUrl: string | undefined = editVariant?.photoUrl;
      const photo = fd.get("photo") as File | null;
      if (photo && photo.size > 0) {
        const url = await uploadTempPhotoAction(fd);
        if (url) photoUrl = url;
      } else if (!preview) {
        photoUrl = undefined;
      }

      if (isEdit && editVariant) {
        onUpdated?.({ tempId: editVariant.tempId, color, colorHex, size: selectedSize, photoUrl });
      } else {
        onCreated?.({ tempId: crypto.randomUUID(), color, colorHex, size: selectedSize, photoUrl });
      }
      onClose();
      setPreview(null);
    } catch {
      setError("Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const isLight = LIGHT_COLORS.has(colorHex);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {isEdit ? "Editar detalhe" : "Novo detalhe"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{productName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} encType="multipart/form-data" className="p-6">
          <div className="flex gap-6">

            {/* ── Coluna esquerda: Foto + Tamanho ────────────── */}
            <div className="flex flex-col gap-4 w-44 shrink-0">

              {/* Foto */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Foto</p>
                <div className="relative w-full" style={{ aspectRatio: "3/4" }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-full border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50/40 transition overflow-hidden"
                  >
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <ImagePlus size={22} className="text-slate-300" />
                        <span className="text-[10px] text-slate-400 text-center px-1">Adicionar foto</span>
                      </>
                    )}
                  </button>
                  {preview && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 shadow transition"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} name="photo" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>

              {/* Tamanho */}
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 mb-2">
                  Tamanho <span className="text-red-500">*</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {allSizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border-2 transition-all ${
                        selectedSize === s
                          ? "bg-blue-600 text-white border-blue-600 scale-105"
                          : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
                      }`}
                    >
                      {s}
                    </button>
                  ))}

                  {/* Botão + para tamanho personalizado */}
                  {customSizeMode ? (
                    <div className="flex items-center gap-1 w-full mt-1">
                      <input
                        ref={customSizeRef}
                        autoFocus
                        value={customSizeInput}
                        onChange={(e) => setCustomSizeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmCustomSize(); } if (e.key === "Escape") setCustomSizeMode(false); }}
                        placeholder="Ex: 42"
                        className="flex-1 min-w-0 px-2 py-1 border border-blue-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                        maxLength={8}
                      />
                      <button type="button" onClick={confirmCustomSize} className="text-green-500 hover:text-green-600 transition">
                        <Check size={14} />
                      </button>
                      <button type="button" onClick={() => setCustomSizeMode(false)} className="text-slate-300 hover:text-slate-500 transition">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setCustomSizeMode(true); setTimeout(() => customSizeRef.current?.focus(), 50); }}
                      title="Adicionar tamanho personalizado"
                      className="px-2 py-1 rounded-lg text-xs font-semibold border-2 border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-500 transition flex items-center gap-0.5"
                    >
                      <Plus size={11} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── Coluna direita: Cor ─────────────────────────── */}
            <div className="flex-1 flex flex-col gap-3">
              <p className="text-sm font-medium text-slate-700">
                Cor <span className="text-red-500">*</span>
              </p>

              {/* Preview da cor */}
              <div
                className="w-full rounded-xl px-4 py-3 flex items-center justify-between gap-3 border transition-colors"
                style={{
                  backgroundColor: colorHex,
                  borderColor: isLight ? "#e2e8f0" : colorHex,
                }}
              >
                {colorName ? (
                  <span className="text-sm font-semibold tracking-wide" style={{ color: isLight ? "#334155" : "#ffffff" }}>
                    {colorName}
                  </span>
                ) : (
                  <span className="text-sm text-slate-400 italic">Selecione uma cor</span>
                )}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handlePencilClick}
                    title="Digitar nome da cor"
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/40 transition"
                    style={{ color: isLight ? "#475569" : "#ffffff" }}
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => hexInputRef.current?.click()}
                    title="Escolher cor personalizada"
                    className="w-6 h-6 rounded-full border-2 shadow cursor-pointer"
                    style={{ backgroundColor: colorHex, borderColor: isLight ? "#cbd5e1" : "rgba(255,255,255,0.5)" }}
                  />
                  <input ref={hexInputRef} type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="sr-only" />
                </div>
              </div>

              {/* Input de nome personalizado */}
              {editingName && (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value.toUpperCase())}
                  onBlur={() => { if (colorName.trim()) setEditingName(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setEditingName(false); } }}
                  placeholder="Ex: AZUL PETRÓLEO"
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              )}

              {/* Grid de cores */}
              <div className="grid grid-cols-5 gap-1">
                {PRESET_COLORS.map((c) => {
                  const selected = colorName === c.name;
                  return (
                    <button
                      key={c.name}
                      type="button"
                      title={c.name}
                      onClick={() => selectPreset(c.name, c.hex)}
                      className={`flex flex-col items-center gap-0.5 p-1 rounded-lg border-2 transition-all ${
                        selected
                          ? "border-blue-500 scale-105 shadow-sm"
                          : "border-transparent hover:border-slate-300"
                      }`}
                    >
                      <span
                        className="w-8 h-8 rounded-lg border border-slate-200 shadow-sm shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span className="text-[9px] text-slate-500 text-center leading-tight w-full truncate">
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Inputs hidden */}
              <input type="hidden" name="color" value={colorName} />
              <input type="hidden" name="colorHex" value={colorHex} />
            </div>
          </div>

          {/* Rodapé */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading || !colorName.trim() || !selectedSize}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2 rounded-lg text-sm transition"
              >
                {loading ? "Salvando..." : isEdit ? "Salvar alterações" : "Adicionar"}
              </button>
              <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 font-medium">
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
