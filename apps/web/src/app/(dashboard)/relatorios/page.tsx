import { supabaseAdmin } from "@/lib/supabase/service";
import { getTenantId } from "@/lib/auth";
import { formatCurrency, formatDate } from "@stoqlab/utils";

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
    const v = i.product_variants as { deleted_at: string | null; products: { deleted_at: string | null } | null } | null;
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
    const v = item.product_variants as { color: string; size: string; products: { name: string } | null } | null;
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
    const v = inv.product_variants as { products: { deleted_at: string | null; categories: { name: string } | null } | null } | null;
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Faturamento do mês", value: formatCurrency(revenueMonth), sub: revenueLastMonth > 0 ? `Mês anterior: ${formatCurrency(revenueLastMonth)}` : undefined, color: "text-emerald-600" },
          { label: "Faturamento total", value: formatCurrency(revenueTotal), color: "text-slate-900" },
          { label: "Margem média", value: `${avgMargin.toFixed(1)}%`, color: avgMargin >= 30 ? "text-emerald-600" : "text-amber-600" },
          { label: "Total em estoque", value: `${totalStock} peças`, color: "text-slate-900" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
            {kpi.sub && <p className="text-xs text-slate-400 mt-0.5">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas por mês */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Faturamento — últimos 6 meses</h2>
          <div className="space-y-2">
            {[...monthMap.entries()].map(([key, data]) => {
              const [year, month] = key.split("-");
              const bar = maxRevenue > 0 ? (data.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={key} className="flex items-center gap-3 text-sm">
                  <span className="w-8 text-slate-500 text-xs">{MONTH_NAMES[Number(month) - 1]}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${bar}%` }} />
                  </div>
                  <span className="w-24 text-right font-medium text-slate-700">{formatCurrency(data.revenue)}</span>
                  <span className="w-10 text-right text-slate-400 text-xs">{data.count}v</span>
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
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3 text-sm">
                  <span className="w-5 text-xs text-slate-400 font-mono">{i + 1}</span>
                  <span className="flex-1 font-medium text-slate-900 truncate">{p.name}</span>
                  <span className="text-slate-500">{p.qty} un.</span>
                  <span className="w-24 text-right font-medium text-slate-700">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
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
          <div className="space-y-3 text-sm">
            {[
              { label: "Total faturado (vendas)", value: formatCurrency(revenueTotal), color: "text-emerald-600" },
              { label: "Total investido (compras)", value: formatCurrency(totalPurchases), color: "text-red-500" },
              { label: "Resultado bruto", value: formatCurrency(revenueTotal - totalPurchases), color: revenueTotal >= totalPurchases ? "text-emerald-600" : "text-red-500" },
              { label: "Margem média geral", value: `${avgMargin.toFixed(1)}%`, color: "text-slate-900" },
              { label: "Vendas realizadas", value: `${sales.length}`, color: "text-slate-900" },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-slate-600">{row.label}</span>
                <span className={`font-semibold ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
