import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createCustomerAction } from "../actions";
import { CustomerForm } from "../customer-form";

export default function NovoClientePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} />
        Voltar
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Novo cliente</h1>
        <p className="text-sm text-slate-500 mt-1">Preencha os dados do cliente.</p>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <CustomerForm action={createCustomerAction} submitLabel="Cadastrar cliente" />
      </div>
    </div>
  );
}
