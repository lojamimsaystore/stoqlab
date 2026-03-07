"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { createProductFullSchema, variantSchema } from "@stoqlab/validators";

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
  const clean = (s: string) =>
    s
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
  return `${clean(name)}-${clean(color)}-${size}`;
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

  const { name, categoryId, description, color, size, quantity, salePrice, costPrice, purchaseDate } = parsed.data;

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

// ─── Excluir produto ──────────────────────────────────────────

export async function deleteProductAction(id: string) {
  const tenantId = await getTenantId();
  const deletedAt = new Date().toISOString();

  // Soft-delete em cascata: variações primeiro, depois o produto
  await supabaseAdmin
    .from("product_variants")
    .update({ deleted_at: deletedAt })
    .eq("product_id", id)
    .eq("tenant_id", tenantId);

  await supabaseAdmin
    .from("products")
    .update({ deleted_at: deletedAt })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath("/produtos");
  revalidatePath("/estoque");
}

// Limpa variações órfãs (produto deletado mas variação sem deleted_at)
export async function cleanOrphanVariantsAction(): Promise<void> {
  const tenantId = await getTenantId();

  const { data: deletedProducts } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("tenant_id", tenantId)
    .not("deleted_at", "is", null);

  if (!deletedProducts?.length) return;

  const ids = deletedProducts.map((p) => p.id);

  await supabaseAdmin
    .from("product_variants")
    .update({ deleted_at: new Date().toISOString() })
    .in("product_id", ids)
    .is("deleted_at", null);

  revalidatePath("/estoque");
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

// ─── Excluir variação ─────────────────────────────────────────

export async function deleteVariantAction(id: string, productId: string) {
  const tenantId = await getTenantId();

  await supabaseAdmin
    .from("product_variants")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath(`/produtos/${productId}`);
}
