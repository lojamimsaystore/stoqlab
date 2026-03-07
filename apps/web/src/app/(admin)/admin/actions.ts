"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";

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

  const { error } = await supabaseAdmin
    .from("tenants")
    .update({
      plan,
      trial_ends_at: plan === "trial" ? null : null,
    })
    .eq("id", tenantId);

  if (error) return { error: "Erro ao atualizar plano." };

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

  revalidatePath("/admin");
  return {};
}
