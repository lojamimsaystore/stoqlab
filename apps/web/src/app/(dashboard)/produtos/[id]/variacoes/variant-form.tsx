"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";
import { createVariantAction } from "../../actions";

const SIZES = ["PP", "P", "M", "G", "GG", "GGG", "Único", "34", "36", "38", "40", "42", "44", "46", "48", "50"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition"
    >
      {pending ? "Adicionando..." : "Adicionar variação"}
    </button>
  );
}

export function VariantForm({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const action = createVariantAction.bind(null, productId, productName);
  const [formState, boundAction] = useFormState(action, {});
  const [colorHex, setColorHex] = useState("#000000");

  return (
    <form action={boundAction} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Cor */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cor <span className="text-red-500">*</span>
          </label>
          <input
            name="color"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            placeholder="Ex: PRETO"
            onChange={(e) => { e.target.value = e.target.value.toUpperCase(); }}
          />
        </div>

        {/* Cor hex */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cor (hex)
          </label>
          <div className="flex gap-2">
            <input
              name="colorHex"
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="h-[38px] w-12 rounded border border-slate-300 cursor-pointer p-0.5"
            />
            <input
              type="text"
              value={colorHex}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColorHex(v);
              }}
              maxLength={7}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="#000000"
            />
          </div>
        </div>

        {/* Tamanho */}
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

        {/* SKU */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            SKU <span className="text-red-500">*</span>
          </label>
          <input
            name="sku"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: BLUSA-PRETO-M"
          />
        </div>

        {/* Código de barras */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Código de barras
          </label>
          <input
            name="barcode"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="EAN-13 ou código interno"
          />
        </div>

        {/* Preço */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Preço de venda (R$)
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

        {/* Estoque mínimo */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Estoque mínimo
          </label>
          <input
            name="minStock"
            type="number"
            min="0"
            defaultValue="0"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {formState.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {formState.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
