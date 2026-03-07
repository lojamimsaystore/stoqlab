"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateProfileAction, updatePasswordAction } from "./actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2 rounded-lg text-sm transition">
      {pending ? "Salvando..." : label}
    </button>
  );
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário", manager: "Gerente", seller: "Vendedor", stock_operator: "Operador de estoque",
};

export function TabConta({ user }: {
  user: { id: string; name: string; email: string; role: string };
}) {
  const [profileState, profileAction] = useFormState(updateProfileAction, {});
  const [passwordState, passwordAction] = useFormState(updatePasswordAction, {});

  return (
    <div className="space-y-8">
      {/* Perfil */}
      <div>
        <h2 className="font-semibold text-slate-900 mb-1">Minha conta</h2>
        <p className="text-sm text-slate-500 mb-5">Seus dados pessoais e acesso.</p>

        <form action={profileAction} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
            <input name="name" required defaultValue={user.name}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input value={user.email} disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
            <p className="text-xs text-slate-400 mt-1">O e-mail não pode ser alterado por aqui.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Perfil de acesso</label>
            <input value={ROLE_LABELS[user.role] ?? user.role} disabled
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />
          </div>

          {profileState.error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{profileState.error}</p>}
          {profileState.success && <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">Nome atualizado!</p>}

          <SubmitButton label="Salvar nome" />
        </form>
      </div>

      <hr className="border-slate-100" />

      {/* Senha */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-1">Alterar senha</h3>
        <p className="text-sm text-slate-500 mb-5">Escolha uma senha com ao menos 6 caracteres.</p>

        <form action={passwordAction} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nova senha</label>
            <input name="password" type="password" required minLength={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar senha</label>
            <input name="confirm" type="password" required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••" />
          </div>

          {passwordState.error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{passwordState.error}</p>}
          {passwordState.success && <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">Senha alterada com sucesso!</p>}

          <SubmitButton label="Alterar senha" />
        </form>
      </div>
    </div>
  );
}
