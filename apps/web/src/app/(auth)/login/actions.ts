"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { loginSchema } from "@stoqlab/validators";
import { resolvePermissions } from "@/lib/permissions";

export type LoginState = {
  error?: string;
  success?: boolean;
  redirectTo?: string;
};

const MODULE_PATH: Record<string, string> = {
  dashboard:      "/",
  produtos:       "/produtos",
  categorias:     "/categorias",
  estoque:        "/estoque",
  compras:        "/compras",
  vendas:         "/vendas",
  transferencias: "/transferencias",
  fornecedores:   "/fornecedores",
  clientes:       "/clientes",
  relatorios:     "/relatorios",
  configuracoes:  "/configuracoes",
};

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const raw = {
    email: formData.get("email"),
    senha: formData.get("senha"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.senha,
  });

  if (error) {
    return { error: "Email ou senha incorretos." };
  }

  // Busca role, status e permissões do tenant para calcular o redirect correto
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role, tenant_id, is_active")
    .eq("id", data.user.id)
    .single();

  // Bloqueia usuários desativados antes de criar a sessão
  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    return { error: "Sua conta está desativada. Entre em contato com o administrador da loja." };
  }

  if (!profile?.tenant_id) {
    return { success: true, redirectTo: "/completar-cadastro" };
  }

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("settings")
    .eq("id", profile.tenant_id)
    .single();

  const savedPerms = (tenant?.settings as Record<string, unknown>)?.role_permissions as Record<string, string[]> | undefined;
  const permissions = resolvePermissions(profile.role, savedPerms);

  // Redireciona para o primeiro módulo com acesso
  const firstPath = permissions
    .map((m) => MODULE_PATH[m])
    .find(Boolean) ?? "/";

  return { success: true, redirectTo: firstPath };
}
