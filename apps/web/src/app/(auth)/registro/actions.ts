"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { registroSchema } from "@stoqlab/validators";
import { generateSlug } from "@stoqlab/utils";

export type RegistroState = {
  error?: string;
  success?: boolean;
};

export async function registrarAction(
  _prev: RegistroState,
  formData: FormData,
): Promise<RegistroState> {
  const raw = {
    nomeLoja: formData.get("nomeLoja"),
    nome: formData.get("nome"),
    email: formData.get("email"),
    senha: formData.get("senha"),
    confirmarSenha: formData.get("confirmarSenha"),
  };

  const parsed = registroSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };
  }

  const { nomeLoja, nome, email, senha } = parsed.data;
  const slug = generateSlug(nomeLoja);

  // 1. Criar tenant
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .insert({ name: nomeLoja, slug })
    .select("id")
    .single();

  if (tenantError) {
    if (tenantError.code === "23505") {
      return { error: "Nome de loja já em uso. Escolha outro nome." };
    }
    return { error: "Erro ao criar loja. Tente novamente." };
  }

  // 2. Criar usuário no Supabase Auth via admin (pula confirmação de email)
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });

  if (authError ?? !authData.user) {
    await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
    return { error: authError?.message ?? "Erro ao criar conta." };
  }

  // 3. Criar registro em public.users
  const { error: userError } = await supabaseAdmin.from("users").insert({
    id: authData.user.id,
    tenant_id: tenant.id,
    name: nome,
    role: "owner",
  });

  if (userError) {
    await supabaseAdmin.from("tenants").delete().eq("id", tenant.id);
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { error: "Erro ao criar perfil. Tente novamente." };
  }

  // 4. Login automático
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (signInError) {
    return { error: "Conta criada! Faça login para continuar." };
  }

  return { success: true };
}
