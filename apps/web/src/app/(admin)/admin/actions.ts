"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { writeAuditLog } from "@/lib/audit";

const VALID_PLANS = ["trial", "starter", "pro", "enterprise", "vitalicio"] as const;

async function assertMaster() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "master") throw new Error("Acesso negado");
}

export async function changeTenantPlanAction(
  tenantId: string,
  plan: string
): Promise<{ error?: string }> {
  try {
    await assertMaster();
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Erro" };
  }

  if (!VALID_PLANS.includes(plan as typeof VALID_PLANS[number])) {
    return { error: "Plano inválido" };
  }

  const { data: before } = await supabaseAdmin
    .from("tenants")
    .select("id, plan, name")
    .eq("id", tenantId)
    .single();

  const { error } = await supabaseAdmin
    .from("tenants")
    .update({
      plan,
      trial_ends_at: plan === "trial" ? null : null,
    })
    .eq("id", tenantId);

  if (error) return { error: "Erro ao atualizar plano." };

  await writeAuditLog({
    tenantId,
    action: "tenant.plan_changed",
    tableName: "tenants",
    recordId: tenantId,
    oldData: before as unknown as Record<string, unknown>,
    newData: { plan },
  });

  revalidatePath("/admin");
  return {};
}

export async function deleteTenantAction(
  tenantId: string
): Promise<{ error?: string }> {
  try {
    await assertMaster();
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Erro" };
  }

  // 1. Busca todos os usuários do tenant antes de deletar
  const { data: tenantUsers } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("tenant_id", tenantId);

  // 2. Deleta cada usuário do auth.users (permite re-cadastro pelo mesmo email/Google)
  if (tenantUsers && tenantUsers.length > 0) {
    for (const u of tenantUsers) {
      await supabaseAdmin.auth.admin.deleteUser(u.id);
    }
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  await writeAuditLog({
    tenantId,
    action: "tenant.deleted",
    tableName: "tenants",
    recordId: tenantId,
    oldData: { ...tenant, deleted_users: tenantUsers } as unknown as Record<string, unknown>,
  });

  // 3. Soft delete no tenant
  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", tenantId);

  if (error) return { error: "Erro ao excluir lojista." };

  revalidatePath("/admin");
  return {};
}

export async function toggleTenantActiveAction(
  tenantId: string,
  active: boolean
): Promise<{ error?: string }> {
  try {
    await assertMaster();
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : "Erro" };
  }

  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ is_active: active })
    .eq("id", tenantId);

  if (error) return { error: "Erro ao atualizar status." };

  await writeAuditLog({
    tenantId,
    action: active ? "tenant.activated" : "tenant.deactivated",
    tableName: "tenants",
    recordId: tenantId,
    newData: { is_active: active },
  });

  revalidatePath("/admin");
  return {};
}
