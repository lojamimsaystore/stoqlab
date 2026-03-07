"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateTenantAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
      {pending ? "Salvando..." : "Salvar alterações"}
    </button>
  );
}

export function TabLoja({ tenant }: {
  tenant: { name: string; settings: Record<string, string> };
}) {
  const [state, formAction] = useFormState(updateTenantAction, {});

  return (
    <div>
      <h2 className="font-semibold text-slate-900 mb-1">Dados da loja</h2>
      <p className="text-sm text-slate-500 mb-5">Informações gerais do seu negócio.</p>

      <form action={formAction} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nome da loja <span className="text-red-500">*</span>
          </label>
          <input name="name" required defaultValue={tenant.name}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
          <input name="phone" defaultValue={tenant.settings?.phone ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="(00) 00000-0000" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Endereço</label>
          <input name="address" defaultValue={tenant.settings?.address ?? ""}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Rua, número, cidade..." />
        </div>

        {state.error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">Dados atualizados com sucesso!</p>}

        <SubmitButton />
      </form>
    </div>
  );
}
