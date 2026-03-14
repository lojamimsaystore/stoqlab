"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

type PendingProduct = { tempId: string; name: string; photoUrl?: string };

export function QuickAddProductModal({
  open,
  onClose,
  onCreated,
  onUpdated,
  defaultName,
  editProduct,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (product: PendingProduct) => void;
  onUpdated?: (product: PendingProduct) => void;
  defaultName?: string;
  editProduct?: PendingProduct;
}) {
  const isEdit = !!editProduct;
  const [error, setError] = useState("");
  const [nameValue, setNameValue] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setNameValue(isEdit ? (editProduct?.name ?? "") : (defaultName?.toUpperCase() ?? ""));
    }
  }, [open, isEdit, editProduct, defaultName]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = nameValue.trim();
    if (!name) { setError("Nome obrigatório."); return; }

    if (isEdit && editProduct) {
      onUpdated?.({ ...editProduct, name });
    } else {
      onCreated?.({ tempId: crypto.randomUUID(), name });
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? "Editar produto" : "Novo produto"}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              required
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: CAMISETA BÁSICA"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition"
            >
              {isEdit ? "Salvar alterações" : "Cadastrar produto"}
            </button>
            <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 font-medium">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
