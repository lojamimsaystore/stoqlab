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
  const tenantData = profile?.tenants as unknown as { name: string } | Array<{ name: string }> | null | undefined;
  const tenantName = (Array.isArray(tenantData) ? tenantData[0]?.name : (tenantData as { name: string } | null)?.name) ?? "Minha Loja";

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
  let sidebarColor: string | undefined;
  let sidebarFontColor: string | undefined;

  if (profile?.tenant_id) {
    // Busca configurações primeiro para usar o threshold real na query de estoque
    const { data: tenantData } = await supabaseAdmin
      .from("tenants")
      .select("settings")
      .eq("id", profile.tenant_id)
      .single();

    const settings = (tenantData?.settings as Record<string, unknown>) ?? {};
    lowStockThreshold = typeof settings.low_stock_threshold === "number"
      ? settings.low_stock_threshold
      : 5;

    const savedRolePerms = settings.role_permissions as Record<string, string[]> | undefined;
    userPermissions = resolvePermissions(userRole, savedRolePerms);
    sidebarColor = typeof settings.sidebar_color === "string" ? settings.sidebar_color : undefined;
    sidebarFontColor = typeof settings.sidebar_font_color === "string" ? settings.sidebar_font_color : undefined;

    // Filtra estoque baixo direto no banco (evita buscar centenas de linhas desnecessárias)
    const { data: invData } = await supabaseAdmin
      .from("inventory")
      .select("id, quantity, product_variants(color, size, products(name)), locations(name)")
      .eq("tenant_id", profile.tenant_id)
      .gte("quantity", 1)
      .lte("quantity", lowStockThreshold)
      .order("quantity", { ascending: true })
      .limit(15);

    lowStockItems = (invData ?? [])
      .map((row) => {
        const variant = row.product_variants as unknown as { color: string; size: string; products: { name: string } | null } | null;
        const location = row.locations as unknown as { name: string } | null;
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
      sidebarColor={sidebarColor}
      sidebarFontColor={sidebarFontColor}
    >
      {children}
    </DashboardShell>
  );
}
