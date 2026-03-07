"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useRef } from "react";
import { createLocationAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
      {pending ? "Salvando..." : "Adicionar localização"}
    </button>
  );
}

export function AddLocationForm() {
  const [state, formAction] = useFormState(createLocationAction, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error && ref.current) ref.current.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="flex flex-col sm:flex-row gap-3">
      <input name="name" required placeholder="Nome (ex: Loja Centro, Depósito)"
        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <select name="type"
        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
        <option value="store">Loja</option>
        <option value="warehouse">Depósito</option>
      </select>
      <SubmitButton />
      {state.error && <p className="text-xs text-red-500 mt-1">{state.error}</p>}
    </form>
  );
}
