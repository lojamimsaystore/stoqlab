"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registrarAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition"
    >
      {pending ? "Criando conta..." : "Criar conta grátis"}
    </button>
  );
}

export default function RegistroPage() {
  const router = useRouter();
  const [state, action] = useFormState(registrarAction, {});

  useEffect(() => {
    if (state.success) {
      router.push("/");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <h2 className="text-xl font-semibold text-slate-900 mb-1">
        Criar sua conta
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        14 dias grátis, sem cartão de crédito
      </p>

      <form action={action} className="space-y-4">
        <div>
          <label
            htmlFor="nomeLoja"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Nome da loja
          </label>
          <input
            id="nomeLoja"
            name="nomeLoja"
            type="text"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="Ex: Moda Feminina da Ana"
          />
        </div>

        <div>
          <label
            htmlFor="nome"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Seu nome
          </label>
          <input
            id="nome"
            name="nome"
            type="text"
            autoComplete="name"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="Ana Silva"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="ana@minhaloja.com"
          />
        </div>

        <div>
          <label
            htmlFor="senha"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Senha
          </label>
          <input
            id="senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div>
          <label
            htmlFor="confirmarSenha"
            className="block text-sm font-medium text-slate-700 mb-1"
          >
            Confirmar senha
          </label>
          <input
            id="confirmarSenha"
            name="confirmarSenha"
            type="password"
            autoComplete="new-password"
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="••••••••"
          />
        </div>

        {state.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="text-blue-600 font-medium hover:underline"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
