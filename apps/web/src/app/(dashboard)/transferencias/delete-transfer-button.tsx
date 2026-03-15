"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTransferAction } from "./actions";

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
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Excluir transferência"
      className="text-slate-300 hover:text-red-600 transition-colors disabled:opacity-50 p-1 rounded inline-flex"
    >
      <Trash2 size={15} />
    </button>
  );
}
