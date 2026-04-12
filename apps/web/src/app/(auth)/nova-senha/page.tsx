"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Step = "loading" | "form" | "success" | "error";

export default function NovaSenhaPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setStep("error");
      } else {
        setStep("form");
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError("Erro ao redefinir senha. O link pode ter expirado.");
      setSaving(false);
      return;
    }

    setStep("success");
    setTimeout(() => router.push("/"), 2000);
  }

  if (step === "loading") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 flex flex-col items-center gap-3">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <p className="text-sm text-slate-500">Verificando link…</p>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Link inválido ou expirado</h1>
          <p className="text-sm text-slate-500 mt-1">
            Solicite um novo link de recuperação de senha.
          </p>
        </div>
        <a href="/esqueci-senha" className="inline-block text-sm text-blue-600 font-medium hover:underline">
          Solicitar novo link
        </a>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-50">
          <CheckCircle2 size={24} className="text-emerald-500" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Senha redefinida!</h1>
          <p className="text-sm text-slate-500 mt-1">Redirecionando para o sistema…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-600 rounded-xl mb-4">
          <KeyRound size={18} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Redefinir senha</h1>
        <p className="text-sm text-slate-500 mt-0.5">Digite sua nova senha abaixo.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
            Nova senha
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              autoComplete="new-password"
              required
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-1.5">
            Confirmar nova senha
          </label>
          <div className="relative">
            <input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(""); }}
              autoComplete="new-password"
              required
              placeholder="Repita a senha"
              className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((p) => !p)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 px-4 rounded-lg text-sm transition-colors"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          {saving ? "Salvando…" : "Redefinir senha"}
        </button>
      </form>
    </div>
  );
}
