"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deletePaymentAction } from "../actions";

export function DeletePaymentButton({ paymentId, debtId }: { paymentId: string; debtId: string }) {
  const [confirm, setConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deletePaymentAction(paymentId, debtId);
      setConfirm(false);
    });
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
        >
          {isPending ? "…" : "Confirmar"}
        </button>
        <button onClick={() => setConfirm(false)} className="text-slate-400 hover:text-slate-600">
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-slate-300 hover:text-red-500 transition-colors"
      title="Excluir pagamento"
    >
      <Trash2 size={13} />
    </button>
  );
}
