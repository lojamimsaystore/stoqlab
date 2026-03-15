import { supabaseAdmin } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export type AuditAction =
  // Vendas
  | "sale.deleted"
  // Compras
  | "purchase.deleted"
  | "purchase.status_changed"
  // Produtos
  | "product.deleted"
  | "product.updated"
  | "product.archived"
  | "product.restored"
  // Variações
  | "variant.deleted"
  // Transferências
  | "transfer.deleted"
  // Localizações
  | "location.deleted"
  | "location.updated"
  // Usuários
  | "user.role_changed"
  | "user.deactivated"
  | "user.activated"
  | "user.deleted"
  // Fornecedores
  | "supplier.deleted"
  // Clientes
  | "customer.deleted"
  // Tenant (admin master)
  | "tenant.deleted"
  | "tenant.plan_changed"
  | "tenant.deactivated"
  | "tenant.activated"
  | "tenant.updated";

export async function writeAuditLog({
  tenantId,
  action,
  tableName,
  recordId,
  oldData,
  newData,
}: {
  tenantId: string;
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") ?? headersList.get("x-real-ip") ?? null;
    const userAgent = headersList.get("user-agent") ?? null;

    await supabaseAdmin.from("audit_log").insert({
      tenant_id: tenantId,
      user_id: user?.id ?? null,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData ?? null,
      new_data: newData ?? null,
      ip_address: ip,
      user_agent: userAgent,
    });
  } catch {
    // Log nunca deve quebrar o fluxo principal
  }
}
