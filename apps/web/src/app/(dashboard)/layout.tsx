import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { resolvePermissions } from "@/lib/permissions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("name, role, tenant_id, tenants(name)")
    .eq("id", user.id)
    .single();

  // Master users have their own panel
  if (profile?.role === "master") redirect("/admin");

  const userName = profile?.name ?? "Usuário";
  const userRole = profile?.role ?? "owner";
  const userEmail = user.email ?? "";
  const tenants = profile?.tenants as unknown as Array<{ name: string }> | null | undefined;
  const tenantName = Array.isArray(tenants) ? (tenants[0]?.name ?? "Minha Loja") : "Minha Loja";

  type LowStockItem = {
    id: string;
    quantity: number;
    productName: string;
    color: string;
    size: string;
    locationName: string;
  };

  let lowStockItems: LowStockItem[] = [];
  let lowStockThreshold = 5;
  let userPermissions: string[] = resolvePermissions(userRole, null);

  if (profile?.tenant_id) {
    const [{ data: tenantData }, { data: invData }] = await Promise.all([
      supabaseAdmin.from("tenants").select("settings").eq("id", profile.tenant_id).single(),
      supabaseAdmin
        .from("inventory")
        .select("id, quantity, product_variants(color, size, products(name)), locations(name)")
        .eq("tenant_id", profile.tenant_id)
        .gte("quantity", 1)
        .order("quantity", { ascending: true })
        .limit(100),
    ]);

    const settings = (tenantData?.settings as Record<string, unknown>) ?? {};
    lowStockThreshold = typeof settings.low_stock_threshold === "number"
      ? settings.low_stock_threshold
      : 5;

    const savedRolePerms = settings.role_permissions as Record<string, string[]> | undefined;
    userPermissions = resolvePermissions(userRole, savedRolePerms);

    lowStockItems = (invData ?? [])
      .filter((row) => row.quantity <= lowStockThreshold)
      .slice(0, 15)
      .map((row) => {
        const variant = row.product_variants as { color: string; size: string; products: { name: string } | null } | null;
        const location = row.locations as { name: string } | null;
        return {
          id: row.id,
          quantity: row.quantity,
          productName: variant?.products?.name ?? "—",
          color: variant?.color ?? "—",
          size: variant?.size ?? "—",
          locationName: location?.name ?? "—",
        };
      });
  }

  return (
    <DashboardShell
      tenantName={tenantName}
      userName={userName}
      userRole={userRole}
      userEmail={userEmail}
      lowStockItems={lowStockItems}
      lowStockThreshold={lowStockThreshold}
      userPermissions={userPermissions}
    >
      {children}
    </DashboardShell>
  );
}
