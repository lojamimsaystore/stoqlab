// Script de seed — cria tenant + usuário admin
// Uso: node scripts/seed-admin.mjs

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jnieekauiboycbpyjisv.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuaWVla2F1aWJveWNicHlqaXN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgzMzg3NCwiZXhwIjoyMDg4NDA5ODc0fQ.1kZglI-_r23gFC3XmBDEPgRSsII2leaIKsZpojLPm5o";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seed() {
  console.log("Criando tenant...");
  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ name: "Stoqlab", slug: "stoqlab", plan: "trial" })
    .select("id")
    .single();

  if (tenantError) {
    console.error("Erro ao criar tenant:", tenantError.message);
    process.exit(1);
  }
  console.log("Tenant criado:", tenant.id);

  console.log("Criando usuário no Auth...");
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: "yago.vmonte@gmail.com",
      password: "Bethania2018$",
      email_confirm: true,
    });

  if (authError) {
    await admin.from("tenants").delete().eq("id", tenant.id);
    console.error("Erro ao criar usuário Auth:", authError.message);
    process.exit(1);
  }
  console.log("Usuário Auth criado:", authData.user.id);

  console.log("Criando perfil em public.users...");
  const { error: userError } = await admin.from("users").insert({
    id: authData.user.id,
    tenant_id: tenant.id,
    name: "Yago",
    role: "owner",
  });

  if (userError) {
    await admin.from("tenants").delete().eq("id", tenant.id);
    await admin.auth.admin.deleteUser(authData.user.id);
    console.error("Erro ao criar perfil:", userError.message);
    process.exit(1);
  }

  console.log("✓ Admin criado com sucesso!");
  console.log("  Email:", "yago.vmonte@gmail.com");
  console.log("  Tenant:", tenant.id);
  console.log("  Role: owner");
}

seed();
