"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createCategoryAction } from "./actions";
import { useEffect, useRef } from "react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-4 py-2 rounded-lg text-sm transition"
    >
      {pending ? "Salvando..." : "Adicionar"}
    </button>
  );
}

export function AddCategoryForm() {
  const [state, formAction] = useFormState(createCategoryAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error && formRef.current) {
      formRef.current.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-start gap-3">
      <div className="flex-1">
        <input
          name="name"
          required
          placeholder="Nome da categoria (ex: Blusas, Calças...)"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {state.error && (
          <p className="text-xs text-red-500 mt-1">{state.error}</p>
        )}
      </div>
      <SubmitButton />
    </form>
  );
}
