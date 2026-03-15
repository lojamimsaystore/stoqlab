"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateInformacoesAction } from "./actions";
import {
  MODULES,
  CONFIGURABLE_ROLES,
  ROLE_META,
  DEFAULT_PERMISSIONS,
} from "@/lib/permissions";
import type { ModuleKey } from "@/lib/permissions";
import { Shield, AlertTriangle, Check } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-5 py-2 rounded-lg text-sm transition"
    >
      {pending ? "Salvando..." : "Salvar alterações"}
    </button>
  );
}

export function TabInformacoes({ settings }: { settings: Record<string, unknown> }) {
  const [state, formAction] = useFormState(updateInformacoesAction, {});

  const threshold =
    typeof settings.low_stock_threshold === "number" ? settings.low_stock_threshold : 5;

  const savedPerms = (settings.role_permissions as Record<string, string[]> | undefined) ?? {};

  return (
    <div>
      <h2 className="font-semibold text-slate-900 mb-1">Informações</h2>
      <p className="text-sm text-slate-500 mb-6">
        Preferências da loja e controle de acesso por perfil.
      </p>

      <form action={formAction} className="space-y-8">
        {/* ── Alertas ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <AlertTriangle size={15} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Alertas de estoque
            </h3>
          </div>
          <div className="flex items-center gap-4 max-w-sm">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Limite de estoque baixo
              </label>
              <p className="text-xs text-slate-400 mb-2">
                Itens com quantidade igual ou abaixo serão sinalizados como estoque baixo.
              </p>
              <div className="flex items-center gap-2">
                <input
                  name="low_stock_threshold"
                  type="number"
                  min={1}
                  max={99}
                  defaultValue={threshold}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-500">unidades</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Controle de acesso ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Shield size={15} className="text-blue-500" />
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Controle de acesso
            </h3>
          </div>
          <p className="text-sm text-slate-500">
            Defina quais módulos cada perfil pode acessar. O proprietário sempre tem acesso total.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600 w-48 sticky left-0 bg-slate-50 z-10">
                    Perfil
                  </th>
                  {MODULES.map((m) => (
                    <th
                      key={m.key}
                      className="px-2 py-3 font-medium text-slate-500 text-center whitespace-nowrap min-w-[70px]"
                    >
                      {m.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Proprietário — sempre total, imutável */}
                <tr className="bg-blue-50/40">
                  <td className="px-4 py-3 sticky left-0 bg-blue-50/40 z-10">
                    <p className="font-medium text-slate-800 text-sm">Proprietário</p>
                    <p className="text-xs text-slate-400">Acesso total (fixo)</p>
                  </td>
                  {MODULES.map((m) => (
                    <td key={m.key} className="px-2 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
                          <Check size={12} className="text-blue-600" strokeWidth={2.5} />
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Perfis configuráveis */}
                {CONFIGURABLE_ROLES.map((role) => {
                  const allowed: string[] =
                    savedPerms[role] && savedPerms[role].length > 0
                      ? savedPerms[role]
                      : DEFAULT_PERMISSIONS[role];

                  return (
                    <tr key={role} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 sticky left-0 bg-white hover:bg-slate-50/50 z-10">
                        <p className="font-medium text-slate-800 text-sm">{ROLE_META[role].label}</p>
                        <p className="text-xs text-slate-400">{ROLE_META[role].description}</p>
                      </td>
                      {MODULES.map((m) => {
                        const checked = allowed.includes(m.key as ModuleKey);
                        return (
                          <td key={m.key} className="px-2 py-3 text-center">
                            <input
                              type="checkbox"
                              name={`perm_${role}_${m.key}`}
                              value="1"
                              defaultChecked={checked}
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer focus:ring-blue-500 focus:ring-offset-0"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400">
            * As alterações afetam todos os usuários com o respectivo perfil imediatamente.
          </p>
        </section>

        {state.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            Informações atualizadas com sucesso!
          </p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}
