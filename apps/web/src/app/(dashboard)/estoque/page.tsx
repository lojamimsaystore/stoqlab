import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { EstoqueTable } from "./estoque-table";
import { CleanOrphansButton } from "./clean-orphans-button";

export default async function EstoquePage() {
  const tenantId = await getTenantId();

  const { data: variants } = await supabaseAdmin
    .from("product_variants")
    .select(`
      id, color, size, sku, min_stock,
      products!inner(name, deleted_at, categories(name)),
      inventory(id, quantity, location_id, locations(name))
    `)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at");

  // Expande cada variação por localização com estoque
  const tableRows = (variants ?? []).flatMap((v) => {
    const product = v.products as { name: string; deleted_at: string | null; categories: { name: string } | null } | null;
    const invList = v.inventory as { id: string; quantity: number; location_id: string; locations: { name: string } | null }[] | null;

    // Ignora variações cujo produto foi deletado (órfãos)
    if (product?.deleted_at) return [];
    if (!invList?.length) return [];

    return invList.map((inv) => ({
      id: inv.id,
      variantId: v.id,
      color: v.color,
      size: v.size,
      sku: v.sku ?? "",
      productName: product?.name ?? "—",
      categoryName: product?.categories?.name ?? null,
      locationId: inv.location_id,
      locationName: inv.locations?.name ?? "—",
      quantity: inv.quantity,
      minStock: v.min_stock ?? 0,
    }));
  }).sort((a, b) => a.quantity - b.quantity);

  // Conta órfãos para exibir alerta
  const orphanCount = (variants ?? []).filter((v) => {
    const p = v.products as { deleted_at: string | null } | null;
    return !!p?.deleted_at;
  }).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Estoque</h1>
        <p className="text-sm text-slate-500 mt-1">
          Visualize e ajuste o estoque de todas as variações.
        </p>
      </div>
      <CleanOrphansButton count={orphanCount} />
      <EstoqueTable rows={tableRows} />
    </div>
  );
}
