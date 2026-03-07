import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createCustomerAction } from "../actions";
import { CustomerForm } from "../customer-form";

export default function NovoClientePage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/clientes" className="hover:text-slate-700">Clientes</Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">Novo cliente</span>
      </nav>
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
