import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createSupplierAction } from "../actions";
import { SupplierForm } from "../supplier-form";

export default function NovoFornecedorPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <nav className="flex items-center gap-1 text-sm text-slate-500">
        <Link href="/fornecedores" className="hover:text-slate-700">Fornecedores</Link>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-medium">Novo fornecedor</span>
      </nav>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Novo fornecedor</h1>
        <p className="text-sm text-slate-500 mt-1">Preencha os dados do fornecedor.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <SupplierForm action={createSupplierAction} submitLabel="Cadastrar fornecedor" />
      </div>
    </div>
  );
}
