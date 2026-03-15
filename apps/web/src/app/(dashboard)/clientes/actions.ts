"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

const customerSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(150),
  phone: z.string().max(30).optional(),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  cpf: z.string().max(20).optional(),
  birthdate: z.string().optional(),
  address: z.string().max(300).optional(),
  notes: z.string().max(500).optional(),
});

function parseForm(formData: FormData) {
  return customerSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || "",
    cpf: formData.get("cpf") || undefined,
    birthdate: formData.get("birthdate") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
  });
}

export type CustomerState = { error?: string };

export async function createCustomerAction(
  _prev: CustomerState,
  formData: FormData
): Promise<CustomerState> {
  const tenantId = await getTenantId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { error } = await supabaseAdmin.from("customers").insert({
    ...parsed.data,
    email: parsed.data.email || null,
    birthdate: parsed.data.birthdate || null,
    tenant_id: tenantId,
  });

  if (error) return { error: "Erro ao cadastrar cliente." };

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function updateCustomerAction(
  id: string,
  _prev: CustomerState,
  formData: FormData
): Promise<CustomerState> {
  const tenantId = await getTenantId();
  const parsed = parseForm(formData);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { error } = await supabaseAdmin
    .from("customers")
    .update({ ...parsed.data, email: parsed.data.email || null, birthdate: parsed.data.birthdate || null })
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);

  if (error) return { error: "Erro ao atualizar cliente." };

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function deleteCustomerAction(id: string): Promise<void> {
  const tenantId = await getTenantId();

  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  await writeAuditLog({
    tenantId,
    action: "customer.deleted",
    tableName: "customers",
    recordId: id,
    oldData: customer as unknown as Record<string, unknown>,
  });

  await supabaseAdmin
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath("/clientes");
}
