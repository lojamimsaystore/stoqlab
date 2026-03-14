import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
      <Link href="/fornecedores" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} />
        Voltar
      </Link>

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
