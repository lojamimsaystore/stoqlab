"use client";

import { Trash2 } from "lucide-react";
import { deleteProductAction } from "../actions";

export function DeleteProductButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  async function handleDelete() {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    await deleteProductAction(id);
  }

  return (
    <button
      onClick={handleDelete}
      className="text-xs text-red-500 hover:underline font-medium"
    >
      <Trash2 size={14} />
    </button>
  );
}
