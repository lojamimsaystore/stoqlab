"use server";

import { createClient } from "@/lib/supabase/server";

export async function forgotPasswordAction(
  _prev: { error?: string; success?: boolean },
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const email = (formData.get("email") as string)?.trim();
  if (!email) return { error: "Informe o e-mail." };

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/nova-senha`,
  });

  // Não revelamos se o e-mail existe ou não por segurança
  if (error) console.error("[forgotPassword]", error.message);

  return { success: true };
}
