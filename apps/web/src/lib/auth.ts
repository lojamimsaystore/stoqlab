import { createClient } from "./supabase/server";
import { supabaseAdmin } from "./supabase/service";
import { redirect } from "next/navigation";

/**
 * Retorna tenant_id do usuário autenticado buscando no banco via supabaseAdmin.
 * Usa getUser() (valida o JWT contra o servidor) em vez de getSession()
 * para evitar que tokens manipulados no cookie falsifiquem o tenant_id.
 */
export async function getTenantId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) redirect("/login");
  return profile.tenant_id;
}

/** Retorna user + tenantId ou redireciona para login */
export async function getAuthContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantId();
  return { user, tenantId };
}
