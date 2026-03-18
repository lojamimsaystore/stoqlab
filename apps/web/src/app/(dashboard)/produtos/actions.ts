"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { createProductFullSchema, variantSchema } from "@stoqlab/validators";
import { writeAuditLog } from "@/lib/audit";

// ─── Helper: garante que existe uma localização padrão ───────

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

// ─── Helper: upload de foto ──────────────────────────────────

async function uploadPhoto(
  file: File,
  tenantId: string,
  productId: string,
): Promise<string | null> {
  try {
    // Garante que o bucket existe
    await supabaseAdmin.storage.createBucket("products", { public: true }).catch(() => {});

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${tenantId}/${productId}/cover.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from("products")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (error) return null;

    const { data } = supabaseAdmin.storage.from("products").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

// ─── Gera SKU automático ─────────────────────────────────────

function generateSku(name: string, color: string, size: string): string {
  const clean = (s: string, len: number) =>
    s
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, len);
  // Usa suffix aleatório para eliminar colisões quando nome+cor+tamanho são similares
  const suffix = Math.floor(Math.random() * 900 + 100); // 3 dígitos
  return `${clean(name, 4)}-${clean(color, 4)}-${size}-${suffix}`;
}

// ─── Criar produto completo (produto + variação + estoque) ───

export type ProductState = { error?: string };

export async function createProductAction(
  _prev: ProductState,
  formData: FormData,
): Promise<ProductState> {
  const tenantId = await getTenantId();

  const raw = {
    name: formData.get("name"),
    categoryId: formData.get("categoryId") || undefined,
    description: formData.get("description") || undefined,
    color: formData.get("color"),
    size: formData.get("size"),
    quantity: formData.get("quantity") ?? "0",
    salePrice: formData.get("salePrice") || undefined,
    costPrice: formData.get("costPrice") || undefined,
    purchaseDate: formData.get("purchaseDate") || undefined,
  };

  const parsed = createProductFullSchema.safeParse(raw);
  if (!parsed.success)
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const { name, categoryId, description, color, size, quantity, salePrice, purchaseDate } = parsed.data;

  // 1. Criar produto
  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .insert({
      tenant_id: tenantId,
      name,
      category_id: categoryId ?? null,
      description: description ?? null,
      status: "active",
    })
    .select("id")
    .single();

  if (productError) return { error: "Erro ao criar produto." };

  // 2. Upload de foto (se houver)
  const photo = formData.get("photo") as File | null;
  if (photo && photo.size > 0) {
    const url = await uploadPhoto(photo, tenantId, product.id);
    if (url) {
      await supabaseAdmin
        .from("products")
        .update({ cover_image_url: url })
        .eq("id", product.id);
    }
  }

  // 3. Criar variação
  const sku = generateSku(name, color, size);
  const { data: variant, error: variantError } = await supabaseAdmin
    .from("product_variants")
    .insert({
      tenant_id: tenantId,
      product_id: product.id,
      color,
      size,
      sku,
      sale_price: salePrice ?? null,
      min_stock: 0,
    })
    .select("id")
    .single();

  if (variantError) {
    await supabaseAdmin.from("products").delete().eq("id", product.id);
    return { error: "Erro ao criar variação. SKU pode já existir." };
  }

  // 4. Criar registro de inventário se quantidade > 0
  if (quantity > 0) {
    const locationId = await getOrCreateDefaultLocation(tenantId);

    await supabaseAdmin.from("inventory").insert({
      tenant_id: tenantId,
      variant_id: variant.id,
      location_id: locationId,
      quantity,
    });

    // Log de movimentação
    await supabaseAdmin.from("inventory_movements").insert({
      tenant_id: tenantId,
      variant_id: variant.id,
      location_id: locationId,
      quantity_delta: quantity,
      movement_type: "purchase",
      note: purchaseDate ? `Compra em ${purchaseDate}` : "Entrada inicial",
    });
  }

  revalidatePath("/produtos");
  redirect("/produtos");
}

// ─── Atualizar produto ────────────────────────────────────────

export async function updateProductAction(
  id: string,
  _prev: ProductState,
  formData: FormData,
): Promise<ProductState> {
  const tenantId = await getTenantId();

  const name = formData.get("name") as string;
  const categoryId = formData.get("categoryId") as string || undefined;
  const description = formData.get("description") as string || undefined;
  const status = formData.get("status") as string || "active";

  if (!name?.trim()) return { error: "Nome obrigatório" };

  // Upload de foto
  let coverImageUrl: string | undefined;
  const photo = formData.get("photo") as File | null;
  if (photo && photo.size > 0) {
    const url = await uploadPhoto(photo, tenantId, id);
    if (url) coverImageUrl = url;
  }

  const { error } = await supabaseAdmin
    .from("products")
    .update({
      name,
      category_id: categoryId ?? null,
      description: description ?? null,
      status,
      ...(coverImageUrl ? { cover_image_url: coverImageUrl } : {}),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) return { error: "Erro ao atualizar produto." };

  revalidatePath("/produtos");
  redirect(`/produtos/${id}`);
}

// ─── Arquivar / Restaurar produto ────────────────────────────

export async function toggleProductArchiveAction(
  id: string,
  currentStatus: string,
): Promise<void> {
  const tenantId = await getTenantId();
  const newStatus = currentStatus === "archived" ? "active" : "archived";
  await supabaseAdmin
    .from("products")
    .update({ status: newStatus })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  await writeAuditLog({
    tenantId,
    action: newStatus === "archived" ? "product.archived" : "product.restored",
    tableName: "products",
    recordId: id,
    oldData: { status: currentStatus },
    newData: { status: newStatus },
  });

  revalidatePath("/produtos");
}

// ─── Excluir múltiplos produtos ──────────────────────────────

export async function bulkDeleteProductsAction(ids: string[]): Promise<{ error?: string; deleted: number }> {
  const tenantId = await getTenantId();
  let deleted = 0;

  for (const id of ids) {
    const { data: variants } = await supabaseAdmin
      .from("product_variants")
      .select("id")
      .eq("product_id", id)
      .eq("tenant_id", tenantId);

    const variantIds = variants?.map((v) => v.id) ?? [];

    if (variantIds.length > 0) {
      const [{ data: saleItems }, { data: purchaseItems }, { data: transferItems }] = await Promise.all([
        supabaseAdmin.from("sale_items").select("id").in("variant_id", variantIds).limit(1),
        supabaseAdmin.from("purchase_items").select("id").in("variant_id", variantIds).limit(1),
        supabaseAdmin.from("transfer_items").select("id").in("variant_id", variantIds).limit(1),
      ]);

      if (saleItems?.length || purchaseItems?.length || transferItems?.length) {
        continue; // pula produtos vinculados
      }

      await supabaseAdmin.from("inventory_movements").delete().in("variant_id", variantIds);
      await supabaseAdmin.from("inventory").delete().in("variant_id", variantIds);
      await supabaseAdmin.from("product_variants").delete().in("id", variantIds);
    }

    const { error } = await supabaseAdmin.from("products").delete().eq("id", id).eq("tenant_id", tenantId);
    if (!error) deleted++;
  }

  revalidatePath("/produtos");
  revalidatePath("/estoque");
  return { deleted };
}

// ─── Excluir produto ──────────────────────────────────────────

export async function deleteProductAction(id: string): Promise<{ error?: string }> {
  const tenantId = await getTenantId();

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  const { data: variants } = await supabaseAdmin
    .from("product_variants")
    .select("id")
    .eq("product_id", id)
    .eq("tenant_id", tenantId);

  const variantIds = variants?.map((v) => v.id) ?? [];

  // Verifica se há vendas ou compras vinculadas
  if (variantIds.length > 0) {
    const [{ data: saleItems }, { data: purchaseItems }, { data: transferItems }] = await Promise.all([
      supabaseAdmin.from("sale_items").select("id").in("variant_id", variantIds).limit(1),
      supabaseAdmin.from("purchase_items").select("id").in("variant_id", variantIds).limit(1),
      supabaseAdmin.from("transfer_items").select("id").in("variant_id", variantIds).limit(1),
    ]);

    if (saleItems?.length || purchaseItems?.length || transferItems?.length) {
      return { error: "Este produto possui vendas, compras ou transferências vinculadas e não pode ser excluído. Use a opção de arquivar." };
    }
  }

  await writeAuditLog({
    tenantId,
    action: "product.deleted",
    tableName: "products",
    recordId: id,
    oldData: product as unknown as Record<string, unknown>,
  });

  if (variantIds.length > 0) {
    await supabaseAdmin.from("inventory_movements").delete().in("variant_id", variantIds);
    await supabaseAdmin.from("inventory").delete().in("variant_id", variantIds);
    await supabaseAdmin.from("product_variants").delete().in("id", variantIds);
  }

  const { error } = await supabaseAdmin.from("products").delete().eq("id", id).eq("tenant_id", tenantId);
  if (error) return { error: "Erro ao excluir produto." };

  revalidatePath("/produtos");
  revalidatePath("/estoque");
  return {};
}

// ─── Criar variação adicional ─────────────────────────────────

export type VariantState = { error?: string };

export async function createVariantAction(
  productId: string,
  productName: string,
  _prev: VariantState,
  formData: FormData,
): Promise<VariantState> {
  const tenantId = await getTenantId();

  const raw = {
    color: formData.get("color"),
    size: formData.get("size"),
    sku: formData.get("sku") || generateSku(productName, formData.get("color") as string, formData.get("size") as string),
    barcode: formData.get("barcode") || undefined,
    salePrice: formData.get("salePrice") || undefined,
    minStock: formData.get("minStock") ?? "0",
    quantity: formData.get("quantity") ?? "0",
  };

  const parsed = variantSchema.safeParse(raw);
  if (!parsed.success)
    return { error: parsed.error.errors[0]?.message ?? "Dados inválidos" };

  const { data: variant, error } = await supabaseAdmin
    .from("product_variants")
    .insert({
      tenant_id: tenantId,
      product_id: productId,
      color: parsed.data.color,
      size: parsed.data.size,
      sku: parsed.data.sku,
      barcode: parsed.data.barcode,
      sale_price: parsed.data.salePrice,
      min_stock: parsed.data.minStock,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "SKU ou código de barras já existe." };
    return { error: "Erro ao criar variação." };
  }

  if (parsed.data.quantity > 0) {
    const locationId = await getOrCreateDefaultLocation(tenantId);
    await supabaseAdmin.from("inventory").insert({
      tenant_id: tenantId,
      variant_id: variant.id,
      location_id: locationId,
      quantity: parsed.data.quantity,
    });
    await supabaseAdmin.from("inventory_movements").insert({
      tenant_id: tenantId,
      variant_id: variant.id,
      location_id: locationId,
      quantity_delta: parsed.data.quantity,
      movement_type: "purchase",
    });
  }

  revalidatePath(`/produtos/${productId}`);
  return {};
}

// ─── Upload temporário de foto (antes de criar produto) ──────

export async function uploadTempPhotoAction(formData: FormData): Promise<string | null> {
  const tenantId = await getTenantId();
  const photo = formData.get("photo") as File | null;
  if (!photo || photo.size === 0) return null;
  try {
    await supabaseAdmin.storage.createBucket("products", { public: true }).catch(() => {});
    const ext = photo.name.split(".").pop() ?? "jpg";
    const path = `${tenantId}/pending/${Date.now()}.${ext}`;
    const buffer = Buffer.from(await photo.arrayBuffer());
    const { error } = await supabaseAdmin.storage
      .from("products")
      .upload(path, buffer, { contentType: photo.type });
    if (error) return null;
    const { data } = supabaseAdmin.storage.from("products").getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

// ─── Criar produto inline (a partir da tela de compras) ──────

type InlineProduct = { id: string; name: string };

export async function createProductInlineAction(
  _prev: { error?: string; product?: InlineProduct },
  formData: FormData,
): Promise<{ error?: string; product?: InlineProduct }> {
  const tenantId = await getTenantId();

  const name = (formData.get("name") as string)?.trim().toUpperCase();
  if (!name) return { error: "Nome obrigatório." };

  // Nome deve ser único
  const { data: existing } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("name", name)
    .is("deleted_at", null)
    .limit(1)
    .single();

  if (existing) return { error: `Já existe um produto com o nome "${name}".` };

  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .insert({ tenant_id: tenantId, name, status: "active" })
    .select("id")
    .single();

  if (productError || !product) return { error: "Erro ao criar produto." };

  // Upload de foto
  const photo = formData.get("photo") as File | null;
  if (photo && photo.size > 0) {
    const url = await uploadPhoto(photo, tenantId, product.id);
    if (url) await supabaseAdmin.from("products").update({ cover_image_url: url }).eq("id", product.id);
  }

  revalidatePath("/produtos");
  revalidatePath("/compras/nova");

  return { product: { id: product.id, name } };
}

// ─── Criar variação inline (a partir da tela de compras) ─────

type InlineVariant = { id: string; color: string; size: string; sku: string };

export async function createVariantInlineAction(
  _prev: { error?: string; variant?: InlineVariant },
  formData: FormData,
): Promise<{ error?: string; variant?: InlineVariant }> {
  const tenantId = await getTenantId();

  const productId = formData.get("productId") as string;
  const color = (formData.get("color") as string)?.trim();
  const size = formData.get("size") as string;

  if (!productId || !color || !size) return { error: "Preencha todos os campos." };

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("name")
    .eq("id", productId)
    .eq("tenant_id", tenantId)
    .single();

  if (!product) return { error: "Produto não encontrado." };

  const sku = generateSku(product.name, color, size);

  const { data: variant, error } = await supabaseAdmin
    .from("product_variants")
    .insert({ tenant_id: tenantId, product_id: productId, color, size, sku, min_stock: 0 })
    .select("id, color, size, sku")
    .single();

  if (error) return { error: "Essa combinação de cor e tamanho já existe neste produto." };

  revalidatePath("/compras/nova");

  return { variant: { id: variant.id, color: variant.color, size: variant.size, sku: variant.sku } };
}

// ─── Atualizar preço de venda (uma ou várias variações) ───────

export async function updateVariantsSalePriceAction(
  variantIds: string[],
  productId: string,
  salePrice: number,
): Promise<{ error?: string }> {
  const tenantId = await getTenantId();

  const { error } = await supabaseAdmin
    .from("product_variants")
    .update({ sale_price: salePrice.toFixed(2) })
    .in("id", variantIds)
    .eq("tenant_id", tenantId);

  if (error) return { error: "Erro ao atualizar preço." };

  revalidatePath(`/produtos/${productId}/variacoes`);
  return {};
}

// ─── Limpar variações órfãs (produtos deletados) ─────────────

export async function cleanOrphanVariantsAction(): Promise<void> {
  const tenantId = await getTenantId();

  // Busca variações cujo produto foi deletado (deleted_at não nulo)
  const { data: orphans } = await supabaseAdmin
    .from("product_variants")
    .select("id, product_id, products!inner(deleted_at)")
    .eq("tenant_id", tenantId)
    .not("products.deleted_at", "is", null);

  const orphanIds = orphans?.map((v) => v.id) ?? [];
  if (orphanIds.length === 0) return;

  await supabaseAdmin.from("inventory_movements").delete().in("variant_id", orphanIds);
  await supabaseAdmin.from("inventory").delete().in("variant_id", orphanIds);
  await supabaseAdmin.from("product_variants").delete().in("id", orphanIds);

  revalidatePath("/estoque");
  revalidatePath("/produtos");
}

// ─── Excluir variação ─────────────────────────────────────────

export async function deleteVariantAction(id: string, productId: string) {
  const tenantId = await getTenantId();

  const { data: variant } = await supabaseAdmin
    .from("product_variants")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  await writeAuditLog({
    tenantId,
    action: "variant.deleted",
    tableName: "product_variants",
    recordId: id,
    oldData: variant as unknown as Record<string, unknown>,
  });

  await supabaseAdmin.from("inventory_movements").delete().eq("variant_id", id);
  await supabaseAdmin.from("inventory").delete().eq("variant_id", id);
  await supabaseAdmin.from("product_variants").delete().eq("id", id).eq("tenant_id", tenantId);

  revalidatePath(`/produtos/${productId}`);
}
