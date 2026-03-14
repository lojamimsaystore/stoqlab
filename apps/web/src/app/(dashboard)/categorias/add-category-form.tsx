"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createCategoryAction } from "./actions";
import { useEffect, useRef } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Criar categoria"
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-4 py-2 rounded-lg text-sm transition shrink-0"
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
      {pending ? "Salvando…" : "Nova categoria"}
    </button>
  );
}

export function AddCategoryForm() {
  const [state, formAction] = useFormState(createCategoryAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !("error" in state) && formRef.current) {
      formRef.current.reset();
      toast.success("Categoria criada com sucesso");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex items-start gap-3">
      <div className="flex-1">
        <input
          name="name"
          required
          placeholder="Ex: Blusas, Calças, Vestidos…"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 placeholder:text-slate-400 transition"
        />
        {state && "error" in state && state.error && (
          <p className="text-xs text-red-500 mt-1">{state.error}</p>
        )}
      </div>
      <SubmitButton />
    </form>
  );
}
