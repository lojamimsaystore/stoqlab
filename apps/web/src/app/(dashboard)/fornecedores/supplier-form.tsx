"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nome <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            defaultValue={defaultValues?.name}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nome do fornecedor"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            CNPJ
          </label>
          <input
            name="cnpj"
            defaultValue={defaultValues?.cnpj ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="00.000.000/0000-00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Telefone / WhatsApp
          </label>
          <input
            name="phone"
            defaultValue={defaultValues?.phone ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="(00) 00000-0000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            E-mail
          </label>
          <input
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="contato@fornecedor.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Endereço
          </label>
          <input
            name="address"
            defaultValue={defaultValues?.address ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Rua, número, cidade..."
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Observações
          </label>
          <textarea
            name="notes"
            defaultValue={defaultValues?.notes ?? ""}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Condições de pagamento, prazo de entrega..."
          />
        </div>
      </div>

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
