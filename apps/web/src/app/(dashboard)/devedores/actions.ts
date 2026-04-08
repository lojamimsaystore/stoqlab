"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";

// ─── Buscar vendas de um cliente para vincular ────────────────

export type SaleItemPreview = {
  product_name: string;
  image_url: string | null;
  quantity: number;
  color: string;
  size: string;
};

export type SaleOption = {
  id: string;
  sold_at: string;
  total_value: string;
  items_count: number;
  items: SaleItemPreview[];
};

export async function searchSalesByCustomerAction(customerId: string): Promise<SaleOption[]> {
  const tenantId = await getTenantId();
  if (!customerId) return [];

  const { data } = await supabaseAdmin
    .from("sales")
    .select(`
      id, sold_at, total_value,
      sale_items(
        quantity,
        product_variants(
          color, size,
          products(name, cover_image_url)
        )
      )
    `)
    .eq("tenant_id", tenantId)
    .eq("customer_id", customerId)
    .eq("status", "completed")
    .order("sold_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((s) => {
    const saleItems = (s.sale_items as unknown as {
      quantity: number;
      product_variants: {
        color: string;
        size: string;
        products: { name: string; cover_image_url: string | null } | null;
      } | null;
    }[]) ?? [];

    const items: SaleItemPreview[] = saleItems.map((si) => ({
      product_name: si.product_variants?.products?.name ?? "Produto",
      image_url: si.product_variants?.products?.cover_image_url ?? null,
      quantity: si.quantity,
      color: si.product_variants?.color ?? "",
      size: si.product_variants?.size ?? "",
    }));

    return {
      id: s.id,
      sold_at: s.sold_at,
      total_value: s.total_value,
      items_count: saleItems.reduce((sum, si) => sum + si.quantity, 0),
      items,
    };
  });
}

export async function searchCustomersAction(query: string) {
  const tenantId = await getTenantId();
  if (!query || query.length < 1) return [];

  const { data } = await supabaseAdmin
    .from("customers")
    .select("id, name, phone")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
    .order("name")
    .limit(10);

  return data ?? [];
}

export async function getAllCustomersAction() {
  const tenantId = await getTenantId();

  const { data } = await supabaseAdmin
    .from("customers")
    .select("id, name, phone")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("name");

  return data ?? [];
}

// ─── Criar dívida ─────────────────────────────────────────────

const createDebtSchema = z.object({
  customerId: z.string().uuid("Selecione um cliente"),
  saleId: z.string().uuid().optional(),
  totalAmount: z.number().min(0.01, "Informe o valor total"),
  description: z.string().max(300).optional(),
  // initial payment (optional)
  paidAmount: z.number().min(0).optional(),
  paymentMethod: z.enum(["cash", "pix", "credit", "debit"]).optional(),
  paidAt: z.string().optional(),
});

export type DebtState = { error?: string };

