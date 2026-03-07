import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { updateCustomerAction } from "../../actions";
import { CustomerForm } from "../../customer-form";

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const tenantId = await getTenantId();

  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id, name, phone, email, cpf, birthdate, address, notes")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .single();

  if (!customer) notFound();

  const action = updateCustomerAction.bind(null, customer.id);

  return (
    <div className="space-y-6 max-w-2xl">
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/clientes" className="hover:text-slate-700">Clientes</Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">{customer.name}</span>
      </nav>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Editar cliente</h1>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <CustomerForm action={action} defaultValues={customer} submitLabel="Salvar alterações" />
      </div>
    </div>
  );
}
