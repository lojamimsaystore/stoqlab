"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { updateCategoryAction, deleteCategoryAction } from "./actions";

export function CategoryRow({
  id,
  name,
  productCount,
}: {
  id: string;
  name: string;
  productCount: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (value.trim() === name) { setEditing(false); return; }
    setLoading(true);
    const res = await updateCategoryAction(id, value.trim());
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setEditing(false);
    setError("");
  }

  async function handleDelete() {
    if (!confirm(`Remover categoria "${name}"?`)) return;
    await deleteCategoryAction(id);
  }

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50">
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
              className="px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
            />
            <button onClick={handleSave} disabled={loading} className="text-emerald-600 hover:text-emerald-700">
              <Check size={16} />
            </button>
            <button onClick={() => { setEditing(false); setValue(name); setError(""); }} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        ) : (
          <span className="text-slate-900 font-medium">{name}</span>
        )}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </td>
      <td className="px-4 py-3 text-slate-500 text-sm">{productCount} produto(s)</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => setEditing(true)} className="text-slate-400 hover:text-blue-600">
            <Pencil size={15} />
          </button>
          <button onClick={handleDelete} className="text-slate-400 hover:text-red-600">
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
