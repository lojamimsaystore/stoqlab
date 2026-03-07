import { createClient } from "./supabase/server";
import { redirect } from "next/navigation";

/** Retorna tenant_id extraído dos custom claims do JWT */
export async function getTenantId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) redirect("/login");

  try {
    const payload = JSON.parse(atob(session.access_token.split(".")[1] ?? ""));
    const tenantId = payload.tenant_id as string | undefined;
    if (!tenantId) redirect("/login");
    return tenantId;
  } catch {
    redirect("/login");
  }
}

/** Retorna user + tenantId ou redireciona para login */
export async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tenantId = await getTenantId();
  return { user, tenantId };
}
