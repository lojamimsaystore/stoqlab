"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

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

  const { data: existing } = await supabaseAdmin
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();
  const existingSettings = (existing?.settings as Record<string, unknown>) ?? {};

  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ name, settings: { ...existingSettings, phone, address } })
    .eq("id", tenantId);

  if (error) return { error: "Erro ao atualizar dados da loja." };

  revalidatePath("/configuracoes");
  revalidatePath("/");
  return { success: true };
}

// ─── Informações (preferências + permissões) ──────────────────

export async function updateInformacoesAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const tenantId = await getTenantId();

  const rawThreshold = parseInt(formData.get("low_stock_threshold") as string, 10);
  const low_stock_threshold = Number.isFinite(rawThreshold)
    ? Math.max(1, Math.min(99, rawThreshold))
    : 5;

  const roles = ["manager", "seller", "stock_operator"] as const;
  const moduleKeys = [
    "dashboard", "produtos", "categorias", "estoque", "compras",
    "vendas", "transferencias", "fornecedores", "clientes", "relatorios", "configuracoes",
  ];

  const role_permissions: Record<string, string[]> = {};
  for (const role of roles) {
    role_permissions[role] = moduleKeys.filter(
      (m) => formData.get(`perm_${role}_${m}`) === "1"
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();
  const existingSettings = (existing?.settings as Record<string, unknown>) ?? {};

  const { error } = await supabaseAdmin
    .from("tenants")
    .update({ settings: { ...existingSettings, low_stock_threshold, role_permissions } })
    .eq("id", tenantId);

  if (error) return { error: "Erro ao salvar informações." };

  revalidatePath("/", "layout");
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

export async function updateLocationAction(
  id: string,
  name: string,
  type: string,
): Promise<{ error?: string }> {
  const tenantId = await getTenantId();
  const trimmed = name.trim();
  if (!trimmed) return { error: "Nome obrigatório" };

  const { data: before } = await supabaseAdmin
    .from("locations")
    .select("id, name, type")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  const { error } = await supabaseAdmin
    .from("locations")
    .update({ name: trimmed, type })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: "Erro ao atualizar localização." };

  await writeAuditLog({
    tenantId,
    action: "location.updated",
    tableName: "locations",
    recordId: id,
    oldData: before as unknown as Record<string, unknown>,
    newData: { name: trimmed, type },
  });

  revalidatePath("/configuracoes");
  revalidatePath("/transferencias");
  return {};
}

export async function deleteLocationAction(id: string): Promise<{ error?: string }> {
  const tenantId = await getTenantId();

  const { data: inventoryItems } = await supabaseAdmin
    .from("inventory")
    .select("id, quantity")
    .eq("location_id", id)
    .gt("quantity", 0)
    .limit(1);

  if (inventoryItems && inventoryItems.length > 0) {
    return { error: "Esta localização possui estoque. Transfira ou zere o estoque antes de excluir." };
  }

  const { data: location } = await supabaseAdmin
    .from("locations")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  const { error } = await supabaseAdmin
    .from("locations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: "Erro ao remover localização." };

  await writeAuditLog({
    tenantId,
    action: "location.deleted",
    tableName: "locations",
    recordId: id,
    oldData: location as unknown as Record<string, unknown>,
  });

  revalidatePath("/configuracoes");
  revalidatePath("/transferencias");
  return {};
}

// ─── Usuários ─────────────────────────────────────────────────

// master is excluded — cannot be invited through tenant settings
const VALID_ROLES = ["owner", "manager", "seller", "stock_operator"] as const;

async function buildAppUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

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

  const appUrl = await buildAppUrl();

  // Envia convite — Supabase dispara o e-mail automaticamente
  const { data: inviteData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${appUrl}/auth/callback?next=/convite` }
  );

  if (authError) {
    if (authError.message.toLowerCase().includes("already")) return { error: "Este e-mail já está cadastrado." };
    return { error: "Erro ao enviar convite." };
  }

  // Garante registro na tabela users
  const { data: dbUser } = await supabaseAdmin.from("users").select("id").eq("id", inviteData.user.id).single();
  if (!dbUser) {
    await supabaseAdmin.from("users").insert({
      id: inviteData.user.id,
      tenant_id: tenantId,
      name,
      role,
      is_active: true,
    });
  }

  revalidatePath("/configuracoes");
  return { success: true };
}

export async function resendInviteAction(id: string): Promise<{ error?: string }> {
  const tenantId = await getTenantId();

  // Garante que pertence ao mesmo tenant
  const { data: target } = await supabaseAdmin
    .from("users")
    .select("id, name, role")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!target) return { error: "Usuário não encontrado." };

  // Busca e-mail no Auth
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(id);
  if (authErr || !authData.user?.email) return { error: "Não foi possível obter o e-mail do usuário." };

  const email = authData.user.email;
  const appUrl = await buildAppUrl();

  // Remove o usuário não confirmado do Auth e da tabela para poder re-convidar
  await supabaseAdmin.from("users").delete().eq("id", id).eq("tenant_id", tenantId);
  await supabaseAdmin.auth.admin.deleteUser(id);

  // Re-convida — Supabase gera novo ID e envia o e-mail automaticamente
  const { data: newInvite, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: `${appUrl}/auth/callback?next=/convite` }
  );

  if (inviteError) return { error: "Erro ao reenviar convite." };

  // Recria o registro com o novo ID gerado pelo Supabase
  await supabaseAdmin.from("users").insert({
    id: newInvite.user.id,
    tenant_id: tenantId,
    name: target.name,
    role: target.role,
    is_active: true,
  });

  revalidatePath("/configuracoes");
  return {};
}

export async function updateUserRoleAction(id: string, role: string): Promise<void> {
  const tenantId = await getTenantId();
  if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) return;

  const { data: before } = await supabaseAdmin
    .from("users")
    .select("id, role, name")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  await supabaseAdmin
    .from("users")
    .update({ role })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  await writeAuditLog({
    tenantId,
    action: "user.role_changed",
    tableName: "users",
    recordId: id,
    oldData: before as unknown as Record<string, unknown>,
    newData: { role },
  });

  revalidatePath("/configuracoes");
}

export async function toggleUserActiveAction(id: string, active: boolean): Promise<void> {
  const tenantId = await getTenantId();

  await supabaseAdmin
    .from("users")
    .update({ is_active: active })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  await writeAuditLog({
    tenantId,
    action: active ? "user.activated" : "user.deactivated",
    tableName: "users",
    recordId: id,
    newData: { is_active: active },
  });

  revalidatePath("/configuracoes");
}

export async function deleteUserAction(id: string): Promise<{ error?: string }> {
  const tenantId = await getTenantId();

  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) return { error: "Não autenticado." };
  if (id === currentUser.id) return { error: "Você não pode excluir sua própria conta." };

  // Garante que o usuário pertence ao mesmo tenant
  const { data: target } = await supabaseAdmin
    .from("users")
    .select("id, name")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!target) return { error: "Usuário não encontrado." };

  // Remove da tabela de usuários
  const { error: dbError } = await supabaseAdmin
    .from("users")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (dbError) return { error: "Erro ao excluir usuário." };

  // Remove do Supabase Auth
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (authError) {
    // Loga mas não falha — o registro da tabela já foi removido
    console.error("Erro ao remover do Auth:", authError.message);
  }

  await writeAuditLog({
    tenantId,
    action: "user.deleted",
    tableName: "users",
    recordId: id,
    oldData: target as unknown as Record<string, unknown>,
  });

  revalidatePath("/configuracoes");
  return {};
}
