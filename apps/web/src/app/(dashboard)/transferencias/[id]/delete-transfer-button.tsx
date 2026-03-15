"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTransferAction } from "../actions";

export function DeleteTransferButton({ transferId }: { transferId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Excluir esta transferência? O estoque será revertido automaticamente.")) return;
    setLoading(true);
    const result = await deleteTransferAction(transferId);
    if (result.error) {
      alert(result.error);
      setLoading(false);
      return;
    }
    router.push("/transferencias");
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
    >
      <Trash2 size={15} />
      {loading ? "Excluindo…" : "Excluir transferência"}
    </button>
  );
}
