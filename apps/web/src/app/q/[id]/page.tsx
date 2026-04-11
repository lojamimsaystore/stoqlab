import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/service";
import Link from "next/link";
import { ShoppingCart, Package } from "lucide-react";

export default async function ScanPage({
  params,
}: {
  params: { id: string };
}) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/q/${params.id}`);

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.tenant_id) redirect("/login");

  // ── Busca variação + produto ────────────────────────────────────────────
  const { data: variant } = await supabaseAdmin
    .from("product_variants")
    .select("id, sku, color, color_hex, size, sale_price, products(name, brand, cover_image_url)")
    .eq("id", params.id)
    .eq("tenant_id", profile.tenant_id)
    .is("deleted_at", null)
    .single();

  if (!variant) notFound();

  const product = variant.products as unknown as {
    name: string;
    brand: string | null;
    cover_image_url: string | null;
  } | null;

  const price = variant.sale_price ? Number(variant.sale_price) : null;
  const priceFormatted = price !== null
    ? price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;

  return (
    <div className="min-h-screen bg-slate-100 flex items-start justify-center p-4 pt-10">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">

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

        {/* Informações */}
        <div className="p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              {product?.name ?? "Produto"}
            </h1>
            {product?.brand && (
              <p className="text-sm text-slate-400 mt-0.5">{product.brand}</p>
            )}
          </div>

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
              Preço não cadastrado — cadastre antes de vender
            </div>
          )}

          <p className="text-[11px] font-mono text-slate-400">{variant.sku}</p>
        </div>

        {/* Botão */}
        <div className="px-6 pb-8">
          <Link
            href={`/vendas/nova?variantId=${variant.id}`}
            className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-xl text-lg transition-all"
          >
            <ShoppingCart size={22} />
            Vender produto
          </Link>
        </div>

      </div>
    </div>
  );
}
