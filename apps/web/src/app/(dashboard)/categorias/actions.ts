"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";

const nameSchema = z.string().min(1, "Nome obrigatório").max(60);

export async function createCategoryAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const tenantId = await getTenantId();
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { error } = await supabaseAdmin.from("categories").insert({
    name: parsed.data,
    tenant_id: tenantId,
  });

  if (error) {
    if (error.code === "23505") return { error: "Já existe uma categoria com esse nome." };
    return { error: "Erro ao criar categoria." };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function updateCategoryAction(
  id: string,
  name: string
): Promise<{ error?: string }> {
  const tenantId = await getTenantId();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { error } = await supabaseAdmin
    .from("categories")
    .update({ name: parsed.data })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (error) {
    if (error.code === "23505") return { error: "Já existe uma categoria com esse nome." };
    return { error: "Erro ao atualizar categoria." };
  }

  revalidatePath("/", "layout");
  return {};
}

export async function deleteCategoryAction(id: string): Promise<void> {
  const tenantId = await getTenantId();
  await supabaseAdmin
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath("/", "layout");
}
