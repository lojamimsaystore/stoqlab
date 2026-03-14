"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { SupplierFields } from "./supplier-fields";

type State = { error?: string };

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}

type Supplier = {
  name: string;
  cnpj?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export function SupplierForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (prev: State, formData: FormData) => Promise<State>;
  defaultValues?: Supplier;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <SupplierFields defaultValues={defaultValues} />

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton label={submitLabel} />
        <Link href="/fornecedores" className="text-sm text-slate-500 hover:text-slate-700 font-medium">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
