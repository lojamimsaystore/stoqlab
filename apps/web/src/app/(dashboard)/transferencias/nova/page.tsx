import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
      .select(`id, color, size, sku, products!inner(name), inventory(quantity, location_id)`)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
  ]);

  const variants = (inventoryRows ?? []).map((v) => {
    const product = v.products as { name: string } | null;
    const invList = v.inventory as { quantity: number; location_id: string }[];
    const stock: Record<string, number> = {};
    for (const inv of invList ?? []) stock[inv.location_id] = inv.quantity;
    return { id: v.id, color: v.color, size: v.size, sku: v.sku ?? "", productName: product?.name ?? "—", stock };
  }).sort((a, b) => a.productName.localeCompare(b.productName));

  if ((locations ?? []).length < 2) {
    return (
      <div className="space-y-6 max-w-2xl">
        <nav className="flex items-center gap-1 text-sm text-slate-500">
          <Link href="/transferencias" className="hover:text-slate-700">Transferências</Link>
          <ChevronRight size={14} />
          <span className="text-slate-900 font-medium">Nova transferência</span>
        </nav>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="font-semibold text-amber-900 mb-1">Você precisa de ao menos 2 localizações</h2>
          <p className="text-sm text-amber-700 mb-4">Cadastre mais uma loja ou depósito para poder transferir estoque.</p>
          <AddLocationForm />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/transferencias" className="hover:text-slate-700">Transferências</Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">Nova transferência</span>
      </nav>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Nova transferência</h1>
        <p className="text-sm text-slate-500 mt-1">Mova estoque entre lojas ou depósitos.</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <TransferForm locations={locations ?? []} variants={variants} />
      </div>
    </div>
  );
}
