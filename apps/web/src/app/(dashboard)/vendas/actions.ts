"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";

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
    await supabaseAdmin.from("sales").delete().eq("id", sale.id);
    return { error: "Erro ao salvar itens da venda." };
  }

  // Baixa estoque
  for (const item of parsed.data.items) {
    const { data: inv } = await supabaseAdmin
      .from("inventory")
      .select("id, quantity")
      .eq("variant_id", item.variantId)
      .eq("location_id", locationId)
      .single();

    if (inv) {
      await supabaseAdmin
        .from("inventory")
        .update({ quantity: inv.quantity - item.quantity })
        .eq("id", inv.id);
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

  // Reverte estoque de cada item
  for (const item of items ?? []) {
    const { data: inv } = await supabaseAdmin
      .from("inventory")
      .select("id, quantity")
      .eq("variant_id", item.variant_id)
      .eq("location_id", (sale as unknown as { location_id: string }).location_id)
      .single();

    if (inv) {
      await supabaseAdmin
        .from("inventory")
        .update({ quantity: inv.quantity + item.quantity })
        .eq("id", inv.id);
    }
  }

  // Registra no audit_log antes de deletar
  await writeAuditLog({
    tenantId,
    action: "sale.deleted",
    tableName: "sales",
    recordId: id,
    oldData: sale as unknown as Record<string, unknown>,
  });

  // Hard delete — remove itens, movimentos e a venda
  await supabaseAdmin.from("inventory_movements").delete().eq("reference_id", id);
  await supabaseAdmin.from("sale_items").delete().eq("sale_id", id);
  await supabaseAdmin.from("sales").delete().eq("id", id).eq("tenant_id", tenantId);

  revalidatePath("/vendas");
  revalidatePath("/estoque");
  return {};
}
