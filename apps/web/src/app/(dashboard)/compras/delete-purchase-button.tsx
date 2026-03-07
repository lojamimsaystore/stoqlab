"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { deletePurchaseAction } from "./actions";

export function DeletePurchaseButton({ id }: { id: string }) {
  const router = useRouter();

  async function handle() {
    if (!confirm("Remover esta compra? O estoque não será revertido automaticamente.")) return;
    await deletePurchaseAction(id);
    router.refresh();
  }

  return (
    <button onClick={handle} className="text-slate-400 hover:text-red-600 transition-colors">
      <Trash2 size={16} />
    </button>
  );
}
