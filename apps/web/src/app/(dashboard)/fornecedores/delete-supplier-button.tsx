"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteSupplierAction } from "./actions";

export function DeleteSupplierButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();

  async function handle() {
    if (!confirm(`Remover fornecedor "${name}"?`)) return;
    await deleteSupplierAction(id);
    router.refresh();
  }

  return (
    <button onClick={handle} className="text-slate-400 hover:text-red-600 transition-colors">
      <Trash2 size={16} />
    </button>
  );
}
