"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { generateSlug } from "@stoqlab/utils";

export type CompletarCadastroState = {
  error?: string;
  success?: boolean;
};

export async function completarCadastroAction(
  _prev: CompletarCadastroState,
  formData: FormData
): Promise<CompletarCadastroState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const nomeLoja = (formData.get("nomeLoja") as string)?.trim();
  const nome = (formData.get("nome") as string)?.trim();

  if (!nomeLoja || nomeLoja.length < 2) return { error: "Informe o nome da loja." };
  if (!nome || nome.length < 2) return { error: "Informe seu nome." };

  // Verifica se usuário já tem tenant (não permitir duplo cadastro)
  const { data: existing } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (existing) return { error: "Esta conta já possui uma loja cadastrada." };

  // Cria tenant
  const slug = generateSlug(nomeLoja);
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .insert({ name: nomeLoja, slug })
    .select("id")
    .single();

  if (tenantError) {
    if (tenantError.code === "23505") return { error: "Nome de loja já em uso. Escolha outro nome." };
    return { error: "Erro ao criar loja. Tente novamente." };
  }

  // Cria perfil de usuário
  const { error: userError } = await supabaseAdmin.from("users").insert({
    id: user.id,
    tenant_id: tenant.id,
    name: nome,
    role: "owner",
    is_active: true,
  });

  if (userError) {
    await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
    return { error: "Erro ao criar perfil. Tente novamente." };
  }

  return { success: true };
}
