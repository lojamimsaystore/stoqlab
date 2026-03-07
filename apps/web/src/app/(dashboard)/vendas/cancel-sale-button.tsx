"use client";

import { useRouter } from "next/navigation";
import { cancelSaleAction } from "./actions";

export function CancelSaleButton({ id }: { id: string }) {
  const router = useRouter();

  async function handle() {
    if (!confirm("Cancelar esta venda? O estoque não será revertido automaticamente.")) return;
    await cancelSaleAction(id);
    router.refresh();
  }

  return (
    <button
      onClick={handle}
      className="text-xs text-red-500 hover:text-red-700 font-medium"
    >
      Cancelar
    </button>
  );
}