export async function createDebtAction(
  _prev: DebtState,
  formData: FormData
): Promise<DebtState> {
  const tenantId = await getTenantId();

  const paidRaw = Number(formData.get("paidAmount") || 0);

  const parsed = createDebtSchema.safeParse({
    customerId: formData.get("customerId"),
    saleId: formData.get("saleId") || undefined,
    totalAmount: Number(formData.get("totalAmount")),
    description: formData.get("description") || undefined,
    paidAmount: paidRaw > 0 ? paidRaw : undefined,
    paymentMethod: formData.get("paymentMethod") || undefined,
    paidAt: formData.get("paidAt") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { paidAmount, paymentMethod, paidAt, ...debtData } = parsed.data;

  const initialStatus =
    paidAmount && paidAmount >= debtData.totalAmount
      ? "paid"
      : paidAmount && paidAmount > 0
      ? "partial"
      : "open";

  const { data: debt, error } = await supabaseAdmin
    .from("debts")
    .insert({
      tenant_id: tenantId,
      customer_id: debtData.customerId,
      sale_id: debtData.saleId ?? null,
      total_amount: debtData.totalAmount.toFixed(2),
      description: debtData.description ?? null,
      status: initialStatus,
    })
    .select("id")
    .single();

  if (error || !debt) return { error: "Erro ao registrar dívida." };

  // Record initial payment if provided
  if (paidAmount && paidAmount > 0 && paymentMethod && paidAt) {
    await supabaseAdmin.from("debt_payments").insert({
      tenant_id: tenantId,
      debt_id: debt.id,
      amount: paidAmount.toFixed(2),
      payment_method: paymentMethod,
      paid_at: new Date(paidAt).toISOString(),
    });
  }

  revalidatePath("/devedores");
  redirect("/devedores");
}

// ─── Adicionar pagamento ──────────────────────────────────────

const addPaymentSchema = z.object({
  amount: z.number().min(0.01, "Informe o valor"),
  paymentMethod: z.enum(["cash", "pix", "credit", "debit"]),
  paidAt: z.string().min(1),
  notes: z.string().max(300).optional(),
});

export async function addPaymentAction(
  debtId: string,
  _prev: DebtState,
  formData: FormData
): Promise<DebtState> {
  const tenantId = await getTenantId();

  const parsed = addPaymentSchema.safeParse({
    amount: Number(formData.get("amount")),
    paymentMethod: formData.get("paymentMethod"),
    paidAt: formData.get("paidAt"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // Busca dívida para verificar e atualizar status
  const { data: debt } = await supabaseAdmin
    .from("debts")
    .select("id, total_amount")
    .eq("id", debtId)
    .eq("tenant_id", tenantId)
    .single();

  if (!debt) return { error: "Dívida não encontrada." };

  // Insere pagamento
  const { error } = await supabaseAdmin.from("debt_payments").insert({
    tenant_id: tenantId,
    debt_id: debtId,
    amount: parsed.data.amount.toFixed(2),
    payment_method: parsed.data.paymentMethod,
    paid_at: new Date(parsed.data.paidAt).toISOString(),
    notes: parsed.data.notes ?? null,
  });

  if (error) return { error: "Erro ao registrar pagamento." };

  // Recalcula total pago e atualiza status
  const { data: payments } = await supabaseAdmin
    .from("debt_payments")
    .select("amount")
    .eq("debt_id", debtId)
    .eq("tenant_id", tenantId);

  const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const totalAmount = Number(debt.total_amount);
  const status = totalPaid >= totalAmount ? "paid" : totalPaid > 0 ? "partial" : "open";

  await supabaseAdmin
    .from("debts")
    .update({ status })
    .eq("id", debtId)
    .eq("tenant_id", tenantId);

  revalidatePath(`/devedores/${debtId}`);
  revalidatePath("/devedores");
  return {};
}

// ─── Adicionar mais valor à dívida ───────────────────────────

export async function increaseDebtAction(
  debtId: string,
  _prev: DebtState,
  formData: FormData
): Promise<DebtState> {
  const tenantId = await getTenantId();

  const amount = Number(formData.get("amount"));
  if (!amount || amount <= 0) return { error: "Informe o valor a adicionar." };

  const description = (formData.get("description") as string)?.trim() || null;

  const { data: debt } = await supabaseAdmin
    .from("debts")
    .select("total_amount, description")
    .eq("id", debtId)
    .eq("tenant_id", tenantId)
    .single();

  if (!debt) return { error: "Dívida não encontrada." };

  const newTotal = Number(debt.total_amount) + amount;
  const newDescription = description
    ? `${debt.description ?? ""}\n+ ${description} (R$ ${amount.toFixed(2)})`.trim()
    : debt.description;

  await supabaseAdmin
    .from("debts")
    .update({ total_amount: newTotal.toFixed(2), description: newDescription, status: "partial" })
    .eq("id", debtId)
    .eq("tenant_id", tenantId);

  revalidatePath(`/devedores/${debtId}`);
  revalidatePath("/devedores");
  return {};
}

// ─── Excluir pagamento ────────────────────────────────────────

export async function deletePaymentAction(
  paymentId: string,
  debtId: string
): Promise<void> {
  const tenantId = await getTenantId();

  await supabaseAdmin
    .from("debt_payments")
    .delete()
    .eq("id", paymentId)
    .eq("tenant_id", tenantId);

  // Recalcula status
  const { data: debt } = await supabaseAdmin
    .from("debts")
    .select("total_amount")
    .eq("id", debtId)
    .eq("tenant_id", tenantId)
    .single();

  const { data: payments } = await supabaseAdmin
    .from("debt_payments")
    .select("amount")
    .eq("debt_id", debtId)
    .eq("tenant_id", tenantId);

  const totalPaid = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const totalAmount = Number(debt?.total_amount ?? 0);
  const status = totalPaid >= totalAmount ? "paid" : totalPaid > 0 ? "partial" : "open";

  await supabaseAdmin.from("debts").update({ status }).eq("id", debtId).eq("tenant_id", tenantId);

  revalidatePath(`/devedores/${debtId}`);
  revalidatePath("/devedores");
}

// ─── Excluir dívida ───────────────────────────────────────────

export async function deleteDebtAction(debtId: string): Promise<void> {
  const tenantId = await getTenantId();

  await supabaseAdmin.from("debt_payments").delete().eq("debt_id", debtId).eq("tenant_id", tenantId);
  await supabaseAdmin
    .from("debts")
    .delete()
    .eq("id", debtId)
    .eq("tenant_id", tenantId);

  revalidatePath("/devedores");
}
