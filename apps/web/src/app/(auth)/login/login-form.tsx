"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle, Lock } from "lucide-react";
import { loginAction } from "./actions";
import { GoogleButton } from "@/components/auth/google-button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [state, action] = useFormState(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  useEffect(() => {
    if (state.success) {
      router.push(next);
      router.refresh();
    }
  }, [state.success, router, next]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      {/* Logo */}
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl mb-4">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Stoqlab</h1>
        <p className="text-sm text-slate-500 mt-0.5">Entre na sua conta para continuar</p>
      </div>

      {/* Login com Google */}
      <div className="mb-5">
        <GoogleButton next={next} />
        <div className="flex items-center gap-3 mt-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400">ou entre com e-mail</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>
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

        <div>
          <label htmlFor="senha" className="block text-sm font-medium text-slate-700 mb-1.5">
            Senha
          </label>
          <div className="relative">
            <input
              id="senha"
              name="senha"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
              placeholder="••••••••"
              onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
              onBlur={() => setCapsLock(false)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {capsLock && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-amber-600">
              <Lock size={12} />
              Caps Lock está ativado
            </div>
          )}
        </div>

        <div className="text-right -mt-1">
          <button
            type="button"
            onClick={() => router.push("/esqueci-senha")}
            className="text-xs text-blue-600 hover:underline"
          >
            Esqueci minha senha
          </button>
        </div>

        {state.error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <AlertCircle size={15} className="shrink-0" />
            {state.error}
          </div>
        )}

        <SubmitButton />
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Não tem conta?{" "}
        <Link href="/registro" className="text-blue-600 font-medium hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </div>
  );
}
