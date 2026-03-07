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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Categorias</h1>
        <p className="text-sm text-slate-500 mt-1">
          Organize seus produtos por categoria.
        </p>
      </div>

      {/* Formulário de nova categoria */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Nova categoria</h2>
        <AddCategoryForm />
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">
            {categories?.length ?? 0} categoria(s)
          </h2>
        </div>

        {!categories?.length ? (
          <div className="py-12 flex flex-col items-center gap-2 text-slate-400">
            <FolderOpen size={32} className="text-slate-300" />
            <p className="text-sm">Nenhuma categoria cadastrada</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="px-4 py-3 font-medium text-slate-600">Produtos</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
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
