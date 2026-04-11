"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { inviteUserAction, updateUserRoleAction, toggleUserActiveAction, deleteUserAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-4 py-2 rounded-lg text-sm transition">
      {pending ? "Convidando..." : "Convidar"}
    </button>
  );
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietário", manager: "Gerente", seller: "Vendedor", stock_operator: "Op. Estoque",
};
const ROLE_COLOR: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  seller: "bg-emerald-100 text-emerald-700",
  stock_operator: "bg-amber-100 text-amber-700",
};

export function TabUsuarios({ users, currentUserId }: {
  users: { id: string; name: string; email: string; role: string; is_active: boolean }[];
  currentUserId: string;
}) {
  const [state, formAction] = useFormState(inviteUserAction, {});
  const router = useRouter();

  async function handleRoleChange(id: string, role: string) {
    await updateUserRoleAction(id, role);
    router.refresh();
  }

  async function handleToggle(id: string, active: boolean) {
    await toggleUserActiveAction(id, active);
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    const result = await deleteUserAction(id);
    if (result.error) alert(result.error);
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-slate-900 mb-1">Usuários</h2>
        <p className="text-sm text-slate-500">Gerencie quem tem acesso ao sistema.</p>
      </div>

      {/* Lista de usuários */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left border-b border-slate-100">
              <th className="px-4 py-2 font-medium text-slate-600">Nome</th>
              <th className="px-4 py-2 font-medium text-slate-600">E-mail</th>
              <th className="px-4 py-2 font-medium text-slate-600">Perfil</th>
              <th className="px-4 py-2 font-medium text-slate-600 text-center">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <span className="font-medium text-slate-900">{u.name}</span>
                  {u.id === currentUserId && (
                    <span className="ml-2 text-xs text-slate-400">(você)</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-500 text-xs">{u.email}</td>
                <td className="px-4 py-2.5">
                  {u.id === currentUserId ? (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLOR[u.role] ?? ""}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  ) : (
                    <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {Object.entries(ROLE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {u.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {u.id !== currentUserId && (
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => handleToggle(u.id, !u.is_active)}
                        className="text-xs text-slate-400 hover:text-slate-700 font-medium">
                        {u.is_active ? "Desativar" : "Ativar"}
                      </button>
                      <button onClick={() => handleDelete(u.id, u.name)}
                        className="text-slate-300 hover:text-red-500 transition"
                        title="Excluir usuário">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <hr className="border-slate-100" />

      {/* Convidar */}
      <div>
        <h3 className="font-semibold text-slate-900 mb-1">Convidar usuário</h3>
        <p className="text-sm text-slate-500 mb-4">O usuário receberá acesso imediato ao sistema.</p>

        <form action={formAction} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input name="name" required placeholder="Nome completo"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="email" type="email" required placeholder="E-mail"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select name="role"
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="seller">Vendedor</option>
            <option value="stock_operator">Op. Estoque</option>
            <option value="manager">Gerente</option>
            <option value="owner">Proprietário</option>
          </select>
          <div className="sm:col-span-3 flex items-center gap-3">
            <SubmitButton />
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state.success && <p className="text-sm text-emerald-600">Usuário convidado com sucesso!</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
