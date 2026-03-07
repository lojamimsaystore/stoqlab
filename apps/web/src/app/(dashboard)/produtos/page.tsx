import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { DeleteProductButton } from "./components/delete-product-button";

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

export default async function ProdutosPage() {
  const tenantId = await getTenantId();

  const { data: products } = await supabaseAdmin
    .from("products")
    .select(`
      id, name, brand, status, created_at,
      categories(name),
      product_variants(count)
    `)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Produtos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {products?.length ?? 0} produto{(products?.length ?? 0) !== 1 ? "s" : ""} cadastrado{(products?.length ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/produtos/novo"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
        >
          <Plus size={16} />
          Novo produto
        </Link>
      </div>

      {/* Lista */}
      {!products?.length ? (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-16 text-center">
          <Package size={40} className="text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">Nenhum produto cadastrado</p>
          <p className="text-slate-400 text-sm mt-1">
            Comece adicionando seu primeiro produto
          </p>
          <Link
            href="/produtos/novo"
            className="mt-4 flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Novo produto
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left">
                <th className="px-4 py-3 font-medium text-slate-600">Produto</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">Categoria</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Variações</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => {
                const variantCount =
                  (p.product_variants as unknown as { count: number }[])?.[0]
                    ?.count ?? 0;
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{p.name}</p>
                      {p.brand && (
                        <p className="text-xs text-slate-400">{p.brand}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-500">
                      {(p.categories as { name: string } | null)?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                      {variantCount} variação{variantCount !== 1 ? "ões" : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[p.status] ?? ""}`}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/produtos/${p.id}/variacoes`}
                          className="text-xs text-blue-600 hover:underline font-medium"
                        >
                          Variações
                        </Link>
                        <Link
                          href={`/produtos/${p.id}`}
                          className="text-xs text-slate-600 hover:underline font-medium"
                        >
                          Editar
                        </Link>
                        <DeleteProductButton id={p.id} name={p.name} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
