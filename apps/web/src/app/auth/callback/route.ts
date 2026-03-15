import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?erro=convite_invalido`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?erro=convite_invalido`);
  }

  // Se veio de um fluxo específico (ex: convite), respeita o next
  if (next === "/convite" || next === "/completar-cadastro") {
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Verifica se o usuário já tem uma loja cadastrada
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("id, tenant_id")
    .eq("id", user.id)
    .single();

  // Usuário sem perfil = novo usuário → criar loja
  if (!profile || !profile.tenant_id) {
    return NextResponse.redirect(`${origin}/completar-cadastro`);
  }

  // Usuário com loja → dashboard
  return NextResponse.redirect(`${origin}/`);
}
