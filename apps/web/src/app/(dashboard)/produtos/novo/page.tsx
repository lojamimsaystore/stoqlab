import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { createProductAction } from "../actions";
import { NewProductForm } from "./new-product-form";

export default async function NovoProdutoPage() {
  const tenantId = await getTenantId();

  const { data: categories } = await supabaseAdmin
    .from("categories")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="space-y-6 max-w-2xl">
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/produtos" className="hover:text-slate-700">Produtos</Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">Novo produto</span>
      </nav>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Novo produto</h1>
        <p className="text-sm text-slate-500 mt-1">
          Preencha os dados do produto. Você pode adicionar mais variações depois.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <NewProductForm action={createProductAction} categories={categories ?? []} />
      </div>
    </div>
  );
}
