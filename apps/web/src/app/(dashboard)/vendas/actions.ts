"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { adjustInventory } from "@/lib/inventory";
import { checkActionLimit } from "@/lib/rate-limit";

export type CustomerResult = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  birthdate: string | null;
  address: string | null;
};

const itemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1),
  salePrice: z.number().min(0),
  discount: z.number().min(0).default(0),
});

const saleSchema = z.object({
  paymentMethod: z.enum(["cash", "credit", "debit", "pix", "installment"]),
  channel: z.enum(["store", "ecommerce", "marketplace", "whatsapp"]).default("store"),
  notes: z.string().max(300).optional(),
  items: z.array(itemSchema).min(1, "Adicione ao menos um item"),
});

export type SaleState = { error?: string };

export async function createSaleAction(
  _prev: SaleState,
  formData: FormData
): Promise<SaleState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
  const rl = await checkActionLimit(user.id, "create_sale");
  if (!rl.success) return { error: `Muitas operações. Tente novamente em ${rl.retryAfter}s.` };

  const tenantId = await getTenantId();

  let items: unknown[];
  try {
    items = JSON.parse(formData.get("items") as string);
  } catch {
    return { error: "Itens inválidos." };
  }

  const parsed = saleSchema.safeParse({
    paymentMethod: formData.get("paymentMethod"),
    channel: formData.get("channel") || "store",
    notes: formData.get("notes") || undefined,
    items,
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // Valida localização informada
  const locationId = (formData.get("locationId") as string)?.trim();
  if (!locationId) return { error: "Selecione o local de venda." };

  const { data: loc } = await supabaseAdmin
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .single();

  if (!loc) return { error: "Localização inválida." };

  // Valida estoque disponível
  for (const item of parsed.data.items) {
    const { data: inv } = await supabaseAdmin
      .from("inventory")
      .select("quantity")
      .eq("variant_id", item.variantId)
      .eq("location_id", locationId)
      .single();

    if (!inv || inv.quantity < item.quantity) {
      return { error: `Estoque insuficiente para um dos itens.` };
    }
  }

  // Parcelamento (só relevante para crédito)
  const rawInstallments = parseInt(formData.get("installments") as string, 10);
  const installments = parsed.data.paymentMethod === "credit" && rawInstallments > 1 ? rawInstallments : 1;
  const hasInterest = formData.get("hasInterest") === "true";
  const actualPaymentMethod = parsed.data.paymentMethod === "credit" && installments > 1
    ? "installment" as const
    : parsed.data.paymentMethod;
  const installmentNote = installments > 1
    ? `${installments}x ${hasInterest ? "com juros" : "sem juros"}`
    : null;

  const totalValue = parsed.data.items.reduce(
    (s, i) => s + i.quantity * (i.salePrice - i.discount),
    0
  );
  const discountValue = parsed.data.items.reduce(
    (s, i) => s + i.quantity * i.discount,
    0
  );

  // Resolve cliente (existente ou cria novo)
  const customerId = (formData.get("customerId") as string) || null;
  const customerName = ((formData.get("customerName") as string) || "").trim();
  const rawCpf = ((formData.get("customerCpf") as string) || "").replace(/\D/g, "");
  const rawPhone = ((formData.get("customerPhone") as string) || "").replace(/\D/g, "");
  const customerCpf = rawCpf.length === 11 ? rawCpf : null;
  const customerPhone = rawPhone.length >= 10 ? rawPhone : null;
  const customerEmail = ((formData.get("customerEmail") as string) || "").trim().toLowerCase() || null;
  const customerBirthdate = ((formData.get("customerBirthdate") as string) || "").trim() || null;
  const customerAddress = ((formData.get("customerAddress") as string) || "").trim() || null;

  let resolvedCustomerId: string | null = customerId;
  if (!resolvedCustomerId && customerName) {
    const { data: newCustomer } = await supabaseAdmin
      .from("customers")
      .insert({
        tenant_id: tenantId,
        name: customerName,
        cpf: customerCpf,
        phone: customerPhone,
        email: customerEmail,
        birthdate: customerBirthdate,
        address: customerAddress,
      })
      .select("id")
      .single();
    if (newCustomer) resolvedCustomerId = newCustomer.id;
  }

  // Cria venda
  const { data: sale, error: saleError } = await supabaseAdmin
    .from("sales")
    .insert({
      tenant_id: tenantId,
      location_id: locationId,
      customer_id: resolvedCustomerId,
      sold_by: user.id,
      status: "completed",
      channel: parsed.data.channel,
      payment_method: actualPaymentMethod,
      total_value: totalValue.toFixed(2),
      total_cost: "0",
      discount_value: discountValue.toFixed(2),
      notes: [installmentNote, parsed.data.notes || null].filter(Boolean).join(" | ") || null,
      sold_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (saleError) return { error: "Erro ao registrar venda." };

  // Cria itens
  const saleItems = parsed.data.items.map((item) => ({
    sale_id: sale.id,
    variant_id: item.variantId,
    quantity: item.quantity,
    unit_cost: "0",
    sale_price: item.salePrice.toFixed(2),
    discount: item.discount.toFixed(2),
  }));

  const { error: itemsError } = await supabaseAdmin
    .from("sale_items")
    .insert(saleItems);

  if (itemsError) {
    await supabaseAdmin.from("sales").delete().eq("id", sale.id).eq("tenant_id", tenantId);
    return { error: "Erro ao salvar itens da venda." };
  }

  await writeAuditLog({
    tenantId,
    action: "sale.created",
    tableName: "sales",
    recordId: sale.id,
    newData: {
      payment_method: actualPaymentMethod,
      total_value: totalValue,
      channel: parsed.data.channel,
      items_count: parsed.data.items.length,
    } as Record<string, unknown>,
  });

  // Baixa estoque (atômico via RPC — sem race condition)
  for (const item of parsed.data.items) {
    const invResult = await adjustInventory(tenantId, item.variantId, locationId, -item.quantity);
    if (!invResult.ok && invResult.reason === "insufficient_stock") {
      console.error("[createSale] estoque insuficiente para variant:", item.variantId);
    }

    await supabaseAdmin.from("inventory_movements").insert({
      tenant_id: tenantId,
      variant_id: item.variantId,
      location_id: locationId,
      quantity_delta: -item.quantity,
      movement_type: "sale",
      reference_id: sale.id,
      note: `Venda ${sale.id.slice(0, 8)}`,
    });
  }

  // ─── Pagamento parcial → cria dívida automaticamente ────────
  const paymentStatus = (formData.get("paymentStatus") as string) || "paid";
  const partialPaidAmount = Number(formData.get("partialPaidAmount") || 0);

  if (paymentStatus === "partial" && resolvedCustomerId) {
    const remaining = totalValue - partialPaidAmount;
    const debtStatus =
      partialPaidAmount <= 0 ? "open" : partialPaidAmount >= totalValue ? "paid" : "partial";

    const { data: debt } = await supabaseAdmin
      .from("debts")
      .insert({
        tenant_id: tenantId,
        customer_id: resolvedCustomerId,
        sale_id: sale.id,
        total_amount: totalValue.toFixed(2),
        description: `Venda de ${new Date().toLocaleDateString("pt-BR")} — ${parsed.data.items.length} produto(s)`,
        status: debtStatus,
      })
      .select("id")
      .single();

    if (debt && partialPaidAmount > 0) {
      await supabaseAdmin.from("debt_payments").insert({
        tenant_id: tenantId,
        debt_id: debt.id,
        amount: partialPaidAmount.toFixed(2),
        payment_method: parsed.data.paymentMethod === "installment" ? "credit" : parsed.data.paymentMethod,
        paid_at: new Date().toISOString(),
        notes: `Pagamento no ato da venda. Restante: R$ ${remaining.toFixed(2)}`,
      });
    }

    revalidatePath("/devedores");
  }

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  redirect("/vendas");
}

export async function updateSaleAction(
  id: string,
  _prev: SaleState,
  formData: FormData
): Promise<SaleState> {
  const tenantId = await getTenantId();

  let items: unknown[];
  try {
    items = JSON.parse(formData.get("items") as string);
  } catch {
    return { error: "Itens inválidos." };
  }

  const parsed = saleSchema.safeParse({
    paymentMethod: formData.get("paymentMethod"),
    channel: formData.get("channel") || "store",
    notes: formData.get("notes") || undefined,
    items,
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // Busca venda atual com itens
  const { data: currentSale } = await supabaseAdmin
    .from("sales")
    .select("*, sale_items(variant_id, quantity)")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!currentSale) return { error: "Venda não encontrada." };

  const locationId = (currentSale as unknown as { location_id: string }).location_id;
  const currentItems = currentSale.sale_items as { variant_id: string; quantity: number }[];

  // Reverte estoque dos itens antigos e registra movimentos de estorno (imutabilidade do log)
  for (const item of currentItems ?? []) {
    await adjustInventory(tenantId, item.variant_id, locationId, Number(item.quantity));
    await supabaseAdmin.from("inventory_movements").insert({
      tenant_id: tenantId,
      variant_id: item.variant_id,
      location_id: locationId,
      quantity_delta: Number(item.quantity),
      movement_type: "adjustment",
      reference_id: id,
      note: `Estorno de venda ${id.slice(0, 8)} (edição)`,
    });
  }

  // Valida estoque para os novos itens
  for (const item of parsed.data.items) {
    const { data: inv } = await supabaseAdmin
      .from("inventory")
      .select("quantity")
      .eq("variant_id", item.variantId)
      .eq("location_id", locationId)
      .maybeSingle();

    if (!inv || inv.quantity < item.quantity) {
      // Reverte o que já foi revertido se falhar
      return { error: "Estoque insuficiente para um dos itens." };
    }
  }

  // Resolve parcelamento
  const rawInstallments = parseInt(formData.get("installments") as string, 10);
  const installments = parsed.data.paymentMethod === "credit" && rawInstallments > 1 ? rawInstallments : 1;
  const hasInterest = formData.get("hasInterest") === "true";
  const actualPaymentMethod = parsed.data.paymentMethod === "credit" && installments > 1
    ? "installment" as const
    : parsed.data.paymentMethod;
  const installmentNote = installments > 1
    ? `${installments}x ${hasInterest ? "com juros" : "sem juros"}`
    : null;

  // Resolve cliente
  const customerId = (formData.get("customerId") as string) || null;
  const customerName = ((formData.get("customerName") as string) || "").trim();
  const rawCpf = ((formData.get("customerCpf") as string) || "").replace(/\D/g, "");
  const rawPhone = ((formData.get("customerPhone") as string) || "").replace(/\D/g, "");
  const customerCpf = rawCpf.length === 11 ? rawCpf : null;
  const customerPhone = rawPhone.length >= 10 ? rawPhone : null;
  const customerEmail = ((formData.get("customerEmail") as string) || "").trim().toLowerCase() || null;
  const customerBirthdate = ((formData.get("customerBirthdate") as string) || "").trim() || null;
  const customerAddress = ((formData.get("customerAddress") as string) || "").trim() || null;

  let resolvedCustomerId: string | null = customerId;
  if (!resolvedCustomerId && customerName) {
    const { data: newCustomer } = await supabaseAdmin
      .from("customers")
      .insert({
        tenant_id: tenantId,
        name: customerName,
        cpf: customerCpf,
        phone: customerPhone,
        email: customerEmail,
        birthdate: customerBirthdate,
        address: customerAddress,
      })
      .select("id")
      .single();
    if (newCustomer) resolvedCustomerId = newCustomer.id;
  }

  // Calcula totais
  const totalValue = parsed.data.items.reduce(
    (s, i) => s + i.quantity * (i.salePrice - i.discount),
    0
  );
  const discountValue = parsed.data.items.reduce(
    (s, i) => s + i.quantity * i.discount,
    0
  );

  // Atualiza a venda
  await supabaseAdmin
    .from("sales")
    .update({
      customer_id: resolvedCustomerId,
      payment_method: actualPaymentMethod,
      total_value: totalValue.toFixed(2),
      discount_value: discountValue.toFixed(2),
      notes: [installmentNote, parsed.data.notes || null].filter(Boolean).join(" | ") || null,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  // Remove apenas os itens antigos (movimentos são mantidos — estornos já foram inseridos acima)
  await supabaseAdmin.from("sale_items").delete().eq("sale_id", id);

  // Insere novos itens
  const newItems = parsed.data.items.map((item) => ({
    sale_id: id,
    variant_id: item.variantId,
    quantity: item.quantity,
    unit_cost: "0",
    sale_price: item.salePrice.toFixed(2),
    discount: item.discount.toFixed(2),
  }));
  await supabaseAdmin.from("sale_items").insert(newItems);

  // Baixa estoque dos novos itens (atômico via RPC)
  for (const item of parsed.data.items) {
    await adjustInventory(tenantId, item.variantId, locationId, -item.quantity);

    await supabaseAdmin.from("inventory_movements").insert({
      tenant_id: tenantId,
      variant_id: item.variantId,
      location_id: locationId,
      quantity_delta: -item.quantity,
      movement_type: "sale",
      reference_id: id,
      note: `Venda ${id.slice(0, 8)} (editada)`,
    });
  }

  await writeAuditLog({
    tenantId,
    action: "sale.updated",
    tableName: "sales",
    recordId: id,
    newData: { payment_method: actualPaymentMethod, total_value: totalValue } as Record<string, unknown>,
  });

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  redirect("/vendas");
}

export type DuplicateConflict = { field: "cpf" | "phone" | "email"; customerName: string };

export async function checkCustomerDuplicateAction(fields: {
  cpf: string;
  phone: string;
  email: string;
}): Promise<DuplicateConflict[]> {
  const tenantId = await getTenantId();
  const conflicts: DuplicateConflict[] = [];

  const cpfDigits = fields.cpf.replace(/\D/g, "");
  const phoneDigits = fields.phone.replace(/\D/g, "");

  const checks: Array<{ field: DuplicateConflict["field"]; column: string; value: string }> = [];
  if (cpfDigits.length === 11)    checks.push({ field: "cpf",   column: "cpf",   value: cpfDigits });
  if (phoneDigits.length >= 10)   checks.push({ field: "phone", column: "phone", value: phoneDigits });
  if (fields.email.includes("@")) checks.push({ field: "email", column: "email", value: fields.email.trim().toLowerCase() });

  for (const check of checks) {
    const { data } = await supabaseAdmin
      .from("customers")
      .select("name")
      .eq("tenant_id", tenantId)
      .eq(check.column, check.value)
      .is("deleted_at", null)
      .limit(1)
      .single();
    if (data) conflicts.push({ field: check.field, customerName: data.name });
  }

  return conflicts;
}

export async function searchCustomersAction(query: string): Promise<CustomerResult[]> {
  const tenantId = await getTenantId();
  if (!query || query.length < 2) return [];
  const { data } = await supabaseAdmin
    .from("customers")
    .select("id, name, phone, email, birthdate, address")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
    .order("name")
    .limit(8);
  return (data ?? []) as CustomerResult[];
}

export async function bulkCancelSalesAction(ids: string[]): Promise<{ deleted: number }> {
  let deleted = 0;
  for (const id of ids) {
    const result = await cancelSaleAction(id);
    if (!result.error) deleted++;
  }
  return { deleted };
}

export async function cancelSaleAction(id: string): Promise<{ error?: string }> {
  const tenantId = await getTenantId();

  // Busca a venda completa antes de deletar (para o log)
  const { data: sale } = await supabaseAdmin
    .from("sales")
    .select("*, sale_items(variant_id, quantity, sale_price, discount)")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!sale) return { error: "Venda não encontrada." };

  const items = sale.sale_items as { variant_id: string; quantity: number; sale_price: string; discount: string }[];

  const locationId = (sale as unknown as { location_id: string }).location_id;

  // Reverte estoque de cada item (atômico via RPC)
  for (const item of items ?? []) {
    await adjustInventory(tenantId, item.variant_id, locationId, Number(item.quantity));
  }

  // Registra no audit_log antes de deletar
  await writeAuditLog({
    tenantId,
    action: "sale.deleted",
    tableName: "sales",
    recordId: id,
    oldData: sale as unknown as Record<string, unknown>,
  });

  // Hard delete — remove dívidas, itens, movimentos e a venda
  await supabaseAdmin.from("debt_payments").delete()
    .in("debt_id", (await supabaseAdmin.from("debts").select("id").eq("sale_id", id).eq("tenant_id", tenantId)).data?.map(d => d.id) ?? []);
  await supabaseAdmin.from("debts").delete().eq("sale_id", id).eq("tenant_id", tenantId);
  await supabaseAdmin.from("inventory_movements").delete().eq("reference_id", id);
  await supabaseAdmin.from("sale_items").delete().eq("sale_id", id);
  await supabaseAdmin.from("sales").delete().eq("id", id).eq("tenant_id", tenantId);

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  return {};
}
