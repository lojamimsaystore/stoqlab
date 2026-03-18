import Link from "next/link";
import { Plus, ShoppingBag } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { formatCurrency } from "@stoqlab/utils";
import { SearchInput } from "@/components/ui/search-input";
import { StatusFilter } from "./status-filter";
import { SalesTable } from "./sales-table";
import { Suspense } from "react";


export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const tenantId = await getTenantId();
  const { q, status } = await searchParams;

  let query = supabaseAdmin
    .from("sales")
    .select("id, status, payment_method, channel, total_value, discount_value, gross_margin, sold_at, notes, customers(name), locations(name)")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("sold_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (q) {
    query = query.or(`payment_method.ilike.%${q}%,customers.name.ilike.%${q}%`);
  }

  const { data: sales } = await query;
  const filtered = sales ?? [];

  const now = new Date();
  const totalMes = (sales ?? [])
    .filter((s) => {
      const d = new Date(s.sold_at);
      return s.status === "completed" && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, s) => sum + Number(s.total_value), 0);

  const totalConcluidas = (sales ?? []).filter((s) => s.status === "completed").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Vendas</h1>
          <p className="text-sm text-slate-500 mt-0.5">Histórico de vendas realizadas.</p>
        </div>
        <Link
          href="/vendas/nova"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={16} />
          Nova venda
        </Link>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Vendas no mês</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalMes)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Concluídas</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{totalConcluidas}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Suspense fallback={null}>
          <SearchInput placeholder="Buscar por cliente ou método de pagamento…" className="flex-1" />
        </Suspense>
        <Suspense fallback={null}>
          <StatusFilter />
        </Suspense>
      </div>

      {!filtered.length ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 flex flex-col items-center gap-2 text-slate-400">
          <ShoppingBag size={36} className="text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            {q || status ? "Nenhuma venda encontrada com esses filtros" : "Nenhuma venda registrada"}
          </p>
          {!q && !status && (
            <Link href="/vendas/nova" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-1">
              Registrar primeira venda
            </Link>
          )}
        </div>
      ) : (
        <SalesTable sales={filtered as Parameters<typeof SalesTable>[0]["sales"]} />
      )}
    </div>
  );
}
