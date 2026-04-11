import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { VariantColorGroups } from "./variant-color-groups";

export default async function VariacoesPage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = await getTenantId();

  const [{ data: product }, { data: variants }] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("id, name, brand, cover_image_url")
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .single(),
    supabaseAdmin
      .from("product_variants")
      .select("id, size, color, color_hex, sku, sale_price, min_stock")
      .eq("product_id", params.id)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("color")
      .order("size"),
  ]);

  if (!product) notFound();

  const variantIds = variants?.map((v) => v.id) ?? [];

  // Buscar estoque e custo de compra em paralelo
  const [{ data: inventory }, { data: purchaseItems }] = await Promise.all([
    variantIds.length
      ? supabaseAdmin
          .from("inventory")
          .select("variant_id, quantity")
          .in("variant_id", variantIds)
          .eq("tenant_id", tenantId)
      : Promise.resolve({ data: [] }),
    variantIds.length
      ? supabaseAdmin
          .from("purchase_items")
          .select("variant_id, real_unit_cost")
          .in("variant_id", variantIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const stockMap: Record<string, number> = {};
  for (const inv of inventory ?? []) {
    stockMap[inv.variant_id] = (stockMap[inv.variant_id] ?? 0) + inv.quantity;
  }

  // Custo médio de compra por variação (usando real_unit_cost)
  const costMap: Record<string, number> = {};
  const costCount: Record<string, number> = {};
  for (const item of purchaseItems ?? []) {
    if (item.real_unit_cost) {
      costMap[item.variant_id] = (costMap[item.variant_id] ?? 0) + Number(item.real_unit_cost);
      costCount[item.variant_id] = (costCount[item.variant_id] ?? 0) + 1;
    }
  }
  for (const id of Object.keys(costMap)) {
    costMap[id] = costMap[id] / costCount[id];
  }

  return (
    <div className="space-y-6">
      <Link
        href="/produtos"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={15} />
        Produtos
      </Link>

      {/* Cabeçalho do produto */}
      <div className="flex items-center gap-4">
        {product.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.cover_image_url}
            alt={product.name}
            className="w-16 h-20 object-cover rounded-lg border border-slate-200"
          />
        )}
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{product.name}</h1>
          {product.brand && (
            <p className="text-sm text-slate-400">{product.brand}</p>
          )}
          <p className="text-sm text-slate-500 mt-0.5">
            {variants?.length ?? 0} produto{(variants?.length ?? 0) !== 1 ? "s" : ""} cadastrado{(variants?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={`/produtos/${params.id}`}
          className="ml-auto text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors"
        >
          Editar produto
        </Link>
      </div>

      {/* Cores agrupadas */}
      <VariantColorGroups
        variants={variants ?? []}
        stockMap={stockMap}
        costMap={costMap}
        productId={params.id}
        productName={product.name}
      />

    </div>
  );
}
