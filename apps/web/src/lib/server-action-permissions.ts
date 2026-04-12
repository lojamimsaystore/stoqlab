/**
 * Helper server-side para verificar permissões de ações em Server Components.
 * Para Client Components, use usePermissions() do permissions-context.tsx.
 */
import { supabaseAdmin } from "@/lib/supabase/service";
import { resolveActionPermissions, ACTION_KEYS } from "./action-permissions";
import type { ActionKey } from "./action-permissions";

/**
 * Retorna o Set de ações permitidas para um usuário.
 * Busca as configurações do tenant e resolve as permissões com defaults.
 */
export async function getUserActionPerms(
  role: string,
  tenantId: string
): Promise<Set<ActionKey>> {
  // Owner e master têm tudo — sem consulta extra
  if (role === "owner" || role === "master") {
    return new Set(ACTION_KEYS);
  }

  const { data } = await supabaseAdmin
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();

  const saved = (
    (data?.settings as Record<string, unknown>)?.action_permissions
  ) as Record<string, ActionKey[]> | undefined;

  return resolveActionPermissions(role, saved);
}
