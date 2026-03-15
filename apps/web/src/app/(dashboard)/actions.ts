"use server";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateSidebarFontColorAction(color: string): Promise<void> {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) return;

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("settings")
    .eq("id", profile.tenant_id)
    .single();

  const settings = (tenant?.settings as Record<string, unknown>) ?? {};

  await supabaseAdmin
    .from("tenants")
    .update({ settings: { ...settings, sidebar_font_color: color } })
    .eq("id", profile.tenant_id);

  revalidatePath("/", "layout");
}

export async function updateSidebarColorAction(color: string): Promise<void> {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) return;

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("settings")
    .eq("id", profile.tenant_id)
    .single();

  const settings = (tenant?.settings as Record<string, unknown>) ?? {};

  await supabaseAdmin
    .from("tenants")
    .update({ settings: { ...settings, sidebar_color: color } })
    .eq("id", profile.tenant_id);

  revalidatePath("/", "layout");
}
