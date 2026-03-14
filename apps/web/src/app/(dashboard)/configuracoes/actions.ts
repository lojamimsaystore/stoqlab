"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/auth";

// ─── Dados da loja ────────────────────────────────────────────

export async function updateTenantAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const tenantId = await getTenantId();
  const name = (formData.get("name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;

  if (!name) return { error: "Nome obrigatório" };

  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ name, settings: { phone, address } })
    .eq("id", tenantId);

  if (error) return { error: "Erro ao atualizar dados da loja." };

  revalidatePath("/configuracoes");
  revalidatePath("/");
  return { success: true };
}

// ─── Minha conta ──────────────────────────────────────────────

export async function updateProfileAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nome obrigatório" };

  await supabaseAdmin
    .from("users")
    .update({ name })
    .eq("id", user.id);

  revalidatePath("/configuracoes");
  return { success: true };
}

export async function updatePasswordAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!password || password.length < 6) return { error: "Senha deve ter ao menos 6 caracteres." };
  if (password !== confirm) return { error: "As senhas não coincidem." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Erro ao atualizar senha." };

  return { success: true };
}

// ─── Localizações ─────────────────────────────────────────────

export async function createLocationAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const tenantId = await getTenantId();
  const name = (formData.get("name") as string)?.trim();
  const type = (formData.get("type") as string) || "store";

  if (!name) return { error: "Nome obrigatório" };

  const { error } = await supabaseAdmin.from("locations").insert({
    tenant_id: tenantId,
    name,
    type,
  });

  if (error) return { error: "Erro ao criar localização." };

  revalidatePath("/configuracoes");
  revalidatePath("/transferencias");
  return {};
}

export async function deleteLocationAction(id: string): Promise<void> {
  const tenantId = await getTenantId();
  await supabaseAdmin
    .from("locations")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath("/configuracoes");
  revalidatePath("/transferencias");
}

// ─── Usuários ─────────────────────────────────────────────────

// master is excluded — cannot be invited through tenant settings
const VALID_ROLES = ["owner", "manager", "seller", "stock_operator"] as const;

export async function inviteUserAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const tenantId = await getTenantId();
  const email = (formData.get("email") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const role = formData.get("role") as string;

  if (!email || !name) return { error: "Nome e e-mail obrigatórios." };
  if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) return { error: "Perfil inválido." };

  // Cria usuário no Supabase Auth
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(36)).join("").slice(0, 16) + "A1!",
  });

  if (authError) {
    if (authError.message.includes("already")) return { error: "Este e-mail já está cadastrado." };
    return { error: "Erro ao criar usuário." };
  }

  await supabaseAdmin.from("users").insert({
    id: authUser.user.id,
    tenant_id: tenantId,
    name,
    role,
    is_active: true,
  });

  revalidatePath("/configuracoes");
  return { success: true };
}

export async function updateUserRoleAction(id: string, role: string): Promise<void> {
  const tenantId = await getTenantId();
  if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) return;

  await supabaseAdmin
    .from("users")
    .update({ role })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath("/configuracoes");
}

export async function toggleUserActiveAction(id: string, active: boolean): Promise<void> {
  const tenantId = await getTenantId();
  await supabaseAdmin
    .from("users")
    .update({ is_active: active })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath("/configuracoes");
}
