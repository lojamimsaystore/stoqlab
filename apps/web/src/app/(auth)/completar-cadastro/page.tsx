"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { completarCadastroAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? "Criando sua loja…" : "Criar minha loja"}
    </button>
  );
}

export default function CompletarCadastroPage() {
  const router = useRouter();
  const [state, formAction] = useFormState(completarCadastroAction, {});
  const [nome, setNome] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      // Pré-preenche o nome com o do Google
      const googleName = user.user_metadata?.full_name ?? user.user_metadata?.name ?? "";
      setNome(googleName);
      setLoadingUser(false);
    });
  }, [router]);

  useEffect(() => {
    if (!state.success) return;
    // Após criar o tenant, atualiza o JWT para incluir tenant_id
    const supabase = createClient();
    supabase.auth.refreshSession().then(() => {
      router.push("/");
      router.refresh();
    });
  }, [state.success, router]);

  if (loadingUser) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <p className="text-sm text-slate-500">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl mb-4">
          <Store size={18} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Quase lá!</h1>
        <p className="text-sm text-slate-500 mt-1">
          Conta Google conectada. Agora informe os dados da sua loja.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="nome" className="block text-sm font-medium text-slate-700 mb-1.5">
            Seu nome
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como você quer ser chamado"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
          />
        </div>

        <div>
          <label htmlFor="nomeLoja" className="block text-sm font-medium text-slate-700 mb-1.5">
            Nome da loja
          </label>
          <input
            id="nomeLoja"
            name="nomeLoja"
            type="text"
            required
            placeholder="Ex: Moda Feminina da Ana"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
          />
        </div>

        {state.error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <AlertCircle size={15} className="shrink-0" />
            {state.error}
          </div>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}
