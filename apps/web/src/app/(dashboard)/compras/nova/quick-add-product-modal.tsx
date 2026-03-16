"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

type Category = { id: string; name: string };
type PendingProduct = { tempId: string; name: string; categoryId?: string };

export function QuickAddProductModal({
  open,
  onClose,
  onCreated,
  onUpdated,
  defaultName,
  editProduct,
  categories = [],
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (product: PendingProduct) => void;
  onUpdated?: (product: PendingProduct) => void;
  defaultName?: string;
  editProduct?: PendingProduct;
  categories?: Category[];
}) {
  const isEdit = !!editProduct;
  const [error, setError] = useState("");
  const [nameValue, setNameValue] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    if (open) {
      setError("");
      setNameValue(isEdit ? (editProduct?.name ?? "") : (defaultName?.toUpperCase() ?? ""));
      setCategoryId(isEdit ? (editProduct?.categoryId ?? "") : "");
    }
  }, [open, isEdit, editProduct, defaultName]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = nameValue.trim();
    if (!name) { setError("Nome obrigatório."); return; }

    const product: PendingProduct = {
      tempId: isEdit ? editProduct!.tempId : crypto.randomUUID(),
      name,
      categoryId: categoryId || undefined,
    };

    if (isEdit) {
      onUpdated?.(product);
    } else {
      onCreated?.(product);
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

          {categories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
              >
                <option value="">Sem categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

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
