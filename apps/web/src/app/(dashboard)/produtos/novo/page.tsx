import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
      <Link href="/produtos" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} />
        Voltar
      </Link>

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
