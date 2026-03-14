"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";

const supplierSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(150),
  cnpj: z.string().max(20).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  address: z.string().max(300).optional(),
  complement: z.string().max(150).optional(),
  notes: z.string().max(500).optional(),
});

function parseForm(formData: FormData) {
  return supplierSchema.safeParse({
    name: formData.get("name"),
    cnpj: formData.get("cnpj") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    address: formData.get("address") || undefined,
    complement: formData.get("complement") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export async function createSupplierAction(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const tenantId = await getTenantId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { complement, ...coreData } = parsed.data;
  const { error } = await supabaseAdmin.from("suppliers").insert({
    ...coreData,
    ...(complement ? { complement } : {}),
    email: coreData.email || null,
    tenant_id: tenantId,
  });

  if (error) return { error: `Erro ao cadastrar fornecedor: ${error.message}` };

  revalidatePath("/fornecedores");
  redirect("/fornecedores");
}

export async function updateSupplierAction(
  id: string,
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const tenantId = await getTenantId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { complement, ...coreData } = parsed.data;
  const { error } = await supabaseAdmin
    .from("suppliers")
    .update({ ...coreData, ...(complement ? { complement } : {}), email: coreData.email || null })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (error) return { error: `Erro ao atualizar fornecedor: ${error.message}` };

  revalidatePath("/fornecedores");
  redirect("/fornecedores");
}

export async function createSupplierInlineAction(
  _prev: { error?: string; supplier?: { id: string; name: string } },
  formData: FormData
): Promise<{ error?: string; supplier?: { id: string; name: string } }> {
  const tenantId = await getTenantId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { complement, ...coreData } = parsed.data;
  const { data, error } = await supabaseAdmin
    .from("suppliers")
    .insert({
      ...coreData,
      ...(complement ? { complement } : {}),
      email: coreData.email || null,
      tenant_id: tenantId,
    })
    .select("id, name")
    .single();

  if (error || !data) return { error: `Erro ao cadastrar fornecedor: ${error?.message}` };

  revalidatePath("/fornecedores");
  revalidatePath("/compras/nova");

  return { supplier: { id: data.id, name: data.name } };
}

export async function deleteSupplierAction(id: string): Promise<void> {
  const tenantId = await getTenantId();
  await supabaseAdmin
    .from("suppliers")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath("/fornecedores");
}
