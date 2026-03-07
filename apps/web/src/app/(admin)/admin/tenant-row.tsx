"use client";

import { useState } from "react";
import { changeTenantPlanAction, toggleTenantActiveAction } from "./actions";
import { useRouter } from "next/navigation";

const PLAN_LABELS: Record<string, string> = {
  trial: "Free Trial",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
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
};

export function TenantRow({ tenant }: { tenant: Tenant }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

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

  const isActive = tenant.is_active !== false;

  return (
    <tr className={`hover:bg-slate-50 ${!isActive ? "opacity-50" : ""}`}>
      <td className="px-4 py-3">
        <span className="font-medium text-slate-900">{tenant.name}</span>
        <p className="text-xs text-slate-400 mt-0.5">
          {new Date(tenant.created_at).toLocaleDateString("pt-BR")}
        </p>
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
          <option value="enterprise">Enterprise</option>
          <option value="vitalicio">Vitalício</option>
        </select>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {isActive ? "Ativo" : "Inativo"}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleToggle}
          disabled={saving}
          className="text-xs text-slate-400 hover:text-slate-700 font-medium disabled:opacity-50"
        >
          {isActive ? "Desativar" : "Ativar"}
        </button>
      </td>
    </tr>
  );
}
