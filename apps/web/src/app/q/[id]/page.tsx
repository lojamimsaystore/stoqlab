import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { ScanSaleForm } from "./vender/scan-sale-form";
import { Package, MapPin, ShoppingCart, LogIn } from "lucide-react";
import Link from "next/link";

const SALE_ROLES = ["owner", "manager", "seller"];

export default async function ScanPage({
  params,
}: {
  params: { id: string };
}) {
  // ── Busca variação + produto (página pública) ────────────────
  const { data: variant } = await supabaseAdmin
    .from("product_variants")
    .select("id, sku, color, color_hex, size, sale_price, tenant_id, product_id, products(name, cover_image_url, description)")
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (!variant) notFound();

  const product = variant.products as unknown as {
    name: string;
    cover_image_url: string | null;
    description: string | null;
  } | null;

  // ── Estoque por localização ──────────────────────────────────
  const [{ data: invRows }, { data: locationRows }] = await Promise.all([
    supabaseAdmin
      .from("inventory")
      .select("quantity, location_id")
      .eq("variant_id", variant.id)
      .gt("quantity", 0),
    supabaseAdmin
      .from("locations")
      .select("id, name, type")
      .eq("tenant_id", variant.tenant_id)
      .is("deleted_at", null)
      .order("name"),
  ]);

  const stockMap: Record<string, number> = {};
  for (const row of invRows ?? []) {
    stockMap[row.location_id] = row.quantity;
  }

  const locationsWithStock = (locationRows ?? [])
    .map((l) => ({ ...l, quantity: stockMap[l.id] ?? 0 }))
    .filter((l) => l.quantity > 0);

  const totalStock = locationsWithStock.reduce((s, l) => s + l.quantity, 0);

  // ── Outras variações do mesmo produto ───────────────────────
  const { data: otherVariants } = await supabaseAdmin
    .from("product_variants")
    .select("id, color, color_hex, size, sale_price")
    .eq("product_id", variant.product_id)
    .eq("tenant_id", variant.tenant_id)
    .is("deleted_at", null)
    .neq("id", variant.id)
    .order("size")
    .order("color");

  // ── Auth opcional — exibe form de venda se logado ────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let canSell = false;
  if (user) {
    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", variant.tenant_id)
      .single();
    canSell = !!profile && SALE_ROLES.includes(profile.role);
  }

  const price = variant.sale_price ? Number(variant.sale_price) : null;
  const priceFormatted = price !== null
    ? price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;

  return (
    <div className="min-h-screen bg-slate-100 flex items-start justify-center p-4 pt-8 pb-12">
      <div className="w-full max-w-sm space-y-3">

        {/* Card principal do produto */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* Foto */}
          {product?.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.cover_image_url}
              alt={product.name}
              className="w-full h-64 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-slate-100 flex items-center justify-center">
              <Package size={52} className="text-slate-300" />
            </div>
          )}

          <div className="p-5 space-y-4">
            {/* Nome */}
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {product?.name ?? "Produto"}
            </h1>

            {/* Cor + Tamanho */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-sm font-medium text-slate-700">
                {variant.color_hex && (
                  <span
                    className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                    style={{ backgroundColor: variant.color_hex }}
                  />
                )}
                {variant.color}
              </span>
              <span className="inline-flex items-center px-3 py-1.5 bg-slate-100 rounded-full text-sm font-medium text-slate-700">
                Tam. {variant.size}
              </span>
            </div>

            {/* Preço */}
            {priceFormatted ? (
              <p className="text-3xl font-black text-slate-900">{priceFormatted}</p>
            ) : (
              <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Preço não cadastrado
              </div>
            )}

            {/* Descrição */}
            {product?.description && (
              <p className="text-sm text-slate-500 leading-relaxed">
                {product.description}
              </p>
            )}

            {/* SKU */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">SKU</span>
              <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                {variant.sku}
              </span>
            </div>
          </div>
        </div>

        {/* Estoque — detalhado apenas para membros autenticados do tenant */}
        {canSell ? (
          locationsWithStock.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Estoque disponível · {totalStock} {totalStock === 1 ? "peça" : "peças"}
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {locationsWithStock.map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700">{loc.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">
                      {loc.quantity} {loc.quantity === 1 ? "peça" : "peças"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
              <p className="text-sm text-red-600 font-medium text-center">Sem estoque disponível</p>
            </div>
          )
        ) : (
          <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center justify-between">
            <span className="text-sm text-slate-600">Disponibilidade</span>
            <span className={`text-sm font-bold ${totalStock > 0 ? "text-emerald-600" : "text-red-500"}`}>
              {totalStock > 0 ? "Disponível" : "Indisponível"}
            </span>
          </div>
        )}

        {/* Outras variações */}
        {(otherVariants ?? []).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Outras variações
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {(otherVariants ?? []).map((v) => {
                const vPrice = v.sale_price ? Number(v.sale_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
                return (
                  <Link
                    key={v.id}
                    href={`/q/${v.id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {v.color_hex && (
                        <span
                          className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                          style={{ backgroundColor: v.color_hex }}
                        />
                      )}
                      <span className="text-sm text-slate-700">{v.color} · Tam. {v.size}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{vPrice ?? "—"}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Venda rápida */}
        {canSell ? (
          <ScanSaleForm
            variantId={variant.id}
            salePrice={price ?? 0}
            locations={locationsWithStock}
            stockMap={stockMap}
          />
        ) : (
          <Link
            href={`/login?next=/q/${variant.id}`}
            className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-2xl text-base transition-all shadow-sm"
          >
            {user ? (
              <>
                <ShoppingCart size={20} />
                Sem permissão para vender
              </>
            ) : (
              <>
                <LogIn size={20} />
                Entrar para vender
              </>
            )}
          </Link>
        )}

      </div>
    </div>
  );
}
