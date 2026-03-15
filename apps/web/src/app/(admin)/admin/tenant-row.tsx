"use client";

import { useState } from "react";
import { changeTenantPlanAction, toggleTenantActiveAction, deleteTenantAction } from "./actions";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";

const ROLE_LABELS: Record<string, string> = {
  manager: "Gerente",
  seller: "Vendedor",
  stock_operator: "Estoque",
};

const ROLE_COLORS: Record<string, string> = {
  manager: "bg-blue-50 text-blue-600",
  seller: "bg-emerald-50 text-emerald-600",
  stock_operator: "bg-amber-50 text-amber-600",
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Free Trial",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Empresa (Stoqlab)",
  vitalicio: "Vitalício",
};

const PLAN_COLORS: Record<string, string> = {
  trial: "bg-slate-100 text-slate-600",
  starter: "bg-blue-100 text-blue-700",
  pro: "bg-indigo-100 text-indigo-700",
  enterprise: "bg-amber-100 text-amber-700",
  vitalicio: "bg-violet-100 text-violet-700",
};

type Tenant = {
  id: string;
  name: string;
  plan: string;
  trial_ends_at: string | null;
  is_active: boolean | null;
  user_count: number;
  created_at: string;
  owner: { name: string; email: string } | null;
  employees: { name: string; role: string }[];
};

export function TenantRow({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const hasEmployees = tenant.employees.length > 0;

  async function handlePlanChange(plan: string) {
    setSaving(true);
    await changeTenantPlanAction(tenant.id, plan);
    router.refresh();
    setSaving(false);
  }

  async function handleToggle() {
    setSaving(true);
    await toggleTenantActiveAction(tenant.id, !tenant.is_active);
    router.refresh();
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Excluir o lojista "${tenant.name}"? Esta ação não pode ser desfeita.`)) return;
    setSaving(true);
    await deleteTenantAction(tenant.id);
    router.refresh();
    setSaving(false);
  }

  const isActive = tenant.is_active !== false;

  return (
    <tr className={`hover:bg-slate-50 ${!isActive ? "opacity-50" : ""}`}>
      <td className="px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <span className="font-medium text-slate-900">{tenant.name}</span>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(tenant.created_at).toLocaleDateString("pt-BR")}
            </p>
          </div>
          {hasEmployees && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Ocultar funcionários" : "Ver funcionários"}
              className="mt-0.5 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>

        {/* Lista de funcionários */}
        {expanded && hasEmployees && (
          <div className="mt-2.5 pl-0.5 space-y-1.5 border-l-2 border-slate-100 pl-3">
            {tenant.employees.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-slate-700 leading-none">{e.name}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${ROLE_COLORS[e.role] ?? "bg-slate-100 text-slate-500"}`}>
                  {ROLE_LABELS[e.role] ?? e.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {tenant.owner ? (
          <>
            <span className="text-sm font-medium text-slate-800">{tenant.owner.name}</span>
            <p className="text-xs text-slate-400 mt-0.5">{tenant.owner.email}</p>
          </>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[tenant.plan] ?? "bg-slate-100 text-slate-600"}`}>
          {PLAN_LABELS[tenant.plan] ?? tenant.plan}
        </span>
        {tenant.plan === "trial" && tenant.trial_ends_at && (
          <p className="text-xs text-amber-500 mt-0.5">
            Expira {new Date(tenant.trial_ends_at).toLocaleDateString("pt-BR")}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-slate-600 text-center">
        {tenant.user_count}
      </td>
      <td className="px-4 py-3">
        <select
          disabled={saving}
          value={tenant.plan}
          onChange={(e) => handlePlanChange(e.target.value)}
          className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
        >
          <option value="trial">Free Trial</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Empresa (Stoqlab)</option>
          <option value="vitalicio">Vitalício</option>
        </select>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {isActive ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleToggle}
            disabled={saving}
            className="text-xs text-slate-400 hover:text-slate-700 font-medium disabled:opacity-50"
          >
            {isActive ? "Desativar" : "Ativar"}
          </button>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="text-slate-300 hover:text-red-600 transition-colors disabled:opacity-50"
            title="Excluir lojista"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}
