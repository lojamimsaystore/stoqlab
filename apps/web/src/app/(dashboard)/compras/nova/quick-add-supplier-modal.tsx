"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";
import { X } from "lucide-react";
import { SupplierFields } from "@/app/(dashboard)/fornecedores/supplier-fields";
import { createSupplierInlineAction } from "@/app/(dashboard)/fornecedores/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2 rounded-lg text-sm transition"
    >
      {pending ? "Salvando..." : "Cadastrar fornecedor"}
    </button>
  );
}

type NewSupplier = { id: string; name: string };

export function QuickAddSupplierModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (supplier: NewSupplier) => void;
}) {
  const [state, action] = useFormState(createSupplierInlineAction, {});

  useEffect(() => {
    if (state.supplier) {
      onCreated(state.supplier);
      onClose();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.supplier]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Novo fornecedor</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <form action={action} className="p-6 space-y-5">
          <SupplierFields />

          {state.error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <div className="flex items-center gap-3">
            <SubmitButton />
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-slate-500 hover:text-slate-700 font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
