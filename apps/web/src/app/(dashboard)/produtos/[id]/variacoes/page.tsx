import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { VariantForm } from "./variant-form";
import { VariantTable } from "./variant-table";

export default async function VariacoesPage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = await getTenantId();

  const [{ data: product }, { data: variants }] = await Promise.all([
    supabaseAdmin
      .from("products")
      .select("id, name, brand")
      .eq("id", params.id)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .single(),
    supabaseAdmin
      .from("product_variants")
      .select("id, size, color, color_hex, sku, barcode, sale_price, min_stock")
      .eq("product_id", params.id)
      .eq("tenant_id", tenantId)
      .is("deleted_at", null)
      .order("created_at"),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-slate-500 flex-wrap">
        <Link href="/produtos" className="hover:text-slate-700">Produtos</Link>
        <ChevronRight size={14} />
        <Link href={`/produtos/${params.id}`} className="hover:text-slate-700">
          {product.name}
        </Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">Variações</span>
      </nav>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Variações — {product.name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Grade de tamanho × cor. Cada combinação vira uma variação com SKU único.
        </p>
      </div>

      {/* Tabela de variações existentes */}
      <VariantTable
        variants={variants ?? []}
        productId={params.id}
      />

      {/* Formulário para nova variação */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Adicionar variação</h2>
        <VariantForm productId={params.id} productName={product.name} />
      </div>
    </div>
  );
}
