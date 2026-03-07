"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { createLocationAction, deleteLocationAction } from "./actions";
import { useRouter } from "next/navigation";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
      {pending ? "Adicionando..." : "Adicionar"}
    </button>
  );
}

const TYPE_LABELS: Record<string, string> = { store: "🏪 Loja", warehouse: "🏭 Depósito" };

export function TabLocalizacoes({ locations }: {
  locations: { id: string; name: string; type: string }[];
}) {
  const [state, formAction] = useFormState(createLocationAction, {});
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) ref.current?.reset();
  }, [state]);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover localização "${name}"?`)) return;
    await deleteLocationAction(id);
    router.refresh();
  }

  return (
    <div>
      <h2 className="font-semibold text-slate-900 mb-1">Localizações</h2>
      <p className="text-sm text-slate-500 mb-5">Lojas e depósitos onde seu estoque é gerenciado.</p>

      {/* Lista */}
      {locations.length > 0 && (
        <div className="mb-5 border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-2 font-medium text-slate-600">Nome</th>
                <th className="px-4 py-2 font-medium text-slate-600">Tipo</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locations.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{l.name}</td>
                  <td className="px-4 py-2.5 text-slate-500">{TYPE_LABELS[l.type] ?? l.type}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => handleDelete(l.id, l.name)}
                      className="text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Formulário */}
      <form ref={ref} action={formAction} className="flex flex-col sm:flex-row gap-3 max-w-lg">
        <input name="name" required placeholder="Nome (ex: Loja Centro, Depósito)"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select name="type"
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="store">Loja</option>
          <option value="warehouse">Depósito</option>
        </select>
        <SubmitButton />
      </form>
      {state.error && <p className="text-xs text-red-500 mt-2">{state.error}</p>}
    </div>
  );
}
