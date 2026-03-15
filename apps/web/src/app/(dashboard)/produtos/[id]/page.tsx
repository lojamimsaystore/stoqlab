import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { formatCurrency } from "@stoqlab/utils";
import { AddVariantSection } from "./add-variant-section";
import { DeleteVariantButton } from "./delete-variant-button";


const STATUS_LABEL: Record<string, string> = {
  active: "Ativo", draft: "Rascunho", archived: "Arquivado",
};
const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  archived: "bg-red-100 text-red-600",
};

export default async function ProdutoPage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = await getTenantId();

  const [{ data: product }, { data: variants }] =
    await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, name, brand, description, status, category_id, cover_image_url, categories(name)")
        .eq("id", params.id)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .single(),
      supabaseAdmin
        .from("product_variants")
        .select(`
          id, size, color, sku, sale_price, min_stock,
          inventory(quantity, location_id, locations(name))
        `)
        .eq("product_id", params.id)
        .eq("tenant_id", tenantId)
        .is("deleted_at", null)
        .order("created_at"),
    ]);

  if (!product) notFound();

  const totalQty = (variants ?? []).reduce((sum, v) => {
    const inv = v.inventory as unknown as { quantity: number }[];
    return sum + (inv?.[0]?.quantity ?? 0);
  }, 0);

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/produtos" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} />
        Voltar
      </Link>

      {/* Header do produto */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex gap-5 p-5">
          {/* Foto */}
          <div className="w-24 h-24 rounded-lg bg-slate-100 shrink-0 overflow-hidden">
            {product.cover_image_url ? (
              <img
                src={product.cover_image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package size={28} className="text-slate-300" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{product.name}</h1>
                {product.brand && (
                  <p className="text-sm text-slate-500">{product.brand}</p>
                )}
              </div>
              <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[product.status] ?? ""}`}>
                {STATUS_LABEL[product.status]}
              </span>
            </div>
            {product.description && (
              <p className="text-sm text-slate-500 mt-1">{product.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              {(product.categories as { name: string } | null)?.name && (
                <span>📂 {(product.categories as { name: string }).name}</span>
              )}
              <span>🧺 {totalQty} em estoque</span>
              <span>{variants?.length ?? 0} variação(ões)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Variações */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Variações (cor × tamanho)</h2>
        </div>

        {!variants?.length ? (
          <div className="py-10 text-center">
            <p className="text-slate-400 text-sm">Nenhuma variação cadastrada</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Cor / Tamanho</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">SKU</th>
                <th className="px-4 py-3 font-medium text-slate-600">Preço</th>
                <th className="px-4 py-3 font-medium text-slate-600">Qtd.</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {variants.map((v) => {
                const inv = v.inventory as unknown as { quantity: number }[];
                const qty = inv?.[0]?.quantity ?? 0;
                return (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">{v.color}</span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-slate-600">{v.size}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-500 font-mono text-xs">
                      {v.sku}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {v.sale_price ? formatCurrency(Number(v.sale_price)) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${qty === 0 ? "text-red-500" : "text-slate-900"}`}>
                        {qty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeleteVariantButton id={v.id} productId={params.id} label={`${v.color} ${v.size}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Adicionar variação */}
      <AddVariantSection productId={params.id} productName={product.name} />
    </div>
  );
}
