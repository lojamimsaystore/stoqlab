"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";

const itemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitCost: z.number().min(0),
});

const PAYMENT_METHODS = ["cash", "pix", "debit", "credit"] as const;

const purchaseSchema = z.object({
  supplierId: z.string().uuid().optional(),
  invoiceNumber: z.string().min(1, "Nº nota fiscal obrigatório").max(60),
  purchasedAt: z.string().min(1, "Data obrigatória"),
  paymentMethod: z.enum(PAYMENT_METHODS, { errorMap: () => ({ message: "Forma de pagamento obrigatória" }) }),
  freightCost: z.number().min(0).default(0),
  otherCosts: z.number().min(0).default(0),
  notes: z.string().max(500).optional(),
  items: z.array(itemSchema).min(1, "Adicione ao menos um item"),
});

function generateSku(name: string, color: string, size: string): string {
  const clean = (s: string) =>
    s.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return `${clean(name)}-${clean(color)}-${size}`;
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
    .single();

  if (data) return data.id;

  const { data: created } = await supabaseAdmin
    .from("locations")
    .insert({ tenant_id: tenantId, name: "Estoque Principal", type: "warehouse" })
    .select("id")
    .single();

  return created!.id;
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
  const tenantId = await getTenantId();

  // Parse pending products e variants
  type PendingProductData = { tempId: string; name: string };
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
    freightCost: Number(formData.get("freightCost") || 0),
    otherCosts: Number(formData.get("otherCosts") || 0),
    notes: formData.get("notes") || undefined,
    items,
  });

  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { supplierId, invoiceNumber, purchasedAt, paymentMethod, freightCost, otherCosts, notes } = parsed.data;

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
        .insert({ tenant_id: tenantId, name: pp.name, status: "active", cover_image_url: coverImageUrl })
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
    const sku = generateSku(productName || pv.productTempId, pv.color, pv.size);
    const { data: variant } = await supabaseAdmin
      .from("product_variants")
      .insert({ tenant_id: tenantId, product_id: productId, color: pv.color, color_hex: pv.colorHex ?? null, size: pv.size, sku, min_stock: 0 })
      .select("id")
      .single();
    if (variant) {
      variantIdMap[pv.tempId] = variant.id;
      createdVariantIds.push(variant.id);
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
      status: "received",
      invoice_number: invoiceNumber ?? null,
      products_cost: productsCost.toFixed(2),
      freight_cost: freightCost.toFixed(2),
      other_costs: otherCosts.toFixed(2),
      total_items: totalItems,
      payment_method: paymentMethod ?? null,
      notes: notes ?? null,
      purchased_at: new Date(purchasedAt).toISOString(),
      received_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (purchaseError) {
    await rollback();
    return { error: `[DEBUG] ${purchaseError.message} (${purchaseError.code})` };
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

  // 3. Atualizar estoque e registrar movimentações
  for (const item of resolvedItems) {
    // Upsert inventory
    const { data: inv } = await supabaseAdmin
      .from("inventory")
      .select("id, quantity")
      .eq("variant_id", item.variantId)
      .eq("location_id", locationId)
      .single();

    if (inv) {
      await supabaseAdmin
        .from("inventory")
        .update({ quantity: inv.quantity + item.quantity })
        .eq("id", inv.id);
    } else {
      await supabaseAdmin.from("inventory").insert({
        tenant_id: tenantId,
        variant_id: item.variantId,
        location_id: locationId,
        quantity: item.quantity,
      });
    }

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
  redirect("/compras");
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

export async function deletePurchaseAction(id: string): Promise<void> {
  const tenantId = await getTenantId();

  // Deletar itens antes (purchase_items pode não ter cascade no banco)
  await supabaseAdmin.from("purchase_items").delete().eq("purchase_id", id);

  await supabaseAdmin
    .from("purchases")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath("/compras");
}
