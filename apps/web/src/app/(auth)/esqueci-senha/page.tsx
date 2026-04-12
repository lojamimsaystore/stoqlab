"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Mail, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { forgotPasswordAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? "Enviando…" : "Enviar link de recuperação"}
    </button>
  );
}

export default function EsqueciSenhaPage() {
  const [state, action] = useFormState(forgotPasswordAction, {});

  if (state.success) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50">
          <CheckCircle2 size={24} className="text-emerald-500" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Verifique seu e-mail</h1>
          <p className="text-sm text-slate-500 mt-1">
            Se esse e-mail estiver cadastrado, você receberá um link para redefinir sua senha em instantes.
          </p>
        </div>
        <Link href="/login" className="inline-block text-sm text-blue-600 font-medium hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl mb-4">
          <Mail size={18} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Esqueceu a senha?</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Digite seu e-mail e enviaremos um link para redefinir sua senha.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
            placeholder="seu@email.com"
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

      <Link
        href="/login"
        className="mt-5 flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft size={14} />
        Voltar para o login
      </Link>
    </div>
  );
}
