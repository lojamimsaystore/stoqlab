import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  Tag,
  Activity,
  BarChart2,
} from "lucide-react";
import { formatCurrency } from "@stoqlab/utils";

async function getDashboardData(tenantId: string) {
  const { supabaseAdmin } = await import("@/lib/supabase/service");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [vendasMes, vendasMesPassado, vendasHoje, produtos, alertas, ultimasVendas] =
    await Promise.all([
      supabaseAdmin
        .from("sales")
        .select("total_value, gross_margin")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("sold_at", startOfMonth),

      supabaseAdmin
        .from("sales")
        .select("total_value")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("sold_at", startOfLastMonth)
        .lte("sold_at", endOfLastMonth),

      supabaseAdmin
        .from("sales")
        .select("total_value")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("sold_at", startOfToday),

      supabaseAdmin
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("status", "active")
        .is("deleted_at", null),

      supabaseAdmin
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("type", "low_stock")
        .is("read_at", null),

      supabaseAdmin
        .from("sales")
        .select("id, total_value, gross_margin, sold_at, payment_method, channel, customers(name)")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .order("sold_at", { ascending: false })
        .limit(10),
    ]);

  const totalMes = (vendasMes.data ?? []).reduce((sum, v) => sum + Number(v.total_value), 0);
  const totalMesPassado = (vendasMesPassado.data ?? []).reduce((sum, v) => sum + Number(v.total_value), 0);
  const variacaoMes = totalMesPassado > 0
    ? ((totalMes - totalMesPassado) / totalMesPassado) * 100
    : null;

  const margemMedia =
    (vendasMes.data ?? []).length > 0
      ? (vendasMes.data ?? []).reduce((sum, v) => sum + Number(v.gross_margin), 0) /
        (vendasMes.data ?? []).length
      : 0;
  const totalHoje = (vendasHoje.data ?? []).reduce((sum, v) => sum + Number(v.total_value), 0);

  return {
    totalMes,
    totalMesPassado,
    variacaoMes,
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
        totalMesPassado: 0,
        variacaoMes: null,
        margemMedia: 0,
        totalHoje: 0,
        qtdVendasMes: 0,
        produtosAtivos: 0,
        alertasEstoque: 0,
        ultimasVendas: [],
      };

  return (
    <div className="space-y-6">
      {/* Alerta de estoque baixo */}
      {data.alertasEstoque > 0 && (
        <Link
          href="/estoque"
          className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 hover:bg-amber-100 transition-colors"
        >
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            <strong>{data.alertasEstoque} produto{data.alertasEstoque !== 1 ? "s" : ""}</strong>{" "}
            com estoque abaixo do mínimo.{" "}
            <span className="underline font-medium">Ver estoque →</span>
          </p>
        </Link>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Vendas do mês */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 col-span-2 sm:col-span-1">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Vendas do mês</p>
              <p className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                {formatCurrency(data.totalMes)}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                {data.variacaoMes !== null ? (
                  <>
                    {data.variacaoMes >= 0 ? (
                      <ArrowUpRight size={14} className="text-emerald-500 shrink-0" />
                    ) : (
                      <TrendingDown size={14} className="text-red-400 shrink-0" />
                    )}
                    <span className={`text-xs font-medium ${data.variacaoMes >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {Math.abs(data.variacaoMes).toFixed(1)}% vs mês anterior
                    </span>
                  </>
                ) : null}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{data.qtdVendasMes} venda{data.qtdVendasMes !== 1 ? "s" : ""} no mês</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 shrink-0 ml-3">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
          </div>
        </div>

        {/* Vendas hoje */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Hoje</p>
              <p className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                {formatCurrency(data.totalHoje)}
              </p>
              <p className="text-xs text-slate-400 mt-1.5">Receita do dia</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 shrink-0 ml-3">
              <Activity size={20} className="text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Margem média */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Margem média</p>
              <p className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                {data.margemMedia.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-400 mt-1.5">No mês atual</p>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 shrink-0 ml-3">
              <Tag size={20} className="text-purple-600" />
            </div>
          </div>
        </div>

        {/* Produtos ativos */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Produtos</p>
              <p className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                {data.produtosAtivos}
              </p>
              <p className="text-xs text-slate-400 mt-1.5">Ativos no catálogo</p>
            </div>
            <div className="p-2.5 rounded-xl bg-orange-50 shrink-0 ml-3">
              <Package size={20} className="text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Últimas vendas */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Últimas vendas</h2>
          <Link
            href="/vendas"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Ver todas →
          </Link>
        </div>

        {data.ultimasVendas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ShoppingCart size={32} className="text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm font-medium">Nenhuma venda registrada ainda</p>
            <p className="text-slate-400 text-xs mt-1">
              As vendas aparecerão aqui assim que forem registradas
            </p>
            <Link
              href="/vendas/nova"
              className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Registrar primeira venda →
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.ultimasVendas.map((venda) => {
              const margin = Number(venda.gross_margin);
              const customer = (venda.customers as unknown as Array<{ name: string }> | null)?.[0] ?? null;
              return (
                <Link
                  key={venda.id}
                  href={`/vendas/${venda.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <ShoppingCart size={14} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {customer?.name ?? PAYMENT_LABELS[venda.payment_method] ?? venda.payment_method}
                      </p>
                      <p className="text-xs text-slate-400">
                        {PAYMENT_LABELS[venda.payment_method] ?? venda.payment_method}
                        {" · "}
                        {new Date(venda.sold_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">
                      {formatCurrency(Number(venda.total_value))}
                    </p>
                    <p className={`text-xs font-medium ${margin >= 30 ? "text-emerald-600" : margin >= 15 ? "text-amber-600" : "text-red-500"}`}>
                      {margin.toFixed(1)}% margem
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Atalhos rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: "/compras/nova", label: "Nova compra", icon: ShoppingCart, color: "text-blue-600 bg-blue-50" },
          { href: "/vendas/nova", label: "Nova venda", icon: Tag, color: "text-emerald-600 bg-emerald-50" },
          { href: "/estoque", label: "Ver estoque", icon: Package, color: "text-orange-600 bg-orange-50" },
          { href: "/relatorios", label: "Relatórios", icon: BarChart2, color: "text-purple-600 bg-purple-50" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3.5 hover:shadow-sm hover:border-slate-300 transition-all"
          >
            <div className={`p-2 rounded-lg ${item.color.split(" ")[1]}`}>
              <item.icon size={16} className={item.color.split(" ")[0]} />
            </div>
            <span className="text-sm font-medium text-slate-700">{item.label}</span>
            <ArrowUpRight size={14} className="text-slate-400 ml-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
}
