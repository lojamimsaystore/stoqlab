"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Info, Lock, Shield } from "lucide-react";
import { ACTION_GROUPS, resolveActionPermissions } from "@/lib/action-permissions";
import type { ActionKey } from "@/lib/action-permissions";
import { saveActionPermissionsAction } from "./actions";

const ROLES = [
  { key: "manager",        label: "Gerente",            color: "text-blue-700 bg-blue-50" },
  { key: "seller",         label: "Vendedor",           color: "text-emerald-700 bg-emerald-50" },
  { key: "stock_operator", label: "Op. Estoque",        color: "text-amber-700 bg-amber-50" },
] as const;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2 rounded-lg text-sm transition"
    >
      {pending ? "Salvando…" : "Salvar permissões"}
    </button>
  );
}

export function TabPermissoes({
  savedActionPermissions,
}: {
  savedActionPermissions: Record<string, ActionKey[]> | undefined;
}) {
  const [state, formAction] = useFormState(saveActionPermissionsAction, {});

  // Resolve defaults para cada role (mesclando com o que foi salvo)
  const resolved: Record<string, Set<ActionKey>> = {};
  for (const r of ROLES) {
    resolved[r.key] = resolveActionPermissions(r.key, savedActionPermissions);
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <Shield size={18} className="text-blue-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">Permissões de ações e informações</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Controle quais botões e informações cada tipo de usuário pode ver dentro do sistema.
          </p>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
        <Info size={13} className="shrink-0" />
        <span>
          O <strong>Proprietário</strong> sempre tem acesso total e não aparece aqui.
          Alterações afetam todos os usuários do tipo correspondente imediatamente.
        </span>
      </div>

      <form action={formAction} className="space-y-6">
        {/* Cabeçalho da tabela */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Header de roles */}
          <div className="grid grid-cols-[1fr_repeat(3,80px)] border-b border-slate-200 bg-slate-50">
            <div className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Ação / Informação
            </div>
            {ROLES.map((r) => (
              <div key={r.key} className="py-3 text-center">
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${r.color}`}>
                  {r.label}
                </span>
              </div>
            ))}
          </div>

          {/* Grupos */}
          {ACTION_GROUPS.map((group) => (
            <div key={group.label}>
              {/* Título do grupo */}
              <div className={`px-4 py-2 text-xs font-bold uppercase tracking-wide border-b border-slate-100 ${
                group.type === "info"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-50 text-slate-500"
              }`}>
                {group.type === "info" ? "📊 " : "🔧 "}{group.label}
              </div>

              {/* Itens */}
              {group.items.map((item, idx) => (
                <div
                  key={item.key}
                  className={`grid grid-cols-[1fr_repeat(3,80px)] border-b border-slate-100 last:border-0 ${
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                  }`}
                >
                  <div className="px-4 py-3 text-sm text-slate-700">
                    {item.label}
                  </div>

                  {/* Owner — sempre bloqueado/habilitado */}
                  {/* (não renderizado — owner não aparece na matriz) */}

                  {ROLES.map((r) => {
                    const isChecked = resolved[r.key]?.has(item.key) ?? false;
                    const inputName = `ap_${r.key}_${item.key}`;
                    return (
                      <div key={r.key} className="flex items-center justify-center py-3">
                        <input
                          type="checkbox"
                          name={inputName}
                          value="1"
                          defaultChecked={isChecked}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Feedback */}
        {state.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            Permissões salvas com sucesso.
          </p>
        )}

        {/* Ações */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lock size={12} />
            Salvo em tempo real — afeta todos os usuários imediatamente
          </div>
          <SaveButton />
        </div>
      </form>
    </div>
  );
}
