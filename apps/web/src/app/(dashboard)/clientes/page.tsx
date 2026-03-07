import Link from "next/link";
import { Plus, Users, Pencil, Phone, Mail } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { DeleteCustomerButton } from "./delete-customer-button";

export default async function ClientesPage() {
  const tenantId = await getTenantId();

  const { data: customers } = await supabaseAdmin
    .from("customers")
    .select("id, name, phone, email, cpf, notes")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500 mt-1">Cadastro e histórico de clientes.</p>
        </div>
        <Link href="/clientes/novo"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus size={16} />
          Novo cliente
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {!customers?.length ? (
          <div className="py-16 flex flex-col items-center gap-2 text-slate-400">
            <Users size={36} className="text-slate-300" />
            <p className="text-sm">Nenhum cliente cadastrado</p>
            <Link href="/clientes/novo" className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1">
              Cadastrar primeiro cliente
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Contato</th>
                <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">CPF</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{c.name}</p>
                    {c.notes && <p className="text-xs text-slate-400 truncate max-w-[180px]">{c.notes}</p>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="space-y-0.5">
                      {c.phone && <div className="flex items-center gap-1.5 text-slate-500"><Phone size={12} />{c.phone}</div>}
                      {c.email && <div className="flex items-center gap-1.5 text-slate-500"><Mail size={12} />{c.email}</div>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-500 font-mono text-xs">{c.cpf ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link href={`/clientes/${c.id}/editar`} className="text-slate-400 hover:text-blue-600 transition-colors">
                        <Pencil size={16} />
                      </Link>
                      <DeleteCustomerButton id={c.id} name={c.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
