import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { SettingsTabs } from "./settings-tabs";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const tenantId = await getTenantId();

  const [{ data: tenant }, { data: userProfile }, { data: locations }, { data: users }, { data: authData }] =
    await Promise.all([
      supabaseAdmin.from("tenants").select("id, name, plan, trial_ends_at, settings").eq("id", tenantId).single(),
      supabaseAdmin.from("users").select("id, name, role").eq("id", authUser.id).single(),
      supabaseAdmin.from("locations").select("id, name, type").eq("tenant_id", tenantId).is("deleted_at", null).order("name"),
      supabaseAdmin.from("users").select("id, name, role, is_active").eq("tenant_id", tenantId).neq("role", "master").is("deleted_at", null).order("name"),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);

  const emailMap: Record<string, string> = {};
  for (const u of authData?.users ?? []) {
    emailMap[u.id] = u.email ?? "";
  }

  const usersWithEmail = (users ?? []).map((u) => ({
    ...u,
    email: emailMap[u.id] ?? "",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie sua loja, conta e equipe.</p>
      </div>
      <SettingsTabs
        tenant={{ ...tenant!, settings: (tenant?.settings as Record<string, unknown>) ?? {} }}
        user={{ id: authUser.id, name: userProfile?.name ?? "", email: authUser.email ?? "", role: userProfile?.role ?? "seller" }}
        locations={locations ?? []}
        users={usersWithEmail}
        currentUserRole={userProfile?.role ?? "seller"}
      />
    </div>
  );
}
