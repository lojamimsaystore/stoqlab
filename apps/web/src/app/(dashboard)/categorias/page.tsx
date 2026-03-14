import { FolderOpen } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { AddCategoryForm } from "./add-category-form";
import { CategoryRow } from "./category-row";

export default async function CategoriasPage() {
  const tenantId = await getTenantId();

  const [{ data: categories }, { data: products }] = await Promise.all([
    supabaseAdmin
      .from("categories")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("name"),
    supabaseAdmin
      .from("products")
      .select("category_id")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
  ]);

  const countMap: Record<string, number> = {};
  for (const p of products ?? []) {
    if (p.category_id) countMap[p.category_id] = (countMap[p.category_id] ?? 0) + 1;
  }

  const total = categories?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Categorias</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} categoria{total !== 1 ? "s" : ""} cadastrada{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Card único: formulário + lista */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

        {/* Formulário inline */}
        <div className="px-5 py-4 border-b border-slate-100">
          <AddCategoryForm />
        </div>

        {/* Estado vazio */}
        {!categories?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FolderOpen size={40} className="text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium">Nenhuma categoria cadastrada</p>
            <p className="text-slate-400 text-sm mt-1">
              Crie sua primeira categoria usando o campo acima
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-5 py-3 font-medium text-slate-600">Nome</th>
                <th className="px-5 py-3 font-medium text-slate-600">Produtos</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map((c) => (
                <CategoryRow
                  key={c.id}
                  id={c.id}
                  name={c.name}
                  productCount={countMap[c.id] ?? 0}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
