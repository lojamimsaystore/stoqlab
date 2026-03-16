import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DebtForm } from "./debt-form";

export default function NovaDevedorPage() {
  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <Link
          href="/devedores"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={15} />
          Voltar
        </Link>
        <h1 className="text-xl font-semibold text-slate-900 mt-1">Nova dívida</h1>
        <p className="text-sm text-slate-500">Registre uma dívida de um cliente.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <DebtForm />
      </div>
    </div>
  );
}
