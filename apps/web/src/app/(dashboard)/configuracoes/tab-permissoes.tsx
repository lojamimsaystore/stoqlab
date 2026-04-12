"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Info, Lock, Shield, ChevronDown, ChevronRight } from "lucide-react";
import { ACTION_GROUPS, resolveActionPermissions } from "@/lib/action-permissions";
import type { ActionKey } from "@/lib/action-permissions";
import { saveActionPermissionsAction } from "./actions";

const ROLES = [
  { key: "manager",        label: "Gerente",           color: "text-blue-700 bg-blue-100"   },
  { key: "seller",         label: "Vendedor",          color: "text-emerald-700 bg-emerald-100" },
  { key: "stock_operator", label: "Op. de Estoque",    color: "text-amber-700 bg-amber-100"  },
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
  const router = useRouter();

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);

  // Grupos abertos por padrão
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  function toggleGroup(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

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
            Controle quais botões e informações cada tipo de usuário pode ver.
            Clique em um grupo para expandir ou recolher.
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

      <form action={formAction} className="space-y-3">
        {ACTION_GROUPS.map((group) => {
          const isOpen = openGroups.has(group.label);

          return (
            <div
              key={group.label}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden"
            >
              {/* Cabeçalho do grupo — clicável */}
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                  group.type === "info"
                    ? "border-l-4 border-amber-400"
                    : "border-l-4 border-blue-400"
                }`}
              >
                {isOpen
                  ? <ChevronDown size={16} className="text-slate-400 shrink-0" />
                  : <ChevronRight size={16} className="text-slate-400 shrink-0" />
                }
                <span className="text-sm font-semibold text-slate-700 flex-1">
                  {group.type === "info" ? "📊 " : "🔧 "}
                  {group.label}
                </span>
                <span className="text-xs text-slate-400">
                  {group.items.length} {group.items.length === 1 ? "item" : "itens"}
                </span>
              </button>

              {/* Itens — visíveis apenas quando aberto */}
              {isOpen && (
                <div className="border-t border-slate-100">
                  {/* Header de colunas */}
                  <div className="grid grid-cols-[1fr_140px_140px_140px] bg-slate-50 border-b border-slate-100">
                    <div className="px-4 py-2 text-xs font-medium text-slate-400">
                      Ação / Informação
                    </div>
                    {ROLES.map((r) => (
                      <div key={r.key} className="py-2 flex items-center justify-center">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${r.color}`}>
                          {r.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Linhas de itens */}
                  {group.items.map((item, idx) => (
                    <div
                      key={item.key}
                      className={`grid grid-cols-[1fr_140px_140px_140px] border-b border-slate-100 last:border-0 ${
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <div className="px-4 py-3 text-sm text-slate-700">
                        {item.label}
                      </div>

                      {ROLES.map((r) => {
                        const isChecked = resolved[r.key]?.has(item.key) ?? false;
                        return (
                          <div key={r.key} className="flex items-center justify-center py-3">
                            <input
                              type="checkbox"
                              name={`ap_${r.key}_${item.key}`}
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
              )}
            </div>
          );
        })}

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
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lock size={12} />
            Afeta todos os usuários do tipo imediatamente após salvar
          </div>
          <SaveButton />
        </div>
      </form>
    </div>
  );
}
