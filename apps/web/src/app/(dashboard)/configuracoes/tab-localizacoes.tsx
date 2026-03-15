"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef, useState, useTransition } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { createLocationAction, updateLocationAction, deleteLocationAction } from "./actions";
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

function LocationRow({
  location,
  onDelete,
}: {
  location: { id: string; name: string; type: string };
  onDelete: (id: string, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(location.name);
  const [type, setType] = useState(location.type);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setName(location.name);
    setType(location.type);
    setError("");
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancelEdit() {
    setEditing(false);
    setError("");
  }

  function saveEdit() {
    if (!name.trim()) { setError("Nome obrigatório"); return; }
    startTransition(async () => {
      const result = await updateLocationAction(location.id, name, type);
      if (result.error) { setError(result.error); return; }
      setEditing(false);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") cancelEdit();
  }

  if (editing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-4 py-2">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => { setName(e.target.value); setError(""); }}
            onKeyDown={handleKeyDown}
            className={`w-full px-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${error ? "border-red-400" : "border-blue-300"}`}
          />
          {error && <p className="text-[10px] text-red-500 mt-0.5">{error}</p>}
        </td>
        <td className="px-4 py-2">
          <select value={type} onChange={(e) => setType(e.target.value)}
            className="px-2 py-1.5 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="store">🏪 Loja</option>
            <option value="warehouse">🏭 Depósito</option>
          </select>
        </td>
        <td className="px-4 py-2 text-right">
          <div className="flex items-center justify-end gap-2">
            <button onClick={saveEdit} disabled={isPending}
              className="text-emerald-500 hover:text-emerald-600 disabled:opacity-50 transition-colors p-1">
              <Check size={15} />
            </button>
            <button onClick={cancelEdit} disabled={isPending}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1">
              <X size={15} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50 group">
      <td className="px-4 py-2.5 font-medium text-slate-900">{location.name}</td>
      <td className="px-4 py-2.5 text-slate-500">{TYPE_LABELS[location.type] ?? location.type}</td>
      <td className="px-4 py-2.5 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={startEdit} title="Editar"
            className="text-slate-400 hover:text-blue-600 transition-colors p-1">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(location.id, location.name)} title="Remover"
            className="text-slate-400 hover:text-red-600 transition-colors p-1">
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
}

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
    const result = await deleteLocationAction(id);
    if (result.error) {
      alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <h2 className="font-semibold text-slate-900 mb-1">Localizações</h2>
      <p className="text-sm text-slate-500 mb-5">Lojas e depósitos onde seu estoque é gerenciado.</p>

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
                <LocationRow key={l.id} location={l} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}

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
