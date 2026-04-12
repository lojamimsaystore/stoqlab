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

const itemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitCost: z.number().min(0),
});

const PAYMENT_METHODS = ["cash", "pix", "debit", "credit"] as const;

const PURCHASE_STATUSES = ["received", "cancelled", "confirmed"] as const;

const purchaseSchema = z.object({
  supplierId: z.string().uuid({ message: "Selecione um fornecedor." }),
  invoiceNumber: z.string().min(1, "Nº nota fiscal obrigatório").max(60),
  purchasedAt: z.string().min(1, "Data obrigatória"),
  paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: "Forma de pagamento obrigatória" }) }),
  status: z.enum(PURCHASE_STATUSES).default("received"),
  freightCost: z.number().min(0).default(0),
  otherCosts: z.number().min(0).default(0),
  notes: z.string().max(500).optional(),
  items: z.array(itemSchema).min(1, "Adicione ao menos um item"),
});

function generateSku(name: string, color: string, size: string): string {
  const clean = (s: string, len: number) =>
    s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "").slice(0, len);
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `${clean(name, 4)}-${clean(color, 4)}-${size}-${suffix}`;
}

const ALLOWED_INVOICE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const MAX_INVOICE_SIZE = 10 * 1024 * 1024; // 10 MB

async function uploadInvoice(file: File, tenantId: string, purchaseId: string): Promise<string | null> {
  if (!ALLOWED_INVOICE_TYPES.includes(file.type)) return null;
  if (file.size > MAX_INVOICE_SIZE) return null;

  try {
    await supabaseAdmin.storage.createBucket("invoices", { public: false }).catch(() => {});
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const safeExt = ["pdf", "jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "pdf";
    const path = `${tenantId}/${purchaseId}/nf.${safeExt}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabaseAdmin.storage
      .from("invoices")
      .upload(path, buffer, { contentType: file.type, upsert: true });
    if (error) return null;
    const { data } = await supabaseAdmin.storage.from("invoices").createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

async function getOrCreateDefaultLocation(tenantId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("locations")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (data) return data.id;

  const { data: created, error: locError } = await supabaseAdmin
    .from("locations")
    .insert({ tenant_id: tenantId, name: "Estoque Principal", type: "warehouse" })
    .select("id")
    .single();

  if (locError || !created) throw new Error(`Erro ao criar localização padrão: ${locError?.message ?? "desconhecido"}`);

  return created.id;
}

export type PurchaseState = { error?: string };

export async function createPurchaseAction(
  _prev: PurchaseState,
  formData: FormData
): Promise<PurchaseState> {
  try {
    return await _createPurchase(formData);
  } catch (err: unknown) {
    // redirect() lança um erro especial com digest — não capturar
    if (err != null && typeof err === "object" && "digest" in err) throw err;
    console.error("[createPurchaseAction] erro inesperado:", err);
    return { error: `Erro inesperado: ${err instanceof Error ? err.message : String(err)}` };
  }
}

async function _createPurchase(formData: FormData): Promise<PurchaseState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };
  const rl = await checkActionLimit(user.id, "create_purchase");
  if (!rl.success) return { error: `Muitas operações. Tente novamente em ${rl.retryAfter}s.` };

  const tenantId = await getTenantId();

  // Parse pending products e variants
  type PendingProductData = { tempId: string; name: string; categoryId?: string };
  type PendingVariantData = { tempId: string; productTempId: string; color: string; colorHex?: string; size: string; photoUrl?: string };

  let pendingProducts: PendingProductData[] = [];
  let pendingVariants: PendingVariantData[] = [];
  try {
    const pp = formData.get("pendingProducts") as string;
    const pv = formData.get("pendingVariants") as string;
    if (pp) pendingProducts = JSON.parse(pp);
    if (pv) pendingVariants = JSON.parse(pv);
  } catch {}

  let items: unknown[];
  try {
    items = JSON.parse(formData.get("items") as string);
  } catch {
    return { error: "Itens inválidos." };
  }

  const parsed = purchaseSchema.safeParse({
    supplierId: formData.get("supplierId") || undefined,
    invoiceNumber: formData.get("invoiceNumber") || undefined,
    purchasedAt: formData.get("purchasedAt"),
    paymentMethod: formData.get("paymentMethod") || undefined,
    status: formData.get("purchaseStatus") || "received",
    freightCost: Number(formData.get("freightCost") || 0),
    otherCosts: Number(formData.get("otherCosts") || 0),
    notes: formData.get("notes") || undefined,
    items,
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { supplierId, invoiceNumber, purchasedAt, paymentMethod, status, freightCost, otherCosts, notes } = parsed.data;

  const locationId = await getOrCreateDefaultLocation(tenantId);

  // ── Passo 1: criar produtos e variações pendentes ────────────────────────
  // Rastreamos o que foi criado para poder reverter em caso de falha
  const productIdMap: Record<string, string> = {};
  const createdProductIds: string[] = [];

  for (const pp of pendingProducts) {
    const { data: existing } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("tenant_id", tenantId)
      .ilike("name", pp.name.trim())
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();

    if (existing) {
      productIdMap[pp.tempId] = existing.id;
    } else {
      const coverImageUrl = pendingVariants.find((pv) => pv.productTempId === pp.tempId && pv.photoUrl)?.photoUrl ?? null;
      const { data: product } = await supabaseAdmin
        .from("products")
        .insert({ tenant_id: tenantId, name: pp.name, status: "active", cover_image_url: coverImageUrl, category_id: pp.categoryId ?? null })
        .select("id")
        .single();
      if (product) {
        productIdMap[pp.tempId] = product.id;
        createdProductIds.push(product.id);
      }
    }
  }

  const variantIdMap: Record<string, string> = {};
  const createdVariantIds: string[] = [];

  for (const pv of pendingVariants) {
    const productId = productIdMap[pv.productTempId] ?? pv.productTempId;
    const productName = pendingProducts.find(p => p.tempId === pv.productTempId)?.name ?? "";

    // Lookup by (product_id, color, size) — unique identity, avoids matching wrong product's variant by SKU
    const { data: existingVariant } = await supabaseAdmin
      .from("product_variants")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("product_id", productId)
      .ilike("color", pv.color.trim())
      .eq("size", pv.size)
      .is("deleted_at", null)
      .maybeSingle();

    const sku = generateSku(productName || pv.productTempId, pv.color, pv.size);

    if (existingVariant) {
      variantIdMap[pv.tempId] = existingVariant.id;
    } else {
      const { data: variant, error: variantError } = await supabaseAdmin
        .from("product_variants")
        .insert({ tenant_id: tenantId, product_id: productId, color: pv.color, color_hex: pv.colorHex ?? null, size: pv.size, sku, min_stock: 0 })
        .select("id")
        .single();
      if (variantError) {
        await rollback();
        return { error: `Erro ao criar variação (${pv.color} / ${pv.size}): ${variantError.message}` };
      }
      if (variant) {
        variantIdMap[pv.tempId] = variant.id;
        createdVariantIds.push(variant.id);
      }
    }
  }

  async function rollback() {
    if (createdVariantIds.length) await supabaseAdmin.from("product_variants").delete().in("id", createdVariantIds);
    if (createdProductIds.length) await supabaseAdmin.from("products").delete().in("id", createdProductIds);
  }

  // ── Passo 2: resolver IDs e calcular totais ──────────────────────────────
  const resolvedItems = parsed.data.items.map(item => ({
    ...item,
    variantId: variantIdMap[item.variantId] ?? item.variantId,
  }));

  // Verifica se todos os tempIds de variações pendentes foram resolvidos
  const unresolvedItems = resolvedItems.filter(item =>
    pendingVariants.some(pv => pv.tempId === item.variantId)
  );
  if (unresolvedItems.length > 0) {
    await rollback();
    return { error: "Não foi possível criar algumas variações. Verifique se a combinação cor/tamanho já existe para este produto." };
  }

  const totalItems = resolvedItems.reduce((s, i) => s + i.quantity, 0);
  const productsCost = resolvedItems.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  // Custo extra (frete + outros) rateado por peça
  const extraCostPerItem = totalItems > 0 ? (freightCost + otherCosts) / totalItems : 0;

  // ── Passo 3: criar compra ────────────────────────────────────────────────
  const { data: purchase, error: purchaseError } = await supabaseAdmin
    .from("purchases")
    .insert({
      tenant_id: tenantId,
      supplier_id: supplierId ?? null,
      location_id: locationId,
      status,
      invoice_number: invoiceNumber ?? null,
      products_cost: productsCost.toFixed(2),
      freight_cost: freightCost.toFixed(2),
      other_costs: otherCosts.toFixed(2),
      total_items: totalItems,
      payment_method: paymentMethod ?? null,
      notes: notes ?? null,
      purchased_at: new Date(purchasedAt).toISOString(),
      received_at: status === "received" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (purchaseError) {
    console.error("[createPurchase] purchaseError:", purchaseError.message, purchaseError.code);
    await rollback();
    return { error: "Erro ao registrar a compra. Tente novamente." };
  }

  // Upload NF (se enviada)
  const invoiceFile = formData.get("invoiceFile") as File | null;
  if (invoiceFile && invoiceFile.size > 0) {
    const invoiceUrl = await uploadInvoice(invoiceFile, tenantId, purchase.id);
    if (invoiceUrl) {
      await supabaseAdmin.from("purchases").update({ invoice_url: invoiceUrl }).eq("id", purchase.id);
    }
  }

  // ── Passo 4: criar itens da compra ───────────────────────────────────────
  const purchaseItems = resolvedItems.map((item) => ({
    purchase_id: purchase.id,
    variant_id: item.variantId,
    quantity: item.quantity,
    unit_cost: item.unitCost.toFixed(4),
    real_unit_cost: (item.unitCost + extraCostPerItem).toFixed(4),
  }));

  const { error: itemsError } = await supabaseAdmin
    .from("purchase_items")
    .insert(purchaseItems);

  if (itemsError) {
    await supabaseAdmin.from("purchases").delete().eq("id", purchase.id);
    await rollback();
    return { error: "Erro ao salvar itens da compra." };
  }

  await writeAuditLog({
    tenantId,
    action: "purchase.created",
    tableName: "purchases",
    recordId: purchase.id,
    newData: {
      invoice_number: invoiceNumber,
      supplier_id: supplierId,
      total_items: totalItems,
      products_cost: productsCost,
    } as Record<string, unknown>,
  });

  // 3. Atualizar estoque (atômico via RPC — sem race condition) e registrar movimentações
  const adjustedItems: { variantId: string; quantity: number }[] = [];

  for (const item of resolvedItems) {
    const invResult = await adjustInventory(tenantId, item.variantId, locationId, item.quantity);
    if (!invResult.ok) {
      // Reverter ajustes já aplicados neste loop
      for (const adj of adjustedItems) {
        await adjustInventory(tenantId, adj.variantId, locationId, -adj.quantity);
      }
      await supabaseAdmin.from("purchase_items").delete().eq("purchase_id", purchase.id);
      await supabaseAdmin.from("purchases").delete().eq("id", purchase.id);
      await rollback();
      return { error: `Erro ao atualizar estoque: ${invResult.message}` };
    }
    adjustedItems.push({ variantId: item.variantId, quantity: item.quantity });

    // Movimento
    await supabaseAdmin.from("inventory_movements").insert({
      tenant_id: tenantId,
      variant_id: item.variantId,
      location_id: locationId,
      quantity_delta: item.quantity,
      movement_type: "purchase",
      reference_id: purchase.id,
      note: `Compra ${invoiceNumber ?? purchase.id.slice(0, 8)}`,
    });
  }

  revalidatePath("/compras");
  revalidatePath("/estoque");
  revalidatePath("/produtos");
  redirect("/compras");
}

const updateItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitCost: z.number().min(0),
});

const updatePurchaseSchema = z.object({
  supplierId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1, "Nº nota fiscal obrigatório").max(60),
  purchasedAt: z.string().min(1, "Data obrigatória"),
  paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: "Forma de pagamento obrigatória" }) }),
  freightCost: z.number().min(0).default(0),
  otherCosts: z.number().min(0).default(0),
  notes: z.string().max(500).optional(),
  items: z.array(updateItemSchema).min(1, "Adicione ao menos um item"),
});

export type PurchaseUpdateState = { error?: string };

export async function updatePurchaseAction(
  id: string,
  _prev: PurchaseUpdateState,
  formData: FormData
): Promise<PurchaseUpdateState> {
  const tenantId = await getTenantId();

  let items: unknown[];
  try {
    items = JSON.parse(formData.get("items") as string);
  } catch {
    return { error: "Itens inválidos." };
  }

  const parsed = updatePurchaseSchema.safeParse({
    supplierId: formData.get("supplierId") || undefined,
    invoiceNumber: formData.get("invoiceNumber"),
    purchasedAt: formData.get("purchasedAt"),
    paymentMethod: formData.get("paymentMethod") || undefined,
    freightCost: Number(formData.get("freightCost") || 0),
    otherCosts: Number(formData.get("otherCosts") || 0),
    notes: formData.get("notes") || undefined,
    items,
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  // Busca compra atual com itens
  const { data: currentPurchase } = await supabaseAdmin
    .from("purchases")
    .select("*, purchase_items(variant_id, quantity, unit_cost)")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!currentPurchase) return { error: "Compra não encontrada." };

  const locationId = (currentPurchase as unknown as { location_id: string }).location_id;
  const currentItems = currentPurchase.purchase_items as { variant_id: string; quantity: number; unit_cost: string }[];

  const { supplierId, invoiceNumber, purchasedAt, paymentMethod, freightCost, otherCosts, notes } = parsed.data;

  // Reverte estoque dos itens antigos e registra movimentos de estorno (imutabilidade do log)
  for (const item of currentItems ?? []) {
    await adjustInventory(tenantId, item.variant_id, locationId, -Number(item.quantity));
    await supabaseAdmin.from("inventory_movements").insert({
      tenant_id: tenantId,
      variant_id: item.variant_id,
      location_id: locationId,
      quantity_delta: -Number(item.quantity),
      movement_type: "adjustment",
      reference_id: id,
      note: `Estorno de compra ${invoiceNumber ?? id.slice(0, 8)} (edição)`,
    });
  }

  const totalItems = parsed.data.items.reduce((s, i) => s + i.quantity, 0);
  const productsCost = parsed.data.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const extraCostPerItem = totalItems > 0 ? (freightCost + otherCosts) / totalItems : 0;

  // Atualiza a compra
  await supabaseAdmin
    .from("purchases")
    .update({
      supplier_id: supplierId ?? null,
      invoice_number: invoiceNumber,
      purchased_at: new Date(purchasedAt).toISOString(),
      payment_method: paymentMethod,
      products_cost: productsCost.toFixed(2),
      freight_cost: freightCost.toFixed(2),
      other_costs: otherCosts.toFixed(2),
      total_items: totalItems,
      notes: notes ?? null,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  // Remove apenas os itens antigos (movimentos são mantidos — estornos já foram inseridos acima)
  await supabaseAdmin.from("purchase_items").delete().eq("purchase_id", id);

  // Insere novos itens
  const purchaseItems = parsed.data.items.map((item) => ({
    purchase_id: id,
    variant_id: item.variantId,
    quantity: item.quantity,
    unit_cost: item.unitCost.toFixed(4),
    real_unit_cost: (item.unitCost + extraCostPerItem).toFixed(4),
  }));
  await supabaseAdmin.from("purchase_items").insert(purchaseItems);

  // Atualiza estoque com novos itens (atômico via RPC)
  for (const item of parsed.data.items) {
    await adjustInventory(tenantId, item.variantId, locationId, item.quantity);

    await supabaseAdmin.from("inventory_movements").insert({
      tenant_id: tenantId,
      variant_id: item.variantId,
      location_id: locationId,
      quantity_delta: item.quantity,
      movement_type: "purchase",
      reference_id: id,
      note: `Compra ${invoiceNumber ?? id.slice(0, 8)} (editada)`,
    });
  }

  await writeAuditLog({
    tenantId,
    action: "purchase.updated",
    tableName: "purchases",
    recordId: id,
    newData: { invoice_number: invoiceNumber, total_items: totalItems } as Record<string, unknown>,
  });

  revalidatePath("/compras");
  revalidatePath("/estoque");
  revalidatePath("/produtos");
  redirect("/compras");
}

export async function updatePurchaseStatusAction(
  id: string,
  status: "received" | "confirmed" | "cancelled"
): Promise<void> {
  const tenantId = await getTenantId();

  const { data: before } = await supabaseAdmin
    .from("purchases")
    .select("id, status, invoice_number")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  await supabaseAdmin
    .from("purchases")
    .update({
      status,
      received_at: status === "received" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  await writeAuditLog({
    tenantId,
    action: "purchase.status_changed",
    tableName: "purchases",
    recordId: id,
    oldData: before as unknown as Record<string, unknown>,
    newData: { status },
  });

  revalidatePath("/compras");
}

export async function uploadInvoiceAction(
  purchaseId: string,
  formData: FormData,
): Promise<{ error?: string; url?: string }> {
  const tenantId = await getTenantId();
  const file = formData.get("invoiceFile") as File | null;
  if (!file || file.size === 0) return { error: "Nenhum arquivo selecionado." };

  const url = await uploadInvoice(file, tenantId, purchaseId);
  if (!url) return { error: "Erro ao fazer upload do arquivo." };

  await supabaseAdmin.from("purchases").update({ invoice_url: url }).eq("id", purchaseId).eq("tenant_id", tenantId);

  revalidatePath(`/compras/${purchaseId}`);
  return { url };
}

export async function bulkDeletePurchasesAction(ids: string[]): Promise<{ deleted: number }> {
  let deleted = 0;
  for (const id of ids) {
    const result = await deletePurchaseAction(id);
    if (!result.error) deleted++;
  }
  return { deleted };
}

export async function deletePurchaseAction(id: string): Promise<{ error?: string }> {
  const tenantId = await getTenantId();

  const { data: purchase } = await supabaseAdmin
    .from("purchases")
    .select("*, purchase_items(variant_id, quantity, unit_cost, real_unit_cost)")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (!purchase) return { error: "Compra não encontrada." };

  await writeAuditLog({
    tenantId,
    action: "purchase.deleted",
    tableName: "purchases",
    recordId: id,
    oldData: purchase as unknown as Record<string, unknown>,
  });

  await supabaseAdmin.from("inventory_movements").delete().eq("reference_id", id);
  await supabaseAdmin.from("purchase_items").delete().eq("purchase_id", id);
  await supabaseAdmin.from("purchases").delete().eq("id", id).eq("tenant_id", tenantId);

  revalidatePath("/compras");
  revalidatePath("/estoque");
  return {};
}
