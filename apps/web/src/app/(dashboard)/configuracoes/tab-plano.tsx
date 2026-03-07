"use client";

import { CheckCircle2 } from "lucide-react";

const PLANS = [
  {
    id: "trial",
    name: "Free Trial",
    price: "Grátis por 14 dias",
    features: ["1 loja", "2 usuários", "50 produtos"],
    color: "border-slate-200",
  },
  {
    id: "starter",
    name: "Starter",
    price: "R$ 97/mês",
    features: ["1 loja", "3 usuários", "500 produtos"],
    color: "border-blue-200",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 247/mês",
    features: ["Até 5 lojas", "15 usuários", "Produtos ilimitados", "Relatórios avançados"],
    color: "border-blue-500",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Sob consulta",
    features: ["Lojas ilimitadas", "Usuários ilimitados", "Suporte dedicado", "API pública"],
    color: "border-slate-200",
  },
];

const PLAN_LABELS: Record<string, string> = {
  trial: "Free Trial", starter: "Starter", pro: "Pro", enterprise: "Enterprise",
};

export function TabPlano({ tenant }: {
  tenant: { plan: string; trial_ends_at: string | null };
}) {
  const currentPlan = tenant.plan;

  return (
    <div>
      <h2 className="font-semibold text-slate-900 mb-1">Plano e cobrança</h2>
      <p className="text-sm text-slate-500 mb-2">
        Plano atual: <span className="font-semibold text-slate-800">{PLAN_LABELS[currentPlan] ?? currentPlan}</span>
      </p>
      {tenant.trial_ends_at && currentPlan === "trial" && (
        <p className="text-sm text-amber-600 mb-5">
          ⚠️ Trial expira em: {new Date(tenant.trial_ends_at).toLocaleDateString("pt-BR")}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-5">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div key={plan.id}
              className={`rounded-xl border-2 p-5 flex flex-col ${plan.color} ${plan.highlight ? "relative" : ""}`}>
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                  Recomendado
                </span>
              )}
              <div className="mb-3">
                <p className="font-bold text-slate-900">{plan.name}</p>
                <p className="text-sm text-slate-500 mt-0.5">{plan.price}</p>
              </div>
              <ul className="space-y-1.5 flex-1 mb-4">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="text-center text-sm font-medium text-emerald-600 bg-emerald-50 rounded-lg py-2">
                  Plano atual
                </span>
              ) : (
                <button
                  className={`text-sm font-medium py-2 rounded-lg transition ${
                    plan.highlight
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "border border-slate-300 hover:bg-slate-50 text-slate-700"
                  }`}
                  onClick={() => alert("Em breve: integração com Stripe")}
                >
                  {plan.id === "enterprise" ? "Falar com vendas" : "Fazer upgrade"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
