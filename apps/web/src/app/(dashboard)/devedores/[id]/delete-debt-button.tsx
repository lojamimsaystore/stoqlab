"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteDebtAction } from "../actions";

export function DeleteDebtButton({ debtId }: { debtId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      await deleteDebtAction(debtId);
      router.push("/devedores");
    });
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Confirmar exclusão?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
        >
          {isPending ? "Excluindo…" : "Sim, excluir"}
        </button>
        <button onClick={() => setConfirm(false)} className="text-sm text-slate-400 hover:text-slate-600">
          Não
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 px-3 py-2 rounded-lg transition"
    >
      <Trash2 size={14} />
      Excluir dívida
    </button>
  );
}
