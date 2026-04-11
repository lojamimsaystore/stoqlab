import { redirect, notFound } from "next/navigation";
import { ShieldX, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import { ScanSaleForm } from "./scan-sale-form";

const SALE_ROLES = ["owner", "manager", "seller"];

export default async function ScanVenderPage({
  params,
}: {
  params: { id: string };
}) {
  // ── Auth ────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/q/${params.id}/vender`);

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) redirect("/login");

  // ── Controle de acesso ───────────────────────────────────────
  if (!SALE_ROLES.includes(profile.role)) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 text-center space-y-4">
          <ShieldX size={44} className="text-red-400 mx-auto" />
          <h1 className="text-lg font-bold text-slate-900">Sem permissão</h1>
          <p className="text-sm text-slate-500">
            Seu perfil não permite realizar vendas.
            <br />
            Fale com o responsável da loja.
          </p>
        </div>
      </div>
    );
  }

  // ── Busca variação + produto ─────────────────────────────────
  const { data: variant } = await supabaseAdmin
    .from("product_variants")
    .select("id, sku, color, color_hex, size, sale_price, products(name, cover_image_url)")
    .eq("id", params.id)
    .eq("tenant_id", profile.tenant_id)
    .is("deleted_at", null)
    .single();

  if (!variant) notFound();

  const product = variant.products as unknown as {
    name: string;
    cover_image_url: string | null;
  } | null;

  // ── Localizações com estoque para esta variação ──────────────
  const [{ data: locationRows }, { data: invRows }] = await Promise.all([
    supabaseAdmin
      .from("locations")
      .select("id, name, type")
      .eq("tenant_id", profile.tenant_id)
      .is("deleted_at", null)
      .order("name"),
    supabaseAdmin
      .from("inventory")
      .select("quantity, location_id")
      .eq("variant_id", variant.id)
      .gt("quantity", 0),
  ]);

  const stockMap: Record<string, number> = {};
  for (const row of invRows ?? []) {
    stockMap[row.location_id] = row.quantity;
  }

  const locationsWithStock = (locationRows ?? []).filter(
    (l) => (stockMap[l.id] ?? 0) > 0
  );

  const price = variant.sale_price ? Number(variant.sale_price) : null;
  const priceFormatted =
    price !== null
      ? price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : null;

  return (
    <div className="min-h-screen bg-slate-100 flex items-start justify-center p-4 pt-6">
      <div className="w-full max-w-sm space-y-3">

        {/* Mini card do produto */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 p-3">
          {product?.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.cover_image_url}
              alt={product.name}
              className="w-16 h-16 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Package size={24} className="text-slate-300" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 text-sm truncate">{product?.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {variant.color_hex && (
                <span
                  className="w-2.5 h-2.5 rounded-full border border-slate-200 shrink-0"
                  style={{ backgroundColor: variant.color_hex }}
                />
              )}
              <p className="text-xs text-slate-500">
                {variant.color} · Tam. {variant.size}
              </p>
            </div>
            {priceFormatted ? (
              <p className="text-base font-black text-slate-900 mt-0.5">{priceFormatted}</p>
            ) : (
              <p className="text-xs text-amber-600 mt-0.5">Sem preço cadastrado</p>
            )}
          </div>
        </div>

        {/* Formulário de venda */}
        <ScanSaleForm
          variantId={variant.id}
          salePrice={price ?? 0}
          locations={locationsWithStock}
          stockMap={stockMap}
        />

      </div>
    </div>
  );
}
