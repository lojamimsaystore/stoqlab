"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import type { CustomerState } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition">
      {pending ? "Salvando..." : label}
    </button>
  );
}

type Customer = { name: string; phone?: string | null; email?: string | null; cpf?: string | null; birthdate?: string | null; address?: string | null; notes?: string | null };

export function CustomerForm({
  action, defaultValues, submitLabel,
}: {
  action: (prev: CustomerState, formData: FormData) => Promise<CustomerState>;
  defaultValues?: Customer;
  submitLabel: string;
}) {
  const [state, formAction] = useFormState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Nome <span className="text-red-500">*</span></label>
          <input name="name" required defaultValue={defaultValues?.name}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Maria Silva"
            autoCapitalize="words"
            style={{ textTransform: "none" }} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Telefone / WhatsApp</label>
          <input name="phone" defaultValue={defaultValues?.phone ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="(00) 00000-0000" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
          <input name="email" type="email" defaultValue={defaultValues?.email ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="cliente@email.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">CPF</label>
          <input name="cpf" defaultValue={defaultValues?.cpf ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="000.000.000-00" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Data de nascimento</label>
          <input name="birthdate" type="date" defaultValue={defaultValues?.birthdate ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
          <input name="address" defaultValue={defaultValues?.address ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Rua, número, bairro, cidade..." />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
          <textarea name="notes" defaultValue={defaultValues?.notes ?? ""} rows={2} resize-none
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Preferências, histórico, informações adicionais..." />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton label={submitLabel} />
        <Link href="/clientes" className="text-sm text-slate-500 hover:text-slate-700 font-medium">Cancelar</Link>
      </div>
    </form>
  );
}
