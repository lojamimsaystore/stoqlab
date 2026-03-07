import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { updateSupplierAction } from "../../actions";
import { SupplierForm } from "../../supplier-form";

export default async function EditarFornecedorPage({
  params,
}: {
  params: { id: string };
}) {
  const tenantId = await getTenantId();

  const { data: supplier } = await supabaseAdmin
    .from("suppliers")
    .select("id, name, cnpj, phone, email, address, notes")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .single();

  if (!supplier) notFound();

  const action = updateSupplierAction.bind(null, supplier.id);

  return (
    <div className="space-y-6 max-w-2xl">
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/fornecedores" className="hover:text-slate-700">Fornecedores</Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">{supplier.name}</span>
      </nav>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Editar fornecedor</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <SupplierForm
          action={action}
          defaultValues={supplier}
          submitLabel="Salvar alterações"
        />
      </div>
    </div>
  );
}
