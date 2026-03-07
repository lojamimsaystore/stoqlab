import { createClient } from "@/lib/supabase/server";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatCurrency } from "@stoqlab/utils";

async function getDashboardData(tenantId: string) {
  const { supabaseAdmin } = await import("@/lib/supabase/service");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [vendasMes, vendasHoje, produtos, alertas, ultimasVendas] =
    await Promise.all([
      // Vendas do mês
      supabaseAdmin
        .from("sales")
        .select("total_value, gross_margin")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("sold_at", startOfMonth),

      // Vendas de hoje
      supabaseAdmin
        .from("sales")
        .select("total_value")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("sold_at", startOfToday),

      // Produtos ativos
      supabaseAdmin
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .is("deleted_at", null),

      // Alertas de estoque baixo não lidos
      supabaseAdmin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("type", "low_stock")
        .is("read_at", null),

      // Últimas 5 vendas
      supabaseAdmin
        .from("sales")
        .select("id, total_value, gross_margin, sold_at, payment_method")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .order("sold_at", { ascending: false })
        .limit(5),
    ]);

  const totalMes = (vendasMes.data ?? []).reduce(
    (sum, v) => sum + Number(v.total_value),
    0,
  );
  const margemMedia =
    (vendasMes.data ?? []).length > 0
      ? (vendasMes.data ?? []).reduce((sum, v) => sum + Number(v.gross_margin), 0) /
        (vendasMes.data ?? []).length
      : 0;
  const totalHoje = (vendasHoje.data ?? []).reduce(
    (sum, v) => sum + Number(v.total_value),
    0,
  );

  return {
    totalMes,
    margemMedia,
    totalHoje,
    qtdVendasMes: vendasMes.data?.length ?? 0,
    produtosAtivos: produtos.count ?? 0,
    alertasEstoque: alertas.count ?? 0,
    ultimasVendas: ultimasVendas.data ?? [],
  };
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  credit: "Crédito",
  debit: "Débito",
  pix: "PIX",
  installment: "Parcelado",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const tenantId = (user.user_metadata?.tenant_id as string | undefined) ??
    ((user as unknown as { app_metadata?: { tenant_id?: string } }).app_metadata?.tenant_id);

  // Busca tenant_id do JWT claims customizados
  const session = await supabase.auth.getSession();
  const jwt = session.data.session?.access_token;
  let resolvedTenantId = tenantId;

  if (!resolvedTenantId && jwt) {
    try {
      const payload = JSON.parse(atob(jwt.split(".")[1] ?? ""));
      resolvedTenantId = payload.tenant_id as string;
    } catch {
      // ignora
    }
  }

  const data = resolvedTenantId
    ? await getDashboardData(resolvedTenantId)
    : {
        totalMes: 0,
        margemMedia: 0,
        totalHoje: 0,
        qtdVendasMes: 0,
        produtosAtivos: 0,
        alertasEstoque: 0,
        ultimasVendas: [],
      };

  const kpis = [
    {
      label: "Vendas do mês",
      value: formatCurrency(data.totalMes),
      sub: `${data.qtdVendasMes} vendas`,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
      trend: data.totalMes > 0 ? "up" : null,
    },
    {
      label: "Vendas hoje",
      value: formatCurrency(data.totalHoje),
      sub: "Receita do dia",
      icon: ArrowUpRight,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      trend: data.totalHoje > 0 ? "up" : null,
    },
    {
      label: "Margem média",
      value: `${data.margemMedia.toFixed(1)}%`,
      sub: "No mês atual",
      icon: ArrowDownRight,
      color: "text-purple-600",
      bg: "bg-purple-50",
      trend: null,
    },
    {
      label: "Produtos ativos",
      value: data.produtosAtivos.toString(),
      sub: "No catálogo",
      icon: Package,
      color: "text-orange-600",
      bg: "bg-orange-50",
      trend: null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Alerta de estoque */}
      {data.alertasEstoque > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{data.alertasEstoque} produtos</strong> com estoque abaixo do mínimo.{" "}
            <a href="/estoque" className="underline font-medium">Ver estoque</a>
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-slate-200 p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {kpi.value}
                </p>
                <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
              </div>
              <div className={`p-2.5 rounded-lg ${kpi.bg}`}>
                <kpi.icon size={20} className={kpi.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Últimas vendas */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Últimas vendas</h2>
          <a
            href="/vendas"
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            Ver todas
          </a>
        </div>

        {data.ultimasVendas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingCart size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm font-medium">
              Nenhuma venda registrada ainda
            </p>
            <p className="text-slate-400 text-xs mt-1">
              As vendas aparecerão aqui assim que forem registradas
            </p>
            <a
              href="/vendas/nova"
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
            >
              Registrar venda
            </a>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.ultimasVendas.map((venda) => (
              <div
                key={venda.id}
                className="flex items-center justify-between px-5 py-3.5"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {PAYMENT_LABELS[venda.payment_method] ?? venda.payment_method}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(venda.sold_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatCurrency(Number(venda.total_value))}
                  </p>
                  <p className="text-xs text-emerald-600">
                    {Number(venda.gross_margin).toFixed(1)}% margem
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
