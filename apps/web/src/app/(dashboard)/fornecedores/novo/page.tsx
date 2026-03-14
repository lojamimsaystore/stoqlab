import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupplierAction } from "../actions";
import { SupplierForm } from "../supplier-form";

export default function NovoFornecedorPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/fornecedores" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft size={15} />
        Voltar
      </Link>

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
