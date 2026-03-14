"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { updateCategoryAction, deleteCategoryAction } from "./actions";
import { ConfirmDeleteDialog } from "@/components/ui/confirm-delete-dialog";

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
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (value.trim() === name) { setEditing(false); return; }
    startTransition(async () => {
      const res = await updateCategoryAction(id, value.trim());
      if (res.error) {
        setError(res.error);
        return;
      }
      toast.success(`Categoria renomeada para "${value.trim()}"`);
      setEditing(false);
      setError("");
    });
  }

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-5 py-3">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") { setEditing(false); setValue(name); setError(""); }
              }}
              className="flex-1 px-3 py-1.5 border border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSave}
              disabled={isPending}
              className="text-emerald-600 hover:text-emerald-700 transition p-1"
              title="Salvar"
              aria-label="Salvar nome"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => { setEditing(false); setValue(name); setError(""); }}
              className="text-slate-400 hover:text-slate-600 transition p-1"
              title="Cancelar"
              aria-label="Cancelar edição"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <span className="font-medium text-slate-900">{name}</span>
        )}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </td>
      <td className="px-5 py-3 text-slate-500 text-sm">
        {productCount} produto{productCount !== 1 ? "s" : ""}
      </td>
      <td className="px-5 py-3 text-right">
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-slate-500 hover:text-blue-600 font-medium transition"
          >
            Editar
          </button>
          <ConfirmDeleteDialog
            itemName={name}
            title="Remover categoria?"
            description={`A categoria "${name}" será removida. Os produtos vinculados a ela ficarão sem categoria.`}
            successMessage={`Categoria "${name}" removida com sucesso`}
            onConfirm={() => deleteCategoryAction(id)}
            iconSize={14}
          />
        </div>
      </td>
    </tr>
  );
}
