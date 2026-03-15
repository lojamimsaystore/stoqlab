"use client";

import { Printer } from "lucide-react";

export function PrintReceiptButton({ id }: { id: string }) {
  function handleClick() {
    window.open(`/vendas/${id}?print=1`, "_blank");
  }

  return (
    <button
      onClick={handleClick}
      title="Imprimir comprovante"
      aria-label="Imprimir comprovante"
      className="text-slate-400 hover:text-emerald-600 transition-colors p-1 rounded inline-flex"
    >
      <Printer size={15} />
    </button>
  );
}
