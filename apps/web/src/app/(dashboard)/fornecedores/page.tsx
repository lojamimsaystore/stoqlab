import Link from "next/link";
import { Plus, Truck, Pencil, Phone, Mail } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/auth";
import { getUserActionPerms } from "@/lib/server-action-permissions";
import { DeleteSupplierButton } from "./delete-supplier-button";
import { SearchInput } from "@/components/ui/search-input";
import { Suspense } from "react";

export default async function FornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const tenantId = await getTenantId();
  const { q } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabaseAdmin.from("users").select("role").eq("id", user.id).single()
    : { data: null };
  const role = profile?.role ?? "seller";
  const perms = await getUserActionPerms(role, tenantId);
  const canGerenciar      = perms.has("fornecedor.gerenciar");
  const canVerDados       = perms.has("info.dados_fornecedor");

  let query = supabaseAdmin
    .from("suppliers")
    .select("id, name, cnpj, phone, email, notes, is_active")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("name");

  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,cnpj.ilike.%${q}%`);
  }

  const { data: suppliers } = await query;
  const total = suppliers?.length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Fornecedores</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total} fornecedor{total !== 1 ? "es" : ""}
            {q ? ` encontrado${total !== 1 ? "s" : ""} para "${q}"` : " cadastrado" + (total !== 1 ? "s" : "")}
          </p>
        </div>
        {canGerenciar && (
          <Link
            href="/fornecedores/novo"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            <Plus size={16} />
            Novo fornecedor
          </Link>
        )}
      </div>

      {/* Busca */}
      <Suspense>
        <SearchInput placeholder="Buscar por nome, e-mail, telefone ou CNPJ…" />
      </Suspense>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {!suppliers?.length ? (
          <div className="py-16 flex flex-col items-center gap-2 text-slate-400">
            <Truck size={36} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              {q ? `Nenhum fornecedor encontrado para "${q}"` : "Nenhum fornecedor cadastrado"}
            </p>
            {!q && (
              <Link href="/fornecedores/novo" className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1">
                Cadastrar primeiro fornecedor
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
                {canVerDados && <th className="px-4 py-3 font-medium text-slate-600 hidden md:table-cell">Contato</th>}
                {canVerDados && <th className="px-4 py-3 font-medium text-slate-600 hidden sm:table-cell">CNPJ</th>}
                {canGerenciar && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{s.name}</p>
                    {s.notes && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{s.notes}</p>
                    )}
                  </td>
                  {canVerDados && (
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="space-y-0.5">
                        {s.phone && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone size={12} />
                            <span>{s.phone}</span>
                          </div>
                        )}
                        {s.email && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Mail size={12} />
                            <span>{s.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                  {canVerDados && (
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-500 font-mono text-xs">
                      {s.cnpj ?? "—"}
                    </td>
                  )}
                  {canGerenciar && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/fornecedores/${s.id}/editar`}
                          aria-label="Editar fornecedor"
                          className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded"
                        >
                          <Pencil size={15} />
                        </Link>
                        <DeleteSupplierButton id={s.id} name={s.name} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
