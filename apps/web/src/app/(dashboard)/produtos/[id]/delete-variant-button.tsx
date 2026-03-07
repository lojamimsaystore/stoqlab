"use client";

import { Trash2 } from "lucide-react";
import { deleteVariantAction } from "../actions";

export function DeleteVariantButton({
  id,
  productId,
  label,
}: {
  id: string;
  productId: string;
  label: string;
}) {
  async function handle() {
    if (!confirm(`Remover variação "${label}"?`)) return;
    await deleteVariantAction(id, productId);
  }

  return (
    <button onClick={handle} className="text-red-400 hover:text-red-600">
      <Trash2 size={15} />
    </button>
  );
}
