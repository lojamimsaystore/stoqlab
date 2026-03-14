import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { DeleteProductButton } from "./components/delete-product-button";
import { SearchInput } from "@/components/ui/search-input";
import { ProductStatusFilter } from "./components/product-status-filter";
import { Suspense } from "react";

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo",
  draft: "Rascunho",
  archived: "Arquivado",
};
const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  archived: "bg-red-100 text-red-600",
};

const COLOR_HEX: Record<string, string> = {
  "PRETO": "#111111", "BRANCO": "#FFFFFF", "CINZA": "#9E9E9E",
  "CINZA CLARO": "#D9D9D9", "AZUL MARINHO": "#1A237E", "AZUL ROYAL": "#2962FF",
  "AZUL BEBÊ": "#90CAF9", "VERDE": "#2E7D32", "VERDE MILITAR": "#4B5320",
  "AMARELO": "#FDD835", "LARANJA": "#EF6C00", "VERMELHO": "#C62828",
  "ROSA": "#E91E8C", "ROSA CLARO": "#F8BBD0", "ROXO": "#6A1B9A",
  "LILÁS": "#CE93D8", "VINHO": "#6D0000", "BORDÔ": "#880E4F",
  "BEGE": "#F5F0E8", "NUDE": "#E8C9A0", "CARAMELO": "#C68642",
  "MARROM": "#5D3A1A", "OFF WHITE": "#FAF9F6", "DOURADO": "#C9A84C",
  "PRATA": "#BDBDBD",
};

function resolveColorHex(colorHex: string | null, colorName: string): string {
  if (colorHex) return colorHex;
  return COLOR_HEX[colorName?.toUpperCase()?.trim()] ?? "#94a3b8";
}

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const tenantId = await getTenantId();
  const { q, status } = await searchParams;

  let query = supabaseAdmin
    .from("products")
    .select(`
      id, name, brand, status, cover_image_url,
      categories(name),
      product_variants(id, color, color_hex)
    `)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data: products } = await query;
  const total = products?.length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Produtos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} produto{total !== 1 ? "s" : ""}
            {q ? ` encontrado${total !== 1 ? "s" : ""} para "${q}"` : ""}
          </p>
        </div>
        <Link
          href="/compras/nova"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={16} />
          Nova entrada
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Suspense fallback={null}>
          <SearchInput placeholder="Buscar produto por nome…" className="flex-1" />
        </Suspense>
        <Suspense fallback={null}>
          <ProductStatusFilter />
        </Suspense>
      </div>

      {!products?.length ? (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-16 text-center">
          <Package size={40} className="text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">
            {q || status ? "Nenhum produto encontrado com esses filtros" : "Nenhum produto cadastrado"}
          </p>
          {!q && !status && (
            <p className="text-slate-400 text-sm mt-1">
              Cadastre produtos ao registrar uma compra — clique em{" "}
              <span className="font-medium text-slate-500">Nova entrada</span>
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-3">
          {products.map((p) => {
            const variants = (p.product_variants as { id: string; color: string; color_hex: string | null }[]) ?? [];
            const category = (p.categories as unknown as Array<{ name: string }> | null)?.[0]?.name;

            const uniqueColors = variants.filter(
              (v, i, arr) => arr.findIndex((x) => x.color === v.color) === i
            );

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all flex flex-col group relative"
              >
                {/* Lixeira */}
                <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-sm">
                    <DeleteProductButton id={p.id} name={p.name} />
                  </div>
                </div>

                {/* Área clicável → variações */}
                <Link href={`/produtos/${p.id}/variacoes`} className="flex-1 flex flex-col">
                  {/* Imagem */}
                  <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden">
                    {p.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.cover_image_url}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={28} className="text-slate-300" />
                      </div>
                    )}
                    {/* Badge de status */}
                    <span className={`absolute top-2 left-2 text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLOR[p.status] ?? ""}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="p-2.5 flex-1 flex flex-col gap-1">
                    <p className="font-semibold text-slate-900 text-xs leading-snug line-clamp-2">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {category ?? "Sem categoria"}
                    </p>

                    {/* Bolinhas de cor */}
                    {uniqueColors.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {uniqueColors.slice(0, 6).map((v) => (
                          <span
                            key={v.id}
                            title={v.color}
                            className="w-3 h-3 rounded-full border border-slate-200 shrink-0"
                            style={{ backgroundColor: resolveColorHex(v.color_hex, v.color) }}
                          />
                        ))}
                        {uniqueColors.length > 6 && (
                          <span className="text-[9px] text-slate-400 font-medium">+{uniqueColors.length - 6}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

