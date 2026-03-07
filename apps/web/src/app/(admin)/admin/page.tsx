import { supabaseAdmin } from "@/lib/supabase/service";
import { TenantRow } from "./tenant-row";
import { Building2, Users, CreditCard, Activity } from "lucide-react";

export default async function AdminPage() {
  const [{ data: tenants }, { data: users }, { data: authData }] = await Promise.all([
    supabaseAdmin
      .from("tenants")
      .select("id, name, plan, trial_ends_at, is_active, created_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("users")
      .select("id, tenant_id, name, role")
      .neq("role", "master")
      .is("deleted_at", null),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // Email map from auth
  const emailMap: Record<string, string> = {};
  for (const u of authData?.users ?? []) {
    emailMap[u.id] = u.email ?? "";
  }

  // Count users per tenant + find owner
  const userCountMap: Record<string, number> = {};
  const ownerMap: Record<string, { name: string; email: string }> = {};
  for (const u of users ?? []) {
    if (!u.tenant_id) continue;
    userCountMap[u.tenant_id] = (userCountMap[u.tenant_id] ?? 0) + 1;
    if (u.role === "owner") {
      ownerMap[u.tenant_id] = { name: u.name, email: emailMap[u.id] ?? "" };
    }
  }

  const tenantRows = (tenants ?? []).map((t) => ({
    ...t,
    is_active: t.is_active ?? true,
    user_count: userCountMap[t.id] ?? 0,
    owner: ownerMap[t.id] ?? null,
  }));

  // Stats
  const totalTenants = tenantRows.length;
  const activeTenants = tenantRows.filter((t) => t.is_active !== false).length;
  const totalUsers = users?.filter((u) => u.role !== "master").length ?? 0;
  const planCounts = tenantRows.reduce<Record<string, number>>((acc, t) => {
    acc[t.plan] = (acc[t.plan] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: "Lojistas cadastrados", value: totalTenants, icon: Building2, color: "text-blue-600 bg-blue-50" },
    { label: "Lojistas ativos", value: activeTenants, icon: Activity, color: "text-emerald-600 bg-emerald-50" },
    { label: "Usuários totais", value: totalUsers, icon: Users, color: "text-violet-600 bg-violet-50" },
    { label: "Planos pagos", value: (planCounts["starter"] ?? 0) + (planCounts["pro"] ?? 0) + (planCounts["enterprise"] ?? 0), icon: CreditCard, color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Painel Master</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie todos os lojistas e planos da plataforma.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            <div className={`p-2.5 rounded-lg ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Plan distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900 mb-4">Distribuição por plano</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { id: "trial", label: "Free Trial", color: "bg-slate-100 text-slate-700" },
            { id: "starter", label: "Starter", color: "bg-blue-100 text-blue-700" },
            { id: "pro", label: "Pro", color: "bg-indigo-100 text-indigo-700" },
            { id: "enterprise", label: "Enterprise", color: "bg-amber-100 text-amber-700" },
            { id: "vitalicio", label: "Vitalício", color: "bg-violet-100 text-violet-700" },
          ].map((p) => (
            <div key={p.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${p.color}`}>
              <span className="font-semibold text-lg">{planCounts[p.id] ?? 0}</span>
              <span className="text-sm">{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tenants table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Todos os lojistas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-2.5 font-medium text-slate-600">Loja</th>
                <th className="px-4 py-2.5 font-medium text-slate-600">Proprietário</th>
                <th className="px-4 py-2.5 font-medium text-slate-600">Plano atual</th>
                <th className="px-4 py-2.5 font-medium text-slate-600 text-center">Usuários</th>
                <th className="px-4 py-2.5 font-medium text-slate-600">Alterar plano</th>
                <th className="px-4 py-2.5 font-medium text-slate-600 text-center">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenantRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                    Nenhum lojista cadastrado.
                  </td>
                </tr>
              ) : (
                tenantRows.map((t) => <TenantRow key={t.id} tenant={t} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
