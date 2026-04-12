"use client";
/* eslint-disable @next/next/no-img-element */

import { useFormState, useFormStatus } from "react-dom";
import { useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, X } from "lucide-react";

import { SIZES } from "@stoqlab/validators";

type Category = { id: string; name: string };
type ProductState = { error?: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition"
    >
      {pending ? "Salvando..." : "Cadastrar produto"}
    </button>
  );
}

export function NewProductForm({
  action,
  categories,
}: {
  action: (prev: ProductState, formData: FormData) => Promise<ProductState>;
  categories: Category[];
}) {
  const [state, formAction] = useFormState(action, {});
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [colorHex, setColorHex] = useState("#000000");

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
  }

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data">
      {/* Foto */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Foto do produto
        </label>
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-500 transition overflow-hidden shrink-0"
          >
            {preview ? (
              <img src={preview} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <>
                <ImagePlus size={22} />
                <span className="text-xs">Adicionar</span>
              </>
            )}
          </button>
          {preview && (
            <button
              type="button"
              onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 mt-1"
            >
              <X size={14} /> Remover
            </button>
          )}
          <input
            ref={fileRef}
            name="photo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhoto}
          />
        </div>
      </div>

      {/* Nome e Categoria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nome do produto <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Blusa Feminina Básica"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Categoria
          </label>
          <select
            name="categoryId"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Descrição
          </label>
          <input
            name="description"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Observações sobre o produto..."
          />
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Variação: cor e tamanho */}
      <div>
        <p className="text-sm font-semibold text-slate-900 mb-3">Variação</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Cor <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="h-[38px] w-12 rounded border border-slate-300 cursor-pointer p-0.5 shrink-0"
              />
              <input
                name="colorHex"
                type="text"
                value={colorHex}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColorHex(v);
                }}
                maxLength={7}
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="#000000"
              />
              <input
                name="color"
                required
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Preto, Azul marinho..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tamanho <span className="text-red-500">*</span>
            </label>
            <select
              name="size"
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecione...</option>
              {SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Estoque e valores */}
      <div>
        <p className="text-sm font-semibold text-slate-900 mb-3">Estoque e valores</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quantidade
            </label>
            <input
              name="quantity"
              type="number"
              min="0"
              defaultValue="0"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Valor de venda (R$)
            </label>
            <input
              name="salePrice"
              type="number"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Custo de compra (R$)
            </label>
            <input
              name="costPrice"
              type="number"
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0,00"
            />
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* Compra */}
      <div>
        <p className="text-sm font-semibold text-slate-900 mb-3">Compra com fornecedor</p>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Data da compra
          </label>
          <input
            name="purchaseDate"
            type="date"
            className="w-full sm:w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton />
        <Link href="/produtos" className="text-sm text-slate-500 hover:text-slate-700 font-medium">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
