import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { formatCurrency } from "@stoqlab/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default async function RelatoriosPage() {
  const tenantId = await getTenantId();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  const [
    { data: salesAll },
    { data: saleItems },
    { data: inventory },
    { data: purchases },
  ] = await Promise.all([
    supabaseAdmin
      .from("sales")
      .select("id, total_value, total_cost, gross_margin, sold_at, status, payment_method")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .is("deleted_at", null)
      .order("sold_at", { ascending: false }),
    supabaseAdmin
      .from("sale_items")
      .select("quantity, final_price, sale_id, product_variants(color, size, products(name))")
      .in("sale_id",
        (await supabaseAdmin.from("sales").select("id")
          .eq("tenant_id", tenantId).eq("status", "completed").is("deleted_at", null))
          .data?.map((s) => s.id) ?? []
      ),
    supabaseAdmin
      .from("inventory")
      .select("quantity, product_variants(deleted_at, products(deleted_at, categories(name)))")
      .eq("tenant_id", tenantId),
    supabaseAdmin
      .from("purchases")
      .select("products_cost, freight_cost, other_costs, purchased_at")
      .eq("tenant_id", tenantId)
      .is("deleted_at", null),
  ]);

  const sales = salesAll ?? [];

  // KPIs do mês atual
  const salesThisMonth = sales.filter((s) => s.sold_at >= startOfMonth);
  const salesLastMonth = sales.filter((s) => s.sold_at >= startOfLastMonth && s.sold_at <= endOfLastMonth);

  const revenueMonth = salesThisMonth.reduce((s, v) => s + Number(v.total_value), 0);
  const revenueLastMonth = salesLastMonth.reduce((s, v) => s + Number(v.total_value), 0);
  const revenueTotal = sales.reduce((s, v) => s + Number(v.total_value), 0);
  const avgMargin = sales.length > 0
    ? sales.reduce((s, v) => s + Number(v.gross_margin ?? 0), 0) / sales.length
    : 0;

  // Filtra inventário órfão (variação ou produto deletado)
  const activeInventory = (inventory ?? []).filter((i) => {
    const v = i.product_variants as unknown as { deleted_at: string | null; products: { deleted_at: string | null } | null } | null;
    return !v?.deleted_at && !v?.products?.deleted_at;
  });

  const totalStock = activeInventory.reduce((s, i) => s + i.quantity, 0);
  const totalPurchases = (purchases ?? []).reduce((s, p) =>
    s + Number(p.products_cost) + Number(p.freight_cost) + Number(p.other_costs), 0);

  // Vendas por mês (últimos 6 meses)
  const monthMap = new Map<string, { revenue: number; count: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, { revenue: 0, count: 0 });
  }
  for (const s of sales) {
    const key = s.sold_at.slice(0, 7);
    if (monthMap.has(key)) {
      monthMap.get(key)!.revenue += Number(s.total_value);
      monthMap.get(key)!.count++;
    }
  }

  // Top 10 produtos mais vendidos
  const productSales = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const item of saleItems ?? []) {
    const v = item.product_variants as unknown as { color: string; size: string; products: { name: string } | null } | null;
    const name = v?.products?.name ?? "—";
    const key = name;
    const cur = productSales.get(key) ?? { name, qty: 0, revenue: 0 };
    cur.qty += item.quantity;
    cur.revenue += item.quantity * Number(item.final_price);
    productSales.set(key, cur);
  }
  const topProducts = [...productSales.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

  // Estoque por categoria (apenas ativos)
  const catStock = new Map<string, number>();
  for (const inv of activeInventory) {
    const v = inv.product_variants as unknown as { products: { deleted_at: string | null; categories: { name: string } | null } | null } | null;
    const cat = v?.products?.categories?.name ?? "Sem categoria";
    catStock.set(cat, (catStock.get(cat) ?? 0) + inv.quantity);
  }
  const stockByCategory = [...catStock.entries()].sort((a, b) => b[1] - a[1]);

  const MONTH_NAMES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const maxRevenue = Math.max(...[...monthMap.values()].map((m) => m.revenue), 1);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Relatórios</h1>
        <p className="text-sm text-slate-500 mt-1">Visão geral do desempenho da loja.</p>
      </div>

      {/* KPIs */}
      {(() => {
        const variacao = revenueLastMonth > 0 ? ((revenueMonth - revenueLastMonth) / revenueLastMonth) * 100 : null;
        const variacaoPositiva = variacao !== null && variacao > 0;
        const variacaoNegativa = variacao !== null && variacao < 0;
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Faturamento do mês */}
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Faturamento do mês</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1 tabular-nums">{formatCurrency(revenueMonth)}</p>
              {variacao !== null ? (
                <div className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${variacaoPositiva ? "text-emerald-600" : variacaoNegativa ? "text-red-500" : "text-slate-400"}`}>
                  {variacaoPositiva ? <TrendingUp size={12} /> : variacaoNegativa ? <TrendingDown size={12} /> : <Minus size={12} />}
                  <span>{Math.abs(variacao).toFixed(1)}% vs mês anterior</span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-1.5">Sem dados do mês anterior</p>
              )}
            </div>
            {/* Faturamento total */}
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Faturamento total</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{formatCurrency(revenueTotal)}</p>
              <p className="text-xs text-slate-400 mt-1.5">{sales.length} vendas realizadas</p>
            </div>
            {/* Margem média */}
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Margem média</p>
              <p className={`text-2xl font-bold mt-1 tabular-nums ${avgMargin >= 30 ? "text-emerald-600" : avgMargin >= 15 ? "text-amber-600" : "text-red-500"}`}>{avgMargin.toFixed(1)}%</p>
              <p className="text-xs text-slate-400 mt-1.5">{avgMargin >= 30 ? "Margem saudável" : avgMargin >= 15 ? "Margem aceitável" : "Margem baixa"}</p>
            </div>
            {/* Total em estoque */}
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Total em estoque</p>
              <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{totalStock}</p>
              <p className="text-xs text-slate-400 mt-1.5">peças disponíveis</p>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas por mês */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Faturamento — últimos 6 meses</h2>
          <div className="space-y-3">
            {[...monthMap.entries()].map(([key, data]) => {
              const [, month] = key.split("-");
              const isCurrentMonth = key === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
              const bar = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium ${isCurrentMonth ? "text-emerald-600" : "text-slate-500"}`}>
                      {MONTH_NAMES[Number(month) - 1]}{isCurrentMonth ? " (atual)" : ""}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400">{data.count} venda{data.count !== 1 ? "s" : ""}</span>
                      <span className="text-sm font-semibold text-slate-800">{formatCurrency(data.revenue)}</span>
                    </div>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isCurrentMonth ? "bg-emerald-500" : "bg-slate-400"}`}
                      style={{ width: `${bar}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top produtos */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Produtos mais vendidos</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma venda registrada</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const maxQty = Math.max(...topProducts.map((p) => p.qty), 1);
                return topProducts.map((p, i) => (
                  <div key={p.name}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${i === 0 ? "bg-amber-400 text-white" : i === 1 ? "bg-slate-300 text-white" : i === 2 ? "bg-orange-400 text-white" : "bg-slate-100 text-slate-500"}`}>{i + 1}</span>
                      <span className="flex-1 text-sm font-medium text-slate-900 truncate">{p.name}</span>
                      <span className="text-xs text-slate-500 shrink-0">{p.qty} un.</span>
                      <span className="text-sm font-semibold text-slate-700 w-24 text-right shrink-0">{formatCurrency(p.revenue)}</span>
                    </div>
                    <div className="ml-7 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* Estoque por categoria */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Estoque por categoria</h2>
          {stockByCategory.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhum estoque</p>
          ) : (
            <div className="space-y-2">
              {stockByCategory.map(([cat, qty]) => {
                const bar = (qty / totalStock) * 100;
                return (
                  <div key={cat} className="flex items-center gap-3 text-sm">
                    <span className="flex-1 text-slate-700 truncate">{cat}</span>
                    <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${bar}%` }} />
                    </div>
                    <span className="w-16 text-right font-medium text-slate-700">{qty} peças</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resumo financeiro */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Resumo financeiro</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Total faturado</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(revenueTotal)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Total investido (compras)</span>
              <span className="font-semibold text-red-500">{formatCurrency(totalPurchases)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100 bg-slate-50 rounded-lg px-2">
              <span className="font-medium text-slate-800">Resultado bruto</span>
              <span className={`font-bold text-base ${revenueTotal >= totalPurchases ? "text-emerald-600" : "text-red-500"}`}>
                {formatCurrency(revenueTotal - totalPurchases)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-600">Margem média</span>
              <span className={`font-semibold ${avgMargin >= 30 ? "text-emerald-600" : avgMargin >= 15 ? "text-amber-600" : "text-red-500"}`}>{avgMargin.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-600">Vendas realizadas</span>
              <span className="font-semibold text-slate-900">{sales.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
