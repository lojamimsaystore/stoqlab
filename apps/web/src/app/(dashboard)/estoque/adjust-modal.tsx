"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { adjustInventoryAction } from "./actions";

type Variant = {
  id: string;
  color: string;
  size: string;
  sku: string;
  productName: string;
  locationId: string;
  locationName: string;
  quantity: number;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2 rounded-lg text-sm transition"
    >
      {pending ? "Salvando..." : "Confirmar ajuste"}
    </button>
  );
}

export function AdjustModal({
  variant,
  onClose,
}: {
  variant: Variant;
  onClose: () => void;
}) {
  const [state, formAction] = useFormState(adjustInventoryAction, {});

  useEffect(() => {
    if (state.success) onClose();
  }, [state.success]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Ajustar estoque</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 bg-slate-50 rounded-lg px-4 py-3 text-sm">
          <p className="font-medium text-slate-900">{variant.productName}</p>
          <p className="text-slate-500">{variant.color} · {variant.size} · {variant.sku}</p>
          <p className="text-slate-500 mt-1">Local: {variant.locationName}</p>
          <p className="text-slate-700 mt-1">Quantidade atual: <span className="font-semibold">{variant.quantity}</span></p>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="variantId" value={variant.id} />
          <input type="hidden" name="locationId" value={variant.locationId} />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nova quantidade <span className="text-red-500">*</span>
            </label>
            <input
              name="newQuantity"
              type="number"
              min="0"
              defaultValue={variant.quantity}
              required
              autoFocus
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Motivo (opcional)
            </label>
            <input
              name="note"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: Contagem física, perda, devolução..."
            />
          </div>

          {state.error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <SubmitButton />
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
