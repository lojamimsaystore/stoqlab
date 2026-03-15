import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { TransferForm } from "./transfer-form";
import { AddLocationForm } from "../add-location-form";

export default async function NovaTransferenciaPage() {
  const tenantId = await getTenantId();

  const [{ data: locations }, { data: inventoryRows }] = await Promise.all([
    supabaseAdmin
      .from("locations")
      .select("id, name, type")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("name"),
    supabaseAdmin
      .from("product_variants")
      .select(`id, color, color_hex, size, sku, products!inner(id, name, cover_image_url), inventory(quantity, location_id)`)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
  ]);

  // Agrupa variantes por produto
  type ProductMap = {
    id: string; name: string; imageUrl: string | null;
    variants: { id: string; color: string; colorHex: string | null; size: string; sku: string; stock: Record<string, number> }[];
  };
  const productsMap = new Map<string, ProductMap>();
  for (const v of inventoryRows ?? []) {
    const product = v.products as { id: string; name: string; cover_image_url: string | null } | null;
    if (!product) continue;
    if (!productsMap.has(product.id)) {
      productsMap.set(product.id, { id: product.id, name: product.name, imageUrl: product.cover_image_url, variants: [] });
    }
    const invList = v.inventory as { quantity: number; location_id: string }[];
    const stock: Record<string, number> = {};
    for (const inv of invList ?? []) stock[inv.location_id] = inv.quantity;
    productsMap.get(product.id)!.variants.push({
      id: v.id, color: v.color, colorHex: v.color_hex ?? null, size: v.size, sku: v.sku ?? "", stock,
    });
  }
  const products = [...productsMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  if ((locations ?? []).length < 2) {
    return (
      <div className="space-y-6">
        <Link href="/transferencias" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={15} />
          Voltar
        </Link>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="font-semibold text-amber-900 mb-1">Você precisa de ao menos 2 localizações</h2>
          <p className="text-sm text-amber-700 mb-4">Cadastre mais uma loja ou depósito para poder transferir estoque.</p>
          <AddLocationForm />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/transferencias" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} />
        Voltar
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Nova transferência</h1>
        <p className="text-sm text-slate-500 mt-1">Mova estoque entre lojas ou depósitos.</p>
      </div>
      <TransferForm locations={locations ?? []} products={products} />
    </div>
  );
}
