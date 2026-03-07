import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { DashboardShell } from "@/components/layout/dashboard-shell";

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
    .select("name, role, tenants(name)")
    .eq("id", user.id)
    .single();

  // Master users have their own panel
  if (profile?.role === "master") redirect("/admin");

  const userName = profile?.name ?? "Usuário";
  const tenantName =
    (profile?.tenants as { name: string } | null)?.name ?? "Minha Loja";

  return (
    <DashboardShell tenantName={tenantName} userName={userName}>
      {children}
    </DashboardShell>
  );
}
